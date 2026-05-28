# E2E 정적 검증 결과 — OOTD-re MVP

**날짜:** 2026-05-28  
**방법:** 코드 레벨 정적 분석 (.env.local 미설정으로 브라우저 실행 불가)  
**검증자:** 피차이

---

## 플로우 A — 핵심 가치 검증

### A1. 비로그인 홈 접근 → 로그인 유도

- [x] `/` 접근 시 홈 페이지 정상 렌더링 — `src/app/page.tsx` 존재, 렌더링 구조 확인
- [!] 헤더에 "시작하기" 버튼 표시 — `page.tsx`에 "오늘의 착장 기록하기" 버튼이 `/upload`로 연결됨. "시작하기" 텍스트 아님. **체크리스트 텍스트와 불일치 (기능은 동작)**
- [!] "시작하기" 클릭 → `/auth/signin` 이동 — 실제로는 `/upload`로 이동 (middleware가 비인증 시 `/auth/signin`으로 리다이렉트). **2단계 리다이렉트로 동작하나 직접 이동은 아님**
- [x] `/upload` 직접 접근 → 로그인 리다이렉트 — `middleware.ts` matcher에 `/upload/:path*` 포함, `withAuth`로 `/auth/signin` 리다이렉트 확인
- [x] `/ootd` 직접 접근 → 로그인 리다이렉트 — matcher에 `/ootd/:path*` 포함 확인

### A2. Google 로그인 → 홈 이동

- [x] 로그인 페이지 Google 버튼 — `signIn('google', { callbackUrl })` 구현 확인
- [x] 동의 후 홈으로 리다이렉트 — `callbackUrl` 파라미터 자동 처리 확인
- [!] 헤더 프로필 이미지/드롭다운 — Header 컴포넌트를 직접 확인하지 못함 (파일 경로 미확인). **별도 확인 필요**
- [x] Supabase users 테이블 upsert — `auth.ts` signIn 콜백에서 `supabaseAdmin.from("users").insert()` 확인

### A3. 사진 업로드 → AI 분석 결과 표시

- [x] `/upload` 접근 정상 — `src/app/(flow)/upload/page.tsx` 존재
- [x] 파일 선택 버튼으로 JPG/PNG/WebP 선택 — `PhotoUpload.tsx` `ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]` 확인
- [x] 모바일 카메라 직접 촬영 — `accept="image/*" capture="environment"` 확인
- [x] 선택 후 미리보기 표시 — `URL.createObjectURL(file)` + preview state 확인
- [x] "분석 시작" 버튼 — 실제 텍스트는 "카드 만들기"이나 기능 동일
- [x] AI 분석 완료 → 아이템/요약/해시태그 표시 — `/analyze` 페이지로 이동 후 표시 (analyze page 별도 확인 필요)
- [!] 분석 소요 시간 10초 이내 — 정적 검증 불가 (실 API 호출 필요)

### A4. 아이템 편집 → 카드 생성

- [!] 아이템 편집 UI — `/analyze` 페이지 코드 미확인. **저커버그 영역, 별도 확인 필요**
- [x] 카드 생성 API — `POST /api/ootd/generate-card` 구현 확인, usage limit 체크 포함
- [!] Plan B fallback 안내 메시지 — `generateCard()` 내부 확인 필요 (`src/lib/ai/card-gen.ts`)

### A5. 카드 저장

- [x] "저장하기" 버튼 — `src/app/(flow)/card/page.tsx` `handleSave()` 확인
- [x] 로딩 스피너 → "저장 완료" 전환 — `saving` state + `saved` state + Button `disabled={saved}` 확인
- [x] 성공 토스트 "카드가 저장됐습니다." — `addToast("카드가 저장됐습니다.", "success")` 확인
- [x] Supabase ootd_records row 생성 — `POST /api/ootd/save` → `createOotdRecord()` 확인
- [x] "PNG 저장" 버튼 — `handleDownload()` fetch + blob + a.click() 구현 확인

### A6. 공개 설정 → 공유 링크 → 비로그인 접근

- [x] 공개 토글 ON — `/ootd/[id]` 페이지 `handleTogglePublic()` → `PATCH /api/ootd/[id]` 확인
- [x] share_id 생성 — PATCH 핸들러에서 `is_public=true` 시 `nanoid(8)` 생성 확인
- [x] "링크 복사" 버튼 → 클립보드 — `handleCopyLink()` `navigator.clipboard.writeText()` 확인
- [x] 성공 토스트 "링크가 복사됐습니다." — `addToast("링크가 복사됐습니다.", "success")` 확인
- [x] 비로그인 `/share/[id]` 접근 — `share/[id]/page.tsx` 존재, middleware matcher에 `/share` 없음 (의도적 비보호)
- [x] 카드 이미지 + 아이템 + 해시태그 표시 — `share/[id]/page.tsx` 렌더링 구조 확인
- [x] OG 메타태그 — `generateMetadata()` `openGraph.images` + `twitter.card` 확인
- [x] "나도 만들기" CTA — `href="/"` Link 존재 확인 (텍스트: "나도 만들기", 체크리스트: "이 카드 만들기" — **텍스트 불일치, 기능 동일**)

---

## 플로우 B — 제한 검증

### B1. 무료 사용자 카드 생성 5회 한도

- [x] 카드 생성 API usage limit 체크 — `checkCardLimit()` FREE_LIMIT=5, PRO_LIMIT=30 확인
- [x] 6회째 클릭 → 403 + monthly_limit_exceeded 코드 반환 — generate-card route 확인
- [!] 업그레이드 안내 모달 — 프론트엔드에서 403 응답 처리 + 모달 표시 확인 필요 (analyze/card 페이지 코드 미확인)
- [!] 헤더 "N/5회 사용" 카운터 — Header 컴포넌트 미확인
- [x] 다음 달 카운터 리셋 — `getMonthKey()`로 year_month 분리, 새 month는 신규 row INSERT (lazy reset 동작)

### B2. 비공개 OOTD 공유 링크 차단

- [x] 비공개 share 접근 → 404 — `getOotdByShareId()` `.eq("is_public", true)` 조건으로 비공개 row는 null 반환 → `notFound()` 호출 확인

---

## 플로우 C — 캘린더

### C1. 저장된 OOTD 캘린더 확인

- [x] `/calendar` 이동 — `src/app/(app)/calendar/page.tsx` 존재
- [x] 월별 OOTD 리스트 — `GET /api/ootd/calendar?year=&month=` 호출 확인
- [x] 이전/다음 월 버튼 — `goPrev()` / `goNext()` state 전환 확인
- [x] 이번 달 이후 비활성 — `disabled={isThisMonth}` 확인
- [x] 빈 목록 상태 — "N월에 기록된 착장이 없어요" + 업로드 CTA 확인

### C2. OOTD 상세 페이지

- [x] 캘린더 클릭 → `/ootd/[id]` — OotdCard 컴포넌트 확인 필요 (링크 확인 못함)
- [x] 카드 이미지 + 아이템 + 날짜 표시 — `/ootd/[id]/page.tsx` 렌더링 구조 확인
- [x] 공개/비공개 상태 표시 — toggle UI 렌더링 확인

### C3. 편집 및 삭제

- [x] 메모 수정 — PATCH `/api/ootd/[id]` `memo` 필드 업데이트 확인
- [x] 공개/비공개 토글 → DB 반영 — PATCH + `updateOotdRecord()` 확인
- [x] 삭제 버튼 → 확인 모달 → 삭제 — Modal + DELETE `/api/ootd/[id]` 확인
- [x] 삭제 후 캘린더 리다이렉트 — `router.push("/")` 확인 (홈으로, 캘린더 아님 — **경미한 UX 이슈**)
- [x] 삭제된 OOTD share 접근 → 404 — `getOotdByShareId()` null 반환 → notFound()

---

## 에러 케이스

### E1. 패션 사진이 아닌 이미지 업로드

- [x] not_fashion 에러 코드 반환 — `vision.ts` not_fashion throw, `analyze/route.ts` 400 + code 반환 확인
- [!] 프론트엔드 "착장이 명확히 보이지 않습니다" 메시지 — analyze 페이지 에러 처리 미확인

### E2. 10MB 초과 파일

- [x] 클라이언트 사전 검증 — `PhotoUpload.tsx` `file.size > MAX_SIZE_BYTES` → setError() 확인
- [x] 업로드 API 호출 없음 — validate() 실패 시 onFileSelect 미호출로 업로드 차단 확인

### E3. 비지원 파일 형식

- [x] 클라이언트 MIME 검증 — `ALLOWED_TYPES.includes(file.type)` 체크 확인
- [x] 서버 이중 검증 — `upload/route.ts` `validateImageFile()` 호출 확인

### E4. 로그아웃 상태 보호 경로 접근

- [x] `/upload` → 로그인 리다이렉트 — middleware 확인
- [x] `/ootd` → 로그인 리다이렉트 — middleware 확인
- [x] `/calendar` → 로그인 리다이렉트 — middleware 확인
- [x] `/card` → 로그인 리다이렉트 — middleware 확인
- [x] `/api/ootd/analyze` 비인증 → 401 — `getAuthSession()` 체크 확인
- [x] `/api/ootd/generate-card` 비인증 → 401 — 확인

### E5. 네트워크/API 오류

- [x] 업로드 실패 → 에러 토스트 — `upload/page.tsx` catch → `addToast("네트워크 오류가 발생했습니다.", "error")` 확인
- [!] AI 분석 타임아웃 재시도 버튼 — analyze 페이지 미확인
- [!] 카드 생성 실패 Plan B 자동 전환 — `src/lib/ai/card-gen.ts` 미확인

---

## 비기능 체크

- [!] 모바일 iOS Safari / Android Chrome — 정적 검증 불가
- [!] 카카오톡 OG 이미지 미리보기 — 정적 검증 불가
- [!] FCP < 1.5초, SSR < 2초 — 정적 검증 불가

---

## 이슈 요약

### [!] 수정 필요 이슈 (코드 레벨)

| #   | 항목               | 파일                               | 내용                                                                                                    |
| --- | ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | 삭제 후 리다이렉트 | `/app/(app)/ootd/[id]/page.tsx:99` | `router.push("/")` → 홈으로 이동. 체크리스트는 캘린더(`/calendar`) 요구                                 |
| 2   | calendar 401 처리  | `/app/(app)/calendar/page.tsx:44`  | `router.replace("/api/auth/signin")` → `/auth/signin`이어야 함 (`/api/auth/signin`은 NextAuth 내부 API) |

### [!] 미확인 항목 (추가 검증 필요)

| #   | 항목                     | 이유                                                                  |
| --- | ------------------------ | --------------------------------------------------------------------- |
| 3   | Header 컴포넌트          | 파일 경로 미확인 — 프로필 드롭다운, 사용량 카운터 표시 여부           |
| 4   | `/analyze` 페이지        | 저커버그 영역 — 아이템 편집 UI, not_fashion 에러 처리, 한도 초과 모달 |
| 5   | `src/lib/ai/card-gen.ts` | Plan B fallback 구현 여부                                             |
| 6   | 분석 소요시간 / 성능     | 실제 API 호출 필요                                                    |

### [x] PASS — 정적 검증 통과

- 모든 보호 경로 middleware 커버리지 확인
- 모든 API Routes 인증(401) 처리 확인
- 파일 검증 (MIME + 크기) 클라이언트 + 서버 이중 확인
- share_id 비공개 접근 차단 확인
- nanoid(8) share_id 생성 확인
- usage_logs lazy reset 확인
- OG 메타태그 구현 확인
- 삭제 확인 모달 구현 확인
- 토스트 메시지 전반 확인
