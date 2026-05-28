# Lessons — OOTD-re TTH 사일로

## 기술 교훈

1. **gpt-image-1 URL 직접 입력 불가** — OpenAI gpt-image-1 API는 이미지 URL을 직접 받지 않음. 서버에서 fetch → ArrayBuffer → File 객체로 변환 후 전달 필요.

2. **html2canvas 서버 불가** — Next.js API Routes 또는 Edge Runtime에서 html2canvas 동작 안 함. satori(@vercel/og) 사용 권장.

3. **middleware.ts 위치** — Next.js 14 App Router에서 middleware는 `src/middleware.ts`가 아닌 프로젝트 루트 `middleware.ts`에 위치해야 Vercel 배포 시 정상 동작.

4. **global-error.tsx vs error.tsx** — 루트 layout 포함 전체 에러를 잡으려면 `global-error.tsx` 사용. `<html><body>` 래퍼 필수.

5. **Kakao OAuth email null** — 개발 앱에서 심사 미완료 계정은 email=null. `kakao_{id}@noemail.ootd` fallback 이메일 생성으로 대응.

6. **eslint max-warnings=0 게이트** — tsc --noEmit PASS만으로 검증 완료 보고하지 말 것. eslint도 게이트임. 특히 react-hooks 관련 경고는 빌드는 통과해도 게이트 실패.

7. **sessionStorage로 페이지 간 데이터 전달** — URL query string은 배열/객체 크기 한계. sessionStorage에 JSON 직렬화 후 다음 페이지에서 useState 초기값 함수로 동기 로드. useEffect에서 setState 패턴(react-hooks/set-state-in-effect) 회피.

8. **NextAuth signIn 콜백 upsert 위험** — 멀티 Provider(Google+Kakao) 환경에서 users.upsert는 id를 덮어씀. "email로 기존 row 조회 → 있으면 id 유지 + UPDATE, 없으면 INSERT" 패턴 사용.

## 프로세스 교훈

9. **머스크 Eval은 독립 평가자** — Generator(구현팀)가 보지 못한 데이터 흐름 버그를 발견함. 핵심 플로우(analyze→card→save) 연결이 끊겨 있었음. 독립 평가의 가치 증명.

10. **Sprint 0 Critical Gate 실효** — gpt-image-1 API PoC를 Sprint 0에서 검증한 덕분에 Plan A/B 방향을 조기 확정. 이 없었으면 Week 2에서 블로킹 발생.

11. **베조스(QA) 페어 리뷰 효과** — Kakao OAuth BUG, S12 카드UI 목 코드, global-error.tsx, page.tsx 하드코딩 등 구현팀이 놓친 이슈 9건을 별도 리뷰로 잡아냄.
