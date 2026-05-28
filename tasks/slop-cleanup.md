# AI 슬롭 정리 결과

## 스캔 범위

`src/` 전체 `.ts` `.tsx` 파일

## 정리 항목

### 1. src/app/page.tsx — TODO 주석 + 하드코딩 데드코드 제거 [수정]

**제거**: `// TODO: 로그인 상태는 NextAuth.js 연동 후 서버 컴포넌트에서 getServerSession으로 확인`
**제거**: `const isLoggedIn = false;` (하드코딩 — isLoggedIn && (...) 블록이 데드코드)
**제거**: `{/* 실제 데이터는 API 연동 후 교체 */}` + placeholder 더미 그리드
**교체**: `async` 서버 컴포넌트로 전환, `getAuthSession()`으로 실제 로그인 상태 반영
**교체**: 데드 최근 OOTD 섹션 → 캘린더 링크 버튼으로 대체 (MVP 스코프)

### 2. src/app/(flow)/card/page.tsx:24 — 자명한 주석 제거 [수정]

**제거**: `// 카드 URL 없으면 업로드로 리다이렉트` — 바로 아래 코드가 이미 명확

### 3. src/lib/ai/card-gen.ts:148 — catch 주석 영문 표준화 [수정]

**변경**: `// Plan A 실패 시 Plan B로 fallback` → `// intentional: fall through to Plan B`
— 빈 catch 블록의 의도를 명확히 하는 주석은 유지가 맞음. 내용만 표준 패턴으로 변경.

---

## 유지 판정 (삭제 안 한 것들)

| 파일                               | 주석                                | 유지 이유                                                 |
| ---------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| src/lib/auth.ts:42                 | Kakao 미심사 계정 email=null 설명   | 외부 플랫폼 제약 — WHY가 비자명                           |
| src/lib/auth.ts:72-73              | 멀티 Provider id 충돌 방지 설명     | 숨은 불변조건 — 없으면 미래 개발자가 upsert로 되돌릴 위험 |
| src/lib/auth.ts:81,88              | 기존 row/신규 row 분기 의도         | 두 경로의 차이가 명확하지 않아 유지                       |
| src/lib/db/usage.ts:42             | upsert fallback increment 이유      | Supabase 특이동작 설명 — WHY 비자명                       |
| src/lib/storage.ts:4               | `10 * 1024 * 1024 // 10MB`          | 매직 넘버 단위 명시 — 표준 관행                           |
| src/app/(flow)/analyze/page.tsx:56 | addToast useEffect 의존성 제외 이유 | eslint-disable 없이 의존성 경고 억제 — WHY 필수           |
| middleware.ts                      | /api/auth 제외 의도 주석            | 추후 실수 방지용 — 유지                                   |

---

## console 현황

`src/app/global-error.tsx:13` — `console.error(error)` 유지. 전역 에러 바운더리에서 에러 로깅은 정당한 사용.
그 외 `console.log` 없음 확인.

## 빈 catch 블록

`src/lib/ai/card-gen.ts` — 유일한 빈 catch. Plan A → Plan B fallback 의도적 패턴. 주석 표준화로 대응.

## 미사용 import

tsc --noEmit 오류 없음 — 미사용 import 없음 확인.

---

## 검증

`tsc --noEmit`: 오류 없음 (수정 후)
