# OOTD-re Tasks

## Sprint 0

- [x] S0: docs/ 초기화 + Next.js 14 프로젝트 스캐폴딩 (피차이)
- [ ] S1: 삭제 분석 + MVP 스코프 검토
- [x] S2: 아키텍처 ADR + TypeScript 타입 정의 (피차이) — S0 직후 시작
- [ ] S3: Supabase 설정 + DB 마이그레이션 (젠슨)
- [ ] S4: gpt-image-1 PoC + Vision 모델 비교 스크립트
- [ ] S5: NextAuth.js + Google + Kakao OAuth 통합 (젠슨)

## Sprint 1

- [ ] S6: 사진 업로드 API + Supabase Storage (젠슨)
- [ ] S7: 업로드 UI + 홈 레이아웃 + 공통 컴포넌트 (팀쿡)
- [ ] S8: AI 분석 API /api/ootd/analyze (젠슨)
- [ ] S9: 분석 결과 화면 + 아이템 편집 UI (저커버그)
- [ ] S10: 카드 생성 API /api/ootd/generate-card (젠슨)
- [ ] S11: Usage 카운터 + 한도 모달 (저커버그)
- [ ] S12: 카드 결과 화면 (저커버그)
- [ ] S13: OOTD 저장 API + share_id 생성 (젠슨)
- [ ] S14: 공유 페이지 /share/[id] SSR + OG 메타태그 (저커버그)
- [ ] S15: 공개/비공개 토글 + OOTD 편집/삭제
- [ ] S16: OOTD 캘린더 리스트 페이지
- [ ] S17: 모바일 반응형 + 에러 처리 + 토스트

## Review

### S0 (2026-05-28)

- Next.js 14 (App Router, TypeScript, Tailwind) 스캐폴딩 완료
- docs/ 구조: ARCHITECTURE.md, design-docs/index.md, exec-plans/active|completed, references/index.md
- .env.example 생성 (11개 키)
- .gitignore .env\* 포함 확인

### S2 (2026-05-28)

- src/types/index.ts + src/types/api.ts 생성 (도메인 + API 타입)
- src/lib/supabase.ts 생성 (client + admin)
- docs/ARCHITECTURE.md 완성
- docs/design-docs/ADR-001-tech-stack.md 생성
- @supabase/supabase-js, nanoid 설치

## 옷 분류 저장 개선 (2026-08-21)

### 요구사항 / 성공 기준

- [x] 옷 분류 입력을 서버에서 허용 카테고리·길이·개수 기준으로 검증하고 정규화한다.
- [x] 같은 저장 요청이 재시도되어도 OOTD가 중복 생성되지 않는다.
- [x] OOTD 레코드와 분류 아이템이 하나의 DB 트랜잭션으로 저장되어 부분 저장을 남기지 않는다.
- [x] 기존 분석 → 카드 → 저장 UX와 기존 조회 API의 응답 호환성을 유지한다.
- [x] 단위 테스트, 타입체크, 린트, 프로덕션 빌드로 변경을 검증한다.

### 접근 방식 검토

- **방안 A (채택)**: 현재 데이터 모델을 유지하면서 저장 경계에서 정규화·멱등 키·Supabase RPC 트랜잭션을 추가한다. 변경 범위가 작고 기존 화면과 호환된다.
- **방안 B**: 별도 `wardrobe_items` 카탈로그와 의류 컷아웃 파이프라인을 새로 만든다. 참고 저장소와 가장 유사하지만 제품 범위와 AI/스토리지 비용이 크게 늘어나 이번 개선 범위를 넘는다.

### 구현 계획

- [x] 1. 저장 요청 파서/정규화 모듈과 단위 테스트 추가 (의존성 없음, 난이도 중)
- [x] 2. 멱등·원자 저장용 DB 마이그레이션과 DB 헬퍼 추가 (1 의존, 난이도 중)
- [x] 3. 저장 API와 카드 화면에 안정적인 요청 ID 연결 (1~2 의존, 난이도 중)
- [x] 4. 실패 응답/호환성 점검 및 전체 검증 (1~3 의존, 난이도 중)

### 위험과 완화

- **기존 DB에 RPC 미적용**: 명확한 마이그레이션 파일과 오류 메시지를 제공하고 README 적용 순서를 갱신한다.
- **재시도 시 공개 설정 불일치**: 동일 요청 ID는 최초 저장 결과를 반환하고, 이후 공개 전환은 기존 PATCH 흐름으로 처리한다.
- **AI 출력 편차**: 허용 카테고리 외 값과 비정상 배열을 400으로 거절해 DB 제약 오류를 사전에 차단한다.

### Review

- 참고 Wardrobe의 정규화, 안정 ID, 승인 전 편집 패턴을 현재 OOTD 구조에 맞게 적용했다.
- AI 분석과 저장 API가 같은 분류 정규화 규칙을 사용하며, `order_idx`는 서버 배열 순서로 재계산한다.
- 분석 화면에서 오탐 아이템 삭제와 누락 아이템 추가(최대 8개)가 가능하다.
- `006_atomic_ootd_save.sql` RPC가 부모/자식 저장을 원자화하고 요청 ID+payload fingerprint로 재시도 중복과 키 오용을 차단한다.
- 사용자 소유 Supabase 이미지 경로만 저장하며, 64KB 요청 제한과 PostgREST 직접 쓰기 차단을 추가했다.
- 검증: 6 tests PASS, TypeScript PASS, ESLint 0 warnings, Next.js production build PASS.

## 원격 마이그레이션 및 사용 검증 (2026-08-21)

- [x] `.env.local`의 Supabase·OAuth·AI 필수 설정 존재 여부 확인
- [x] 원격 스키마 사전 조회: 001~005 적용, 006 미적용 확인
- [x] Supabase SQL Editor에서 `006_atomic_ootd_save.sql` 실행
- [x] 원격 컬럼·RPC·권한·원자·멱등 저장 검증
- [x] 로컬 앱 실행 및 공개 진입·업로드 화면·API 인증 경계 확인
- [x] 전체 테스트·타입체크·린트·빌드 최종 재검증

### Review

- 원격 프로젝트에 006만 적용했으며, 기존 비멱등 001~003은 재실행하지 않았다.
- 컬럼 2개, 유효한 유니크 인덱스, service_role 전용 RPC, anon/authenticated 직접 쓰기 차단을 원격에서 확인했다.
- 트랜잭션 내 동일 요청 2회 저장은 OOTD/아이템 각 1건, 다른 payload의 같은 요청 ID는 `idempotency_conflict`가 됨을 확인하고 전체 롤백했다.
- PostgREST에서 service_role RPC는 함수에 도달해 의도한 FK 오류(409/23503)를 반환했고, anon 직접 쓰기는 401, anon RPC는 404로 차단됐다.
- 로컬 개발 서버에서 랜딩·업로드 화면을 브라우저로 확인했으며 콘솔 오류가 없었다. 실제 사진 분석은 사용자가 로그인하고 사진을 선택해야 하는 수동 시나리오로 남긴다.
- 최종 검증: 6 tests PASS, TypeScript PASS, ESLint 0 warnings, Next.js production build PASS.

## 최신 변경 커밋·푸시 (2026-08-25)

- [x] 원격 `main` 최신 상태와 로컬 변경 범위 확인
- [x] 환경변수·비밀키·작업용 산출물이 커밋에 포함되지 않는지 확인
- [x] 테스트·타입체크·린트·프로덕션 빌드 재검증
- [x] `codex/wardrobe-save-improvements` 브랜치에 선택적으로 스테이징하고 커밋
- [x] `origin`에 푸시한 뒤 원격 커밋을 확인

### Review

- 원격 `main`과 로컬 기준 커밋은 동일했다.
- 23개 후보 파일의 비밀키 패턴 검사는 0건이었고, `.env.local`은 Git ignore 상태임을 확인했다.
- 검증: 6 tests PASS, TypeScript PASS, ESLint 0 warnings, Next.js production build PASS.
- 배포 브랜치: `codex/wardrobe-save-improvements`.

## 캘린더 API 401 수정 (2026-08-25)

### 재현 및 성공 기준

- [x] 배포 API의 인증 실패와 세션/JWT 데이터 흐름을 재현·추적한다.
- [x] `dbId`가 없는 기존 JWT를 이메일만으로 재연결하지 않고 재로그인 대상으로 처리한다.
- [x] Supabase 사용자 조회·생성·갱신 오류를 로그인 성공으로 삼키지 않는다.
- [x] 캘린더 API 인증 경계와 전체 빌드를 검증한다.

### 구현 계획

- [x] 1. `dbId`가 없는 JWT 복구 회귀 테스트를 먼저 실패시킨다.
- [x] 2. 인증 토큰 동기화 로직을 분리하고 NextAuth JWT 콜백에 연결한다.
- [x] 3. 단위 테스트·타입체크·린트·빌드 및 인증 경계를 확인한다.
- [x] 4. 수정 내용을 커밋하고 `main`에 fast-forward 병합·푸시한다.

### Root cause

- 미들웨어는 JWT 존재만 검사하지만 API는 `session.user.id`를 요구한다.
- JWT 콜백은 최초 로그인(`user` 존재) 때만 Supabase `users.id`를 채우며, 조회·삽입 오류도 검사하지 않는다.
- Supabase 대시보드에서 프로젝트 `OTNADRI`가 paused 상태임을 확인했으며, 프로젝트 호스트는 공용 DNS에서도 `NXDOMAIN`이었다.
- 프로젝트 중단 중 로그인한 세션은 Supabase 사용자 조회에 실패했지만 기존 코드가 오류를 삼켜 `dbId` 없는 JWT를 발급했고, 페이지 접근에는 성공하면서 모든 `/api/ootd/*` 요청에서 401을 반복했다.

### 현재 검증

- 회귀 테스트는 수정 전 실패하고 수정 후 통과했다.
- 단위 테스트 11개, TypeScript, ESLint 0 warnings, Next.js production build가 통과했다.
- 검증된 Google 이메일만 계정 연결에 사용하고, `dbId` 없는 JWT는 보호 경로에서 미인증 처리한다.
- 실제 JWT→캘린더 API E2E는 paused 프로젝트 재개 확인 후 수행한다.
- 장기 보안 과제: 이메일 대신 `(provider, providerAccountId/sub)` 고유 키로 계정을 연결하는 별도 마이그레이션이 필요하다.
- 배포 대상: `main` 브랜치.

## 스포츠 사진 분석 400 수정 (2026-08-25)

### 재현 및 성공 기준

- [x] 배포 API에서 최신 업로드 이미지로 `400/not_fashion`을 재현한다.
- [x] 최신 이미지를 확인해 사람과 착용 의류가 식별 가능함을 확인한다.
- [x] 스포츠·일상·행동 사진도 착용 의류가 보이면 분석 대상으로 처리한다.
- [x] 실제 문제 이미지로 분석 성공을 재검증한다.

### 구현 계획

- [x] 1. 스포츠 사진 허용 프롬프트 회귀 테스트를 RED로 확인한다.
- [x] 2. `not_fashion` 조건을 사람/착용 의류 식별 불가로만 제한한다.
- [x] 3. 단위·타입·린트·빌드와 실제 이미지 분석을 검증한다.
- [x] 4. 수정사항을 커밋하고 `main`에 푸시한다.
- [x] 5. 이미지 속 텍스트·QR 명령을 따르지 않는 시스템 경계를 추가한다.

### Root cause

- 기존 프롬프트는 사람이 없을 때뿐 아니라 사진의 촬영 목적이 “패션 사진”이 아닐 때도 `not_fashion`을 반환하도록 지시했다.
- 최신 업로드는 사람이 전신으로 보이고 상의·하의·신발이 명확하지만 골프 스윙 장면이어서 스포츠 사진으로 오판·거절됐다.

### Review

- 프롬프트 회귀 테스트는 수정 전 실패하고 수정 후 통과했다.
- 동일 골프 이미지로 로컬 분석 API를 재실행해 `200`, 아이템 4개, 스타일 요약 반환을 확인했다.
- 디버깅에 사용한 로컬 임시 이미지 복사본은 확인 후 삭제했다.
- 검증: 13 tests PASS, TypeScript PASS, ESLint 0 warnings, Next.js production build PASS.
- 보안 리뷰: 이번 변경의 머지 차단 CRITICAL/WARNING 없음.
- 후속 보안 과제: 분석 API 사용자별 rate/quota/timeout과 strict JSON schema를 도입한다.

## 아이템별 이미지 추출 및 저장 (2026-08-25)

### 성공 기준

- [x] 분석된 각 의류 아이템에 원본과 분리된 개별 이미지가 표시된다.
- [x] 개별 이미지는 사용자 소유 Storage 경로에 저장되고 OOTD 아이템과 함께 원자적으로 기록된다.
- [x] 잘못된 감지 영역이나 일부 이미지 생성 실패가 전체 분석 결과를 조용히 손상시키지 않는다.
- [x] 실제 업로드→분석→저장→상세 조회에서 아이템 이미지가 유지된다.

### 계획

- [x] 1. 현재 분석·Storage·DB·UI 데이터 흐름과 Wardrobe의 crop/cutout 구현 차이를 확정한다.
- [x] 2. 좌표·이미지 URL·소유권·실패 처리 계약과 DB 마이그레이션을 설계한다.
- [x] 3. 이미지 영역 정규화와 crop 생성 회귀 테스트를 RED로 확인한다.
- [x] 4. 서버 추출·Storage 저장과 분석 API 응답을 구현한다.
- [x] 5. 분석 편집 UI, 저장 API/RPC, 상세 조회에 아이템 이미지를 연결한다.
- [x] 6. 마이그레이션 적용 후 단위·통합·실제 플로우를 검증한다.
- [x] 7. 보안 리뷰 후 `main`에 커밋·푸시하고 운영에서 확인한다.

### Review

- Root cause: AI 응답에 아이템 위치 좌표가 없고, 분석 API에 crop/cutout 생성 단계가 없으며, `ootd_items`에도 이미지 컬럼이 없어 텍스트 분류만 전달·저장됐다.
- 설계: 분석 API는 0~1000 정규화 bbox로 crop을 즉시 만들고, 아이템별 cutout API가 OpenAI Images Edit와 chroma 제거를 수행한다. UI는 crop을 먼저 표시하고 실패 항목만 재시도한다.
- 저장/공개 범위: `items`는 private bucket이며 DB에는 object path만 저장한다. 소유자 상세에는 crop+cutout, 공개 공유에는 cutout만 15분 서명 URL로 발급한다.
- 경쟁/비용 제어: 분석은 009의 월 쿼터+사용자별 lease, 아이템 생성은 008의 enqueue→claim→fencing token+월 쿼터를 사용한다. 결과는 claim별 immutable path에 저장하며 완료된 job의 정확한 path pair만 원자 저장 RPC가 허용한다.
- 입력 방어: 요청 본문 상한, 이미지 streaming 크기·MIME magic·40MP 상한, fetch/OpenAI timeout, 이미지 속 텍스트·QR 프롬프트 경계를 적용했다.
- Supabase 적용 확인: 007→008→009 적용 성공, `items.public=false`, jobs/path/usage 컬럼 조회, claim→busy→fenced release smoke 통과.
- 실제 E2E: 동일 업로드에서 analyze 200/4 private crops, cutout 201, 완료 재요청 200, save 201, owner detail 200에서 서명된 crop+cutout 유지.
- 테스트 정리: E2E가 만든 OOTD/job/Storage 객체와 사용량 증가를 원복했고 jobs 0, item bucket root 0을 확인했다.
- 최종 검증: 25 tests PASS, TypeScript PASS, ESLint 0 warnings, Next.js 16.3.2 production build PASS, npm audit 0 vulnerabilities.

## 아이템 이미지 비동기화·정확도 개선 (2026-08-25)

### 재현 및 성공 기준

- [x] 카드 생성/저장은 개별 cutout 생성 완료를 기다리지 않는다.
- [x] 저장된 OOTD는 백그라운드 작업 완료 후 아이템 이미지를 자동으로 조회한다.
- [x] 원본에 없는 아이템이나 카테고리가 다른 생성 결과는 최종 이미지로 채택하지 않는다.
- [x] 실패하거나 신뢰도가 낮은 생성 결과는 원본 crop을 안전한 fallback으로 유지한다.

### 계획

- [x] 1. 실제 오인식 데이터와 현재 UI 대기 조건의 근본 원인을 확정한다.
- [x] 2. 비동기 저장 상태와 품질 필터 회귀 테스트를 RED로 확인한다.
- [x] 3. 저장 후 비동기 추출 트리거와 상태 조회를 구현한다.
- [x] 4. 감지·생성 품질 가드와 crop fallback을 구현한다.
- [x] 5. 마이그레이션·단위·DB smoke·보안 리뷰를 통과한다.
- [x] 6. `main`에 푸시하고 운영 배포를 검증한다.

### Root cause / Review

- 실제 오류 crop을 확인한 결과 `hat`은 빈 벽, `shoes`는 바닥과 매트를 가리켰다. bbox 형식은 유효했지만 목표 아이템이 없었고, 단정형 이미지 프롬프트가 cap과 shorts를 새로 창작했다.
- 분석 화면의 브라우저 worker가 네 개 이미지를 두 개씩 생성하고 전부 끝날 때까지 카드 진행을 차단해 약 90초가 사용자 대기에 붙었다.
- 분석 단계는 private crop과 queued job까지만 만들고, 저장 RPC가 pending job을 OOTD에 원자 연결한 뒤 Vercel Queue가 생성 작업을 처리하도록 분리했다. 로컬 개발에서는 Next `after()`로 동일한 비차단 흐름을 제공한다.
- worker는 이미지 edit 전에 crop grounding을 검사하고, 생성 후 원본 전체 사진과 결과의 동일성·카테고리를 다시 검사한다. 불일치하면 cutout을 저장하지 않고 소유자에게 private crop만 표시한다.
- Vision 파생 자유 문자열은 downstream AI 프롬프트에서 제거했고, VR·AR 헤드셋·헤드폰·스포츠 보호 장비를 hat/accessory로 분류하지 않도록 감지 규칙을 강화했다.
- 010 migration은 pending 저장과 complete fanout을 지원하며, save/complete 경합은 정렬된 job row lock으로 직렬화한다. 원격 적용 후 source 제약·함수 권한·private bucket 9개 항목과 rollback smoke를 통과했다.
- 검증: 32 tests PASS, TypeScript PASS, ESLint 0 warnings, Next.js production build PASS, security review merge blocker 0.
- 배포: `main`의 `848cfb5`를 Vercel production에 반영했고 배포 status success, 운영 홈 HTTP 200, 인증 보호 API 비로그인 401을 확인했다.

## AI 카드·스타일 탭 통합 (2026-08-25)

### 성공 기준

- [x] 카드 화면에는 `기본`과 하나의 `AI 카드` 선택지만 보인다.
- [x] 기존 `style` 요청은 동일한 AI 카드로 호환 처리된다.
- [x] 알 수 없는 카드 타입은 생성·사용량 차감 전에 거절된다.

### 계획

- [x] 1. 두 탭의 실제 생성 경로와 차이를 확인한다.
- [x] 2. 카드 타입 정규화와 UI 중복 방지 테스트를 RED로 확인한다.
- [x] 3. UI·API·공유 타입을 단일 AI 카드로 통합한다.
- [x] 4. 원본 소유권·요청 상한과 원자적 생성 사용량 예약을 적용한다.
- [x] 5. 011 원격 마이그레이션과 롤백 smoke를 통과한다.
- [x] 6. 전체 테스트·타입·린트·빌드와 보안 재검토를 통과한다.
- [x] 7. `main`에 푸시하고 운영 배포를 검증한다.

### Review

- 조사 결과 `ai`와 `style`은 동일한 API와 `generateCard()`를 사용하며 생성 결과 차이가 없었다.
- UI 옵션은 `기본`과 `AI 카드`로 축소하고 2열로 정리했다. legacy `style`은 API 경계에서 `ai`로 변환한다.
- 기존에는 임의 `card_type`이 생성 경로에 진입하면서 사용량 차감을 피할 수 있었으나, 이제 `invalid_card_type` 400으로 거절한다.
- AI 카드 요청은 64KB streaming 상한과 canonical 분류·문자열 검증을 거치며, 사용자 소유 원본만 예약 성공 뒤에 제한적으로 다운로드·디코딩한다.
- 011 RPC는 월 사용량을 모델 호출 전에 원자 예약하고 request ID·fingerprint·claim token으로 중복 생성, 응답 유실, lease 재선점을 안전하게 처리한다. 확정 실패는 즉시 환불하고 만료 예약은 cleanup cron이 회수한다.
- Supabase에서 테이블/RPC/권한을 확인했고, 예약→busy→재선점→stale token 거절→환불→완료 캐시→만료 회수 smoke를 전체 롤백으로 통과했다.
- 보안 재검토 결과 merge-blocking CRITICAL/WARNING 0건이다.
- RED: 신규 모듈 부재 테스트 실패를 확인했다. GREEN: 43 tests PASS, TypeScript PASS, ESLint 0 warnings, Next.js production build PASS.
- 배포: `main`의 `6cf5b62`를 Vercel production에 반영했다. 누락된 `CRON_SECRET`을 Production 환경에 설정해 재배포했고, deployment Ready, 운영 홈 200, 카드 API 비로그인 401, cleanup cron 무인증 401을 확인했다.

## 공유 카드 flip·아이템 상세 (2026-08-25)

### 성공 기준

- [x] 공유 카드의 앞·뒷면을 클릭·키보드로 전환할 수 있다.
- [x] 뒷면에서 모든 착장 아이템의 이름과 카테고리를 확인할 수 있다.
- [x] 아이템 이름을 누르면 공개용 이미지와 상세 정보가 모달로 표시된다.
- [x] 공유 페이지의 SSR/OG와 private crop 비공개 정책을 유지한다.

### 계획

- [x] 1. 현재 공유 데이터와 재사용 가능한 dialog/UI 패턴을 조사한다.
- [x] 2. Server Page + Client flip island 구조와 표시명 fallback을 문서화한다.
- [x] 3. 아이템 표시명·상세정보 presenter 테스트를 RED로 확인한다.
- [x] 4. 3D flip 카드와 아이템 상세 모달을 구현한다.
- [x] 5. 접근성·반응형·보안과 전체 빌드를 검증한다.
- [x] 6. `main`에 푸시하고 운영 공유 페이지에서 확인한다.

### Review

- 공유 페이지의 SSR/OG를 유지하고 flip·선택 상태만 `ShareFlipCard` Client Component로 격리했다.
- 앞면 전체와 외부 토글로 카드를 뒤집고, 뒷면 이름 버튼에서 native dialog 상세 모달을 연다. 제품명·설명·색상 카테고리 순으로 이름 fallback을 적용했다.
- 공개 클라이언트 DTO에는 내부 Storage path, bbox, extraction 상태가 없고 cutout `image_url`만 포함한다. 공개 cutout이 없으면 private crop 대신 안내 placeholder를 표시한다.
- 숨은 face는 `inert` 처리하고 flip 뒤 보이는 면으로 포커스를 이동한다. reduced-motion 사용자는 전환 애니메이션 없이 이용할 수 있다.
- RED: `share-item` 모듈 부재로 테스트 컴파일 실패를 확인했다. GREEN: 46 tests PASS, TypeScript PASS, ESLint 0 warnings, Next.js production build PASS.
- 로컬 공개 레코드로 앞↔뒤 전환, 4개 아이템 이름, 모달 열기·닫기, 빈 이미지 placeholder, 포커스 이동, 내부 경로 비노출을 확인했다.
- 배포: `main`의 `57bdfae`를 Vercel production에 반영했다. 운영 공유 레코드에서 앞↔뒤 전환, 4개 아이템 이름, 상세 dialog, 이미지 placeholder를 확인했고 브라우저 오류와 내부 path/bbox 노출은 없었다.

## 개별 이미지 백그라운드 생성 장애 (2026-08-25)

### 성공 기준

- [x] 저장된 OOTD의 queued 개별 이미지 작업이 백그라운드 consumer에서 실행된다.
- [ ] 성공한 작업의 `ootd_items.image_path`가 자동으로 반영되고 화면에서 이미지가 보인다.
- [x] 실패한 작업은 원인 코드와 재시도 가능한 상태를 남긴다.

### 계획

- [x] 1. 운영 DB의 extraction job·OOTD 연결 상태와 오류를 확인한다.
- [x] 2. 분석→저장→Queue→consumer→완료 RPC 흐름과 배포 설정을 추적한다.
- [x] 3. 단일 원인 가설을 최소 재현으로 검증한다.
- [x] 4. 실패 테스트를 추가하고 근본 원인을 수정한다.
- [ ] 5. 전체 검증 후 `main` 배포와 운영 이미지 생성을 확인한다.

### Review

- Production Queue는 저장 성공 약 0.5초 뒤 linked 작업을 전부 consumer로 전달했고, 최근 13개 작업도 모두 attempts=1이었다. 문제는 Queue 유실이 아니라 품질 검증의 terminal 실패였다.
- 두 이미지를 받는 검증 응답의 `contains_person`이 원본 착용자와 생성 cutout 중 대상을 구분하지 못해, 실제로 원본과 일치한다는 reason을 낸 10개 결과도 `quality_mismatch`로 폐기했다.
- 검증 필드를 `cutout_contains_person`·`cutout_contains_multiple_items`로 변경하고 프롬프트에서 두 필드는 두 번째 생성 이미지만 뜻하도록 고정했다. 새 실패는 `quality_mismatch_v2`로 분리했다.
- 012 RPC는 v2 실패를 terminal로 처리해 at-least-once 중복 delivery가 비용을 재발생시키지 않으며, 기존 v1 false-negative만 linked·attempts<3 범위에서 재처리한다. 원격 migration과 전체 ROLLBACK smoke를 통과했다.
- 공유 페이지는 pending 결과를 5/10/20/30/30초 간격으로 갱신하고 숨김 탭에서는 중지한다. raw job 상태와 private crop은 공개 DTO에 포함하지 않는다.
- RED: 새 scoped validator 필드, legacy retry selector, polling presenter가 없는 실패를 각각 확인했다. GREEN: 50 tests PASS, TypeScript PASS, ESLint 0 warnings, Next.js production build PASS.
