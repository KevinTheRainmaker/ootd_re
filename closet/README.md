# CLOSET

Flutter 패션 앱. 착장 사진 1장으로 AI가 코디를 분석하고, 날씨 기반 추천과 OOTD 캘린더를 제공합니다.

**Stack:** Flutter + Riverpod 3.0 + Supabase + Gemini 2.0 Flash + OpenWeatherMap

## 환경 설정

`.env.example`을 복사해 `.env`를 생성하고 각 키를 입력합니다.

```bash
cp .env.example .env
```

| 키                       | 설명                        | 발급처                              |
| ------------------------ | --------------------------- | ----------------------------------- |
| `SUPABASE_URL`           | Supabase 프로젝트 URL       | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY`      | Supabase anon 공개 키       | Supabase Dashboard → Settings → API |
| `OPENWEATHERMAP_API_KEY` | 날씨 API 키                 | openweathermap.org → My API Keys    |
| `GEMINI_API_KEY`         | Gemini Vision API 키        | Google AI Studio → Get API Key      |
| `REMOVEBG_API_KEY`       | 배경 제거 API 키 (Pro 기능) | remove.bg → API                     |

## Supabase 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 마이그레이션 순서대로 실행:
   ```
   supabase/migrations/001_initial.sql
   supabase/migrations/002_rls.sql
   ```
3. Authentication → Providers → Google OAuth 활성화 후 클라이언트 ID/Secret 입력
4. Storage → New Bucket → `ootd-images` 생성 (Public: false)

## 실행

```bash
# 의존성 설치
flutter pub get

# 앱 실행 (Android 에뮬레이터 또는 실기기)
flutter run

# 코드 생성 (Riverpod provider 변경 시)
dart run build_runner build --delete-conflicting-outputs
```

## 디렉토리 구조

```
lib/
├── main.dart              # 진입점 (Supabase + dotenv 초기화)
├── app/                   # 라우터, 테마
├── features/
│   ├── auth/              # Google 로그인
│   ├── home/              # 날씨 위젯 + OOTD 캘린더
│   ├── ootd/              # 사진 업로드 + Gemini Vision 분석
│   ├── card/              # 카드 생성
│   ├── profile/           # 프로필
│   └── shop/              # 숍 (Coming Soon)
├── shared/
│   ├── models/            # OotdRecord, OotdItem, WeatherData, UserProfile
│   ├── widgets/           # 공통 위젯
│   └── utils/
└── services/              # Supabase, Gemini, Weather API 클라이언트
```

## 빌드 검증

```bash
flutter analyze          # 정적 분석
flutter test             # 단위 테스트
flutter build apk --debug  # Android 디버그 빌드
```
