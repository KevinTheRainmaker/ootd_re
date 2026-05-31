# 코드 리뷰 — CLOSET Flutter MVP

리뷰 일자: 2026-05-31  
리뷰어: 베조스 (초안) + 피차이 (업데이트)  
`flutter analyze` 결과: **No issues found** (피차이가 E1 수정 완료 — S10 완료로 card_generation_screen.dart 생성됨)

---

## [BLOCKER] flutter analyze 에러

### E1. card_generation_screen.dart 파일 없음

- **파일**: `lib/app/router.dart:11`
- **에러**: `uri_does_not_exist` + `undefined_function CardGenerationScreen`
- **원인**: router.dart가 `../features/card/card_generation_screen.dart`를 import하나 파일이 없음. S10(카드 생성 화면)이 미구현 상태
- **영향**: `flutter analyze` 실패 → CI 블로킹. 앱 빌드 불가
- **조치 필요**: S10 담당자(저커버그)가 `card_generation_screen.dart` 구현하거나, 임시 플레이스홀더 파일 생성

---

## [BUG] 런타임 크래시 가능성

### B1. router.dart — `router` 전역 변수 이중 GoRouter 생성

- **파일**: `lib/app/router.dart:86-89`
- **코드**: `final router = GoRouter(initialLocation: '/login', routes: _routes);`
- **문제**: `routerProvider`와 별도로 두 번째 GoRouter 인스턴스를 만들지만 실제로 사용되지 않음. `refresh Listenable`도 없어 인증 redirect가 작동 안 함. main.dart는 `routerProvider`를 사용 중이므로 이 변수는 dead code
- **위험도**: 중간 (현재는 미사용이지만 혼동 유발, 나중에 잘못 연결될 경우 인증 우회 발생)
- **조치**: `router` 전역 변수 삭제

### B2. router.dart — redirect에 refreshListenable만으로는 실시간 반영 불완전

- **파일**: `lib/app/router.dart:17-24`
- **문제**: `redirect`에서 `Supabase.instance.client.auth.currentUser`를 직접 조회. `_AuthChangeNotifier`가 `authStateProvider` 변경 시 `notifyListeners()` 호출하므로 redirect 재평가는 되나, Supabase의 토큰 갱신(세션 복원) 이벤트가 `authStateProvider` stream에서 누락될 경우 `/login`에 갇힘
- **위험도**: 낮음 (Supabase SDK 정상 동작 시 문제없음, 다만 edge case)

### B3. home_screen.dart — `_ootdsByDate` 하드코딩 빈 맵, provider 미연결

- **파일**: `lib/features/home/home_screen.dart:17`
- **코드**: `final Map<DateTime, List<OotdRecord>> _ootdsByDate = {};`
- **문제**: `home_provider.dart`에 `ootdsByMonthProvider`가 구현되어 있으나 `home_screen.dart`가 이를 전혀 사용하지 않음. 캘린더에 항상 빈 데이터만 표시됨
- **위험도**: 높음 (핵심 기능 미작동 — OOTD 캘린더가 빈 화면)
- **조치**: `HomeScreen`을 `ConsumerWidget`으로 변환, `ootdsByMonthProvider` 연결

### B4. ootd_service.dart — `getOotdsByMonth` 12월 경계 버그

- **파일**: `lib/services/ootd_service.dart:66`
- **코드**: `final to = DateTime(year, month + 1, 0);`
- **문제**: `month = 12`일 때 `DateTime(year, 13, 0)` → Dart는 이를 `DateTime(year+1, 0, 0)` 으로 처리. Dart의 `DateTime` 생성자는 overflow를 허용하므로 실제로는 정상 동작하지만 의도가 불명확하고 오해 소지 있음
- **위험도**: 낮음 (Dart 동작으로 실제 버그는 아님, 하지만 가독성 문제)
- **조치 권장**: `DateTime(year, month + 1, 1).subtract(const Duration(days: 1))`으로 명시적 작성

### B5. gemini_service.dart — API 키 `!` (null assert) + 이미지 JPEG 고정

- **파일**: `lib/services/gemini_service.dart:13, 29`
- **코드**: `dotenv.env['GEMINI_API_KEY']!` / `DataPart('image/jpeg', imageBytes)`
- **문제 1**: `.env` 누락 또는 키 미설정 시 `Null check operator` 예외로 앱 즉시 크래시. 에러 메시지가 불친절함
- **문제 2**: `image_picker`가 반환하는 이미지는 PNG일 수도 있음 (특히 iOS 스크린샷, HEIC → PNG 변환). MIME 타입 고정은 Gemini API가 거부할 수 있음
- **위험도**: 중간
- **조치**: API 키 null 체크 + 예외 throw. 이미지 확장자 기반 MIME 타입 분기

### B6. auth_service.dart — `idToken!` null assert

- **파일**: `lib/services/auth_service.dart:14`
- **코드**: `idToken: googleAuth.idToken!`
- **문제**: Google 로그인이 네트워크 오류나 권한 거부로 idToken이 null 반환 시 크래시. 드문 케이스이지만 실제 디바이스에서 발생 가능
- **위험도**: 낮음
- **조치**: `if (googleAuth.idToken == null) throw Exception('Google 인증 실패')` 추가

---

## [DESIGN] 구조적 개선 필요

### D1. ootd_upload_provider.dart — `@riverpod` code_gen 미사용

- **파일**: `lib/features/ootd/ootd_upload_provider.dart`
- **문제**: `progress.txt`의 Gotchas에 "Riverpod 3.0: @riverpod 어노테이션 + code_gen 사용" 명시되어 있으나, 이 파일은 `NotifierProvider(UploadNotifier.new)` 수동 방식 사용. 일관성 없음
- **위험도**: 낮음 (기능상 문제없음, 컨벤션 불일치)

### D2. main_scaffold.dart — IndexedStack index 계산 로직 불명확

- **파일**: `lib/app/main_scaffold.dart:40`
- **코드**: `index: _currentIndex == 1 ? 0 : _currentIndex`
- **문제**: FAB 탭(index 1)이 눌렸을 때 index 0(홈)으로 fallback하는 로직이 묵시적. `_onTabTapped`에서 이미 index 1을 early return하므로 이 삼항연산자는 방어코드지만 코드 독자에게 혼란

### D3. home_screen.dart — weather_provider 미연결 (S6 in_progress)

- **파일**: `lib/features/home/home_screen.dart:39-55`
- **문제**: 날씨 위젯 영역이 "날씨 위젯" 텍스트 플레이스홀더. `weather_provider.dart`가 구현되어 있으나 미연결. S6이 in_progress이므로 예상된 상태
- **위험도**: 낮음 (진행 중인 작업)

---

## [MISSING] 미구현 파일 목록

| 파일                                            | 상태                        | 블로킹 여부                    |
| ----------------------------------------------- | --------------------------- | ------------------------------ |
| `lib/features/card/card_generation_screen.dart` | 없음 (S10 pending)          | **YES — flutter analyze 실패** |
| `lib/features/profile/profile_screen.dart`      | 확인 필요 (S13 in_progress) | 미확인                         |

---

## 우선순위 요약

| 우선순위           | 항목                                              | 담당           |
| ------------------ | ------------------------------------------------- | -------------- |
| P0 — 즉시          | E1: card_generation_screen.dart 플레이스홀더 생성 | 저커버그 (S10) |
| P1 — 이번 스프린트 | B3: HomeScreen → provider 연결                    | 팀쿡 (S6)      |
| P1 — 이번 스프린트 | B5: Gemini API 키 null 체크 + MIME 분기           | 젠슨           |
| P2 — 다음 스프린트 | B1: router 전역 변수 제거                         | 저커버그       |
| P2 — 다음 스프린트 | B6: auth idToken null 체크                        | 젠슨           |
| P3 — 개선          | B4: 12월 경계 가독성                              | 젠슨           |
| P3 — 개선          | D1: code_gen 일관성                               | 저커버그       |
