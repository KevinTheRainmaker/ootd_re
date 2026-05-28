# DB 리뷰 — supabase/migrations/

검토 대상: `001_initial.sql`, `002_rls.sql`
기준: SPEC.md 데이터 모델 + FEATURES.md + 삭제 분석(deletion-analysis.md)

---

## 체크리스트 결과

| 항목                                                               | 결과 | 비고                                                                   |
| ------------------------------------------------------------------ | ---- | ---------------------------------------------------------------------- |
| 4개 테이블 모두 존재 (users, ootd_records, ootd_items, usage_logs) | PASS |                                                                        |
| share_id UNIQUE 인덱스                                             | PASS | `text unique` 컬럼 제약 + `where share_id is not null` 부분 인덱스     |
| RLS: 본인 데이터 SELECT                                            | PASS | 모든 테이블 owner select 정책 있음                                     |
| RLS: 공개 레코드 비로그인 SELECT                                   | PASS | ootd_records + ootd_items public select 정책 있음                      |
| CASCADE DELETE 설정                                                | PASS | ootd_records → users, ootd_items → ootd_records 모두 ON DELETE CASCADE |
| usage_logs 복합 UNIQUE (user_id, year_month)                       | PASS |                                                                        |
| updated_at 자동 갱신 트리거                                        | PASS | users, ootd_records, usage_logs 3개 테이블                             |

---

## 이슈 목록

### [WARN] ootd_items에 MVP 불필요 컬럼 포함

**컬럼**: `purchase_url`, `price`, `size`, `is_ad`

삭제 분석(deletion-analysis.md)에서 MVP 제외 확정된 컬럼들이 그대로 포함되어 있음.

- `is_ad`: F17(협찬 라벨) 제외에 따라 불필요. Phase 2 도입 시 법무 검토 필요.
- `purchase_url`, `price`, `size`: F19(쇼핑몰 연동) 제외에 따라 불필요.

**권고**: 003_cleanup.sql로 제거하거나, 001_initial.sql에서 해당 컬럼 삭제 후 재마이그레이션. 컬럼이 있어도 기능 동작에는 지장 없으나, API 응답 타입과 불일치 발생 가능.

---

### [WARN] ootd_items category CHECK 범위가 SPEC과 불일치

**SPEC.md** 명세:

```
category CHECK IN ('top','bottom','outer','shoes','bag','accessory')
```

**001_initial.sql 실제 구현**:

```sql
category in ('top', 'bottom', 'outer', 'shoes', 'bag', 'accessory', 'hat', 'glasses', 'watch', 'other')
```

`hat`, `glasses`, `watch`, `other` 4개가 추가되어 있음. AI Vision API가 이 카테고리를 반환할 경우 저장 가능하므로 기능상 문제는 없음. 단, SPEC과 코드가 불일치하면 타입 정의(`src/types/index.ts`)와의 정합성 확인 필요.

**권고**: SPEC.md 업데이트 또는 src/types/index.ts의 Category 타입을 SQL과 동기화. 어느 쪽이든 한쪽을 기준으로 통일 필요.

---

### [INFO] usage_logs INSERT 정책이 anon 클라이언트에서 직접 호출 가능

현재 `usage_logs: owner insert` 정책은 `auth.uid() = user_id`를 check함. API Routes에서 service_role(supabaseAdmin)로만 usage_logs를 조작하는 설계라면 이 INSERT 정책은 실질적으로 사용되지 않음.

**권고**: 의도한 설계(service_role 전용)라면 INSERT 정책을 제거하고 주석으로 명시하는 것이 더 명확. 현재 상태로도 동작은 하지만, 클라이언트가 직접 카운터를 0으로 insert할 수 있는 허점이 있음. service_role이 upsert하므로 실질 위험은 낮음.

---

### [INFO] ootd_records의 share_id — 공개 전환 시 생성 타이밍

share_id는 `text unique` nullable 컬럼. 현재 스키마는 공개 시점에 애플리케이션이 nanoid를 생성해서 INSERT/UPDATE하는 방식. DB 레벨에서 강제하지 않음.

**확인 필요**: `is_public = true`인데 `share_id IS NULL`인 레코드가 생길 수 있음. 애플리케이션 레이어에서 반드시 함께 처리해야 함.

**권고**: DB 레벨 CHECK `(is_public = false OR share_id IS NOT NULL)` 추가 검토. 또는 애플리케이션에서 트랜잭션으로 보장.

---

## 종합 평가

**전체 상태: PASS (경고 2건, 정보 2건)**

- 구조적으로 건전함. 인덱스, CASCADE, RLS 핵심 정책 모두 정상.
- MVP 출시 블로킹 이슈 없음.
- WARN 2건은 타입 정합성 관련이며 기능 동작에 즉각적 영향 없음.

**우선 조치 권고 (젠슨에게 전달)**:

1. ootd_items 불필요 컬럼(purchase_url, price, size, is_ad) 제거 여부 결정 → src/types/index.ts와 동기화
2. Category 타입 기준을 SQL 기준(10개)으로 통일하고 SPEC.md 업데이트
