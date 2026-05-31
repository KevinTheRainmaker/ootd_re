# HANDOFF — CLOSET Flutter MVP

날짜: 2026-05-31
TTH 사일로: 사티아(PO) + 피차이 + 팀쿡 + 저커버그 + 젠슨 + 베조스

---

## 변경 사항 요약

CLOSET Flutter MVP를 0에서 완전 구축.

**구현된 기능:**

- Google 소셜 로그인 (Supabase Auth + Google Sign-In)
- 홈 화면: 날씨 위젯(상단 30%, 조건별 그라디언트) + AI 코디 추천 + OOTD 캘린더(하단 60%, 무드 색 점)
- 5탭 네비게이션 바 (홈/+/숍/프로필, 중앙 FAB)
- OOTD 업로드: 갤러리/카메라 선택 → Gemini 2.0 Flash Vision AI 분석
- 아이템 편집 UI: 카테고리/색상/브랜드/제품명 + 무드 5색 선택 + 수동 추가
- 카드 생성: 사진+메타데이터 오버레이 + 공개/비공개 + Supabase 저장
- Pro 기능 잠금 (배경제거, 스타일변경 - 구독 표시만)
- 날씨 스냅샷 보존 (ootd_records.weather_snapshot jsonb)
- 프로필 화면 + 숍 Coming Soon
- 단위 테스트 30개 (WeatherData, OotdRecord, OotdItem, GeminiService)

---

## 아키텍처 결정

| 결정                      | 이유                                   |
| ------------------------- | -------------------------------------- |
| Flutter + Riverpod 3.0    | 1인 개발 최적, GetX 금지(2026.04 삭제) |
| Gemini 2.0 Flash Vision   | 패션 인식 정확도 1위, 비용 저렴        |
| Supabase (Storage + DB)   | Flutter SDK 공식, 이미지 변환 빌트인   |
| OpenWeatherMap            | 무료 티어, Flutter 패키지 풍부         |
| google_fonts (Montserrat) | Vogue 디자인 시스템                    |
| Dart record 타입          | weather_widget 3개 Map → 단일 통합     |

---

## 삭제된 항목 (Musk Step 2)

- 커뮤니티 피드 (SNS 스타일): MVP 제외 — 모더레이션/알고리즘 필요
- riverpod_annotation/generator/build_runner: 미사용 dead dep 제거
- SupabaseStorageService: dead code였다가 실제 연결로 살림 (삭제→연결)
- textColor prop(\_AiRecommendCard): 미사용 prop 제거
- SnackBarAction 빈 핸들러: 거짓 기능 표기 제거
- 3개 분산 Map (weather_widget): Dart record 단일 통합

---

## Ralph Loop 통계

- 총 스토리: 16개 (S0-S15)
- 1회 통과: 14개
- CONDITIONAL 수정: 12개 항목
- 회귀 즉시 수정: 2건 (R1 router 인덱스, R2 weatherSnapshot 미전달)
- 머스크 평가: Round 1 71점 → Round 2 86점 PASS

---

## 남은 작업 (배포 전 필수)

### 즉시 (개발 환경)

- [ ] Supabase 프로젝트 생성 + 마이그레이션 실행 (001→003)
- [ ] Google Sign-In OAuth 클라이언트 ID 설정 (Android/iOS 각각)
- [ ] .env 파일에 실제 API 키 입력 (SUPABASE_URL/ANON_KEY, OPENWEATHERMAP, GEMINI, REMOVEBG)
- [ ] Supabase Storage 버킷 생성 (ootd-images, public)
- [ ] android/app/google-services.json 추가
- [ ] ios/GoogleService-Info.plist 추가

### 배포 전

- [ ] App Store / Play Store 앱 등록
- [ ] iOS: Info.plist 카메라/갤러리/위치 권한 문자열 추가
- [ ] Android: AndroidManifest.xml 권한 확인

### 백로그 (Phase 2)

- [ ] auth_service.dart accessToken null assert 처리
- [ ] Weather/AI 추천 캐싱 (Home 진입마다 재호출 방지)
- [ ] \_shareLink 실제 도메인 연결 (현재 더미 URL)
- [ ] remove.bg Pro 기능 실제 구현
- [ ] 커뮤니티 피드

---

## 배운 점

1. **Supabase Storage dead code 패턴** — 파일 만들고 호출 안 하는 것은 머스크가 잡아냄. 서비스 파일 만들면 즉시 연결까지
2. **CPS 차별점은 DB 스키마에 반영해야** — weather_snapshot 컬럼 없으면 "날씨+코디"는 기획서 문구일 뿐
3. **ndkVersion 명시 필수** — flutter.ndkVersion 대신 "27.0.12077973" 하드코딩 (플러그인 8개 요구)
4. **shared_preferences_android 버전 고정** — dependency_overrides: 2.4.13 (Dart 3.7 호환)
5. **flutter analyze --no-pub 필수** — pub resolution이 SDK 3.9+ 패키지 당길 수 있음
6. **팀원 간 같은 파일 중복 수정 주의** — 파일 경계를 명확히 해도 CONDITIONAL 단계에서 충돌 가능

## 품질 지표

- 머스크 평가: **86/100 PASS**
- flutter analyze: No issues
- flutter test: 30/30 passed
- flutter build apk --debug: 성공

## 실행 방법

```bash
cp .env.example .env
# .env에 실제 키 입력 후
flutter pub get
flutter run
```
