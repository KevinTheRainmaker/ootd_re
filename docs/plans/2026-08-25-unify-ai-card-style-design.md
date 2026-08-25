# AI 카드·스타일 통합 설계

## 문제

카드 화면은 `AI 카드`와 `스타일`을 서로 다른 선택지로 노출하지만, 두 값 모두 동일한 `/api/ootd/generate-card` 요청을 거쳐 같은 `generateCard()`와 GPT Image 프롬프트를 사용한다. 사용자는 결과 차이를 기대하지만 실제 차이는 없고, 선택할 때마다 동일한 생성 사용량만 차감된다.

## 결정

- 공개 UI에는 `기본`과 `AI 카드` 두 선택지만 노출한다.
- 정식 카드 타입은 `basic | ai`로 축소한다.
- 배포 전 화면이나 구형 클라이언트가 `style`을 보내면 서버에서 `ai`로 정규화해 호환한다.
- 그 외 알 수 없는 타입은 `400 invalid_card_type`으로 거절해 유료 생성 사용량 우회를 막는다.
- 생성 프롬프트와 OOTD 저장 스키마는 바꾸지 않는다.
- AI 카드 생성 비용은 `card_generation_requests`와 service-role 전용 RPC로 모델 호출 전에 원자 예약한다. 같은 `request_id`의 재전송은 완료 결과를 재사용하며 동시 요청·응답 유실로 중복 과금하지 않는다.
- 원본은 현재 사용자의 `originals` 경로만 허용하고, 예약 성공 뒤에만 10MB·40MP·15초 상한으로 읽는다.
- 요청 본문은 스트리밍 64KB 상한과 아이템·문자열 제한을 통과한 canonical payload만 fingerprint와 프롬프트에 사용한다.
- `011_atomic_card_generation.sql`은 예약·완료·환불·만료 회수를 원자화한다. 기존 OOTD/카드 저장 컬럼에는 변경이 없다.
- 만료 예약 회수는 기존 cleanup cron에서 수행하며, `CRON_SECRET` 누락 시 service-role 작업을 실행하지 않고 503으로 닫는다.

## 검증

- `basic`, `ai`, legacy `style`, 누락, 잘못된 타입의 정규화 단위 테스트
- 카드 화면에 중복 `스타일` 선택지가 없는지 정적 회귀 테스트
- 동일 요청의 busy/완료 재사용, lease 재선점, stale token 거절, 환불·만료 회수를 `BEGIN ... ROLLBACK` DB smoke로 검증
- anon/authenticated의 카드 예약 테이블 쓰기와 RPC 실행 권한이 모두 차단됐는지 확인
- 전체 테스트, TypeScript, ESLint, production build
