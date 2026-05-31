# CLOSET — Architecture

## Overview

Flutter 패션 앱. 날씨+AI코디 추천 홈 + OOTD 캘린더 + AI 카드 생성.

## Tech Stack

| Layer              | Technology                              |
| ------------------ | --------------------------------------- |
| Framework          | Flutter 3.x (Dart)                      |
| State Management   | Riverpod 3.0 + riverpod_generator       |
| Navigation         | go_router                               |
| Backend            | Supabase (PostgreSQL + Storage + Auth)  |
| AI Vision          | Gemini 2.0 Flash (google_generative_ai) |
| Weather            | OpenWeatherMap REST API                 |
| Background Removal | remove.bg API                           |
| Env Config         | flutter_dotenv                          |

## Directory Structure

```
lib/
├── main.dart              # 앱 진입점 (Supabase + dotenv 초기화)
├── app/
│   ├── router.dart        # go_router 라우트 정의
│   └── theme.dart         # Material3 테마
├── features/
│   ├── auth/              # 소셜 로그인 (Google)
│   ├── home/              # 날씨 위젯 + OOTD 캘린더
│   │   └── widgets/
│   ├── ootd/              # 사진 업로드 + AI 분석
│   ├── card/              # 카드 생성 화면
│   ├── profile/           # 프로필
│   └── shop/              # 숍 (Coming Soon)
├── shared/
│   ├── models/            # 도메인 모델 (OotdRecord, WeatherData 등)
│   ├── widgets/           # 공통 위젯
│   └── utils/             # 유틸리티
└── services/              # API 클라이언트 (Supabase, Gemini, Weather)
```

## Data Flow

```
사용자 → PhotoUpload → Gemini Vision 분석 → 아이템 편집 → 카드 생성 → Supabase 저장
```

## DB Schema (Supabase)

- `users`: 사용자 프로필 + plan(free/pro)
- `ootd_records`: OOTD 메인 레코드 (이미지 URL, 무드, 공개 여부)
- `ootd_items`: 착장 아이템 목록 (카테고리, 브랜드, 색상 등)
- `usage_logs`: 월별 카드 생성 카운트

## File Boundaries

| Agent    | Ownership                                                                          |
| -------- | ---------------------------------------------------------------------------------- |
| 피차이   | lib/app/, lib/shared/models/, pubspec.yaml, docs/                                  |
| 팀쿡     | lib/features/home/, lib/features/shop/, lib/features/profile/, lib/shared/widgets/ |
| 저커버그 | lib/features/ootd/, lib/features/card/                                             |
| 젠슨     | lib/services/, supabase/migrations/                                                |

## Freemium Model

- Free: 기본 카드 생성 (월 5회)
- Pro: AI 배경제거, 스타일 변경 (월 30회, $4/월)
