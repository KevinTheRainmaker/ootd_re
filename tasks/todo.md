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
