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

12. **부모/자식 저장은 애플리케이션의 연속 insert로 원자화되지 않는다** — OOTD와 분류 아이템은 Postgres RPC 한 트랜잭션으로 저장하고, 클라이언트 요청 ID와 payload fingerprint를 함께 비교해 재시도 중복과 다른 payload의 키 재사용을 모두 막을 것.

13. **이미지 URL은 스킴 검사만으로 부족하다** — 공개 화면에 다시 렌더링할 URL은 Supabase origin, 버킷, 사용자 소유 경로까지 검증해 외부 추적 이미지와 타 사용자 객체 참조를 차단할 것.

14. **본문 크기 제한은 파싱 후 검사하지 않는다** — `req.json()`/`req.text()` 전체 적재 전에 스트림 청크 누적 크기를 검사하고 상한 초과 시 reader를 즉시 취소할 것.

15. **테스트 러너 추가 전 lockfile 정합성을 확인한다** — 단순 `npm install`도 package.json에 없는 기존 lock 의존성을 정리할 수 있다. 이 저장소처럼 lock과 manifest가 어긋난 경우에는 내장 Node 테스트+별도 tsc 출력처럼 의존성 없는 방법을 우선 검토할 것.

16. **Supabase SQL Editor의 Monaco 입력은 실행 전 전체 교체를 확인한다** — 자동 입력이 기존 SQL 뒤에 추가될 수 있으므로 에디터를 클릭한 뒤 전체 선택·교체하고, 실행 전 시작/끝 구문을 다시 확인할 것.

17. **PostgREST RPC 검증은 실제 함수 인자명으로 수행한다** — 함수가 존재해도 payload 키가 시그니처와 다르면 PGRST202/404가 난다. DB 내부 호출과 함께 실제 API payload로 service_role 도달 및 공개 역할 차단을 각각 검증할 것.

18. **인증 401은 세션 쿠키와 애플리케이션 사용자 ID를 분리해 추적한다** — 미들웨어가 JWT 존재만 확인하고 API가 별도 `dbId`를 요구하면 페이지는 열리면서 API만 401이 될 수 있다. JWT 콜백은 `dbId` 누락을 복구하고 DB 오류를 절대 로그인 성공으로 삼키지 말 것.

19. **Supabase Free 프로젝트 pause를 API 키 만료로 오인하지 않는다** — 프로젝트가 pause되면 `<project-ref>.supabase.co`가 `NXDOMAIN`이 될 수 있다. 키 교체 전에 대시보드 프로젝트 상태와 DNS를 함께 확인할 것.

20. **착장 분석 가능 여부를 사진의 촬영 의도와 혼동하지 않는다** — 스포츠·여행·공연·일상 사진도 사람이 착용한 의류가 보이면 분석 대상이다. `not_fashion`은 사람이 없거나 착용 의류를 식별할 수 없는 경우로만 제한할 것.

21. **참고 구현은 데이터 필드가 아니라 사용자에게 보이는 기능 계약까지 대조한다** — Wardrobe를 참고했다면 분류 텍스트만 저장하는 것으로 끝내지 말고 bbox 감지, crop, 빈 의류 재구성, 투명 이미지, 항목별 검토·재시도, 최종 이미지 저장까지 실제 파이프라인을 체크리스트로 확인할 것.

22. **SDK 타입보다 실제 모델의 런타임 capability가 우선이다** — OpenAI SDK가 이미지 모델 전반에 `input_fidelity`를 허용해도 특정 `gpt-image-2` 버전은 거절할 수 있다. 실제 API E2E와 모델별 옵션 회귀 테스트로 검증할 것.

23. **분리 전 crop도 민감한 원본 데이터다** — 착용자 신체와 배경이 남는 crop을 공개 URL로 저장하지 않는다. private object path를 영속화하고 사용자 권한과 공개 범위에 맞춰 짧은 signed URL만 발급할 것.

24. **외부 생성 작업의 멱등성에는 DB 행 잠금만으로 부족하다** — lease 재선점 뒤 늦게 끝난 worker가 새 결과를 덮어쓰지 못하도록 claim token으로 complete/fail을 fencing하고 결과도 token별 immutable path에 저장할 것.

25. **비싼 파이프라인의 모든 단계에 독립적인 비용 경계를 둔다** — cutout 쿼터만으로 vision 분석 반복 호출과 crop 저장 남용을 막을 수 없다. 분석과 이미지 생성 각각에 원자적 월 쿼터·동시성 lease·본문/응답 크기·timeout을 적용할 것.
