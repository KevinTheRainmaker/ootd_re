# OOTD-re Architecture

## Overview

착장 사진 1장 → AI Vision 분석 → gpt-image-1 손글씨 카드 → /share/[id] 링크 공유

## System Diagram

```
User
  │
  ▼
Next.js 14 (App Router) — Vercel
  │
  ├── /                → 홈 랜딩 (비로그인/로그인 분기)
  ├── /auth/signin     → 로그인 페이지 (Google + Kakao)
  ├── /upload          → 사진 업로드 UI (PhotoUpload)
  ├── /analyze         → AI 분석 결과 + 아이템 편집
  ├── /card            → 카드 생성 결과
  ├── /calendar        → OOTD 캘린더 리스트 (월별 그리드)
  ├── /ootd/[id]       → OOTD 상세 + 편집/삭제
  └── /share/[id]      → 공유 페이지 (SSR + OG 메타태그, 비인증 접근 가능)
  │
  ├── API Routes (src/app/api/)
  │     ├── /api/ootd/upload         → Supabase Storage 업로드
  │     ├── /api/ootd/analyze        → Vision 분석 (Claude Sonnet)
  │     ├── /api/ootd/generate-card  → 카드 생성 (gpt-image-1 / satori fallback)
  │     ├── /api/ootd/save           → OOTD 저장 + share_id 생성
  │     ├── /api/ootd/calendar       → 월별 OOTD 목록 조회
  │     └── /api/usage               → Usage 카운터 조회
  │
  └── Auth (NextAuth.js)
        ├── Google OAuth
        └── Kakao OAuth (커스텀 Provider)

External Services
  ├── Supabase
  │     ├── PostgreSQL (4 tables: users, ootd_records, ootd_items, usage_logs)
  │     └── Storage (원본 이미지 + 카드 이미지)
  ├── OpenAI API (gpt-image-1 카드 생성)
  └── Anthropic API (Claude Sonnet — Vision 분석)
```

## Data Flow

```
1. 사용자 사진 업로드
   → Supabase Storage (원본 저장)
   → original_image_url 반환

2. AI Vision 분석
   → Claude or GPT-4o → items[], summary, hashtags
   → 사용자 편집 가능

3. 카드 생성 (Plan A / Plan B)
   Plan A: gpt-image-1 API — 원본 사진 위 손글씨 주석 생성
   Plan B: satori + Nanum Pen Script — SVG→PNG (fallback)
   → Supabase Storage (카드 저장)
   → card_image_url 반환

4. OOTD 저장
   → ootd_records + ootd_items INSERT
   → nanoid 8자 share_id 생성
   → usage_logs 카운터 증가

5. 공유
   → /share/[id] SSR 렌더링
   → OG 메타태그 (카드 이미지 미리보기)
```

## Directory Structure

```
src/
├── app/
│   ├── (flow)/           # 팀쿡: 업로드 플로우 페이지
│   │   ├── upload/       # 사진 업로드 + 분석 단계 UI
│   │   ├── card/         # 카드 생성 결과
│   │   └── layout/
│   ├── (app)/            # 팀쿡: 인증 필요 앱 페이지
│   │   ├── calendar/     # OOTD 캘린더 리스트 (월별 그리드)
│   │   └── ootd/[id]/    # OOTD 상세 + 편집/삭제 (저커버그)
│   ├── share/[id]/       # 저커버그: 공유 페이지 (SSR + OG, 비인증)
│   ├── auth/signin/      # 팀쿡: 로그인 페이지
│   ├── api/              # 젠슨: API routes
│   │   ├── auth/[...nextauth]/
│   │   ├── ootd/upload|analyze|generate-card|save|calendar|[id]/
│   │   └── usage/
│   ├── error.tsx         # 전역 에러 바운더리 (다시 시도 + 홈으로)
│   ├── not-found.tsx     # 전역 404
│   ├── loading.tsx       # 전역 로딩 스피너
│   ├── layout.tsx        # 루트 레이아웃 (Noto Sans KR + Nanum Pen Script)
│   └── page.tsx          # 홈 랜딩 (비로그인/로그인 분기)
├── components/
│   ├── ui/               # 팀쿡: 공통 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Modal.tsx
│   │   └── Toast.tsx
│   ├── upload/           # 팀쿡: 업로드 전용 컴포넌트
│   │   └── PhotoUpload.tsx   # 드래그앤드롭 + 모바일카메라 + MIME/10MB 검증
│   └── calendar/         # 팀쿡: 캘린더 컴포넌트
│       └── OotdCard.tsx      # 썸네일 카드 + skeleton
├── lib/
│   ├── supabase.ts       # Supabase 클라이언트 (anon) + supabaseAdmin (service_role)
│   ├── auth.ts           # NextAuth 설정 (Google + Kakao 커스텀 Provider)
│   ├── storage.ts        # Supabase Storage 헬퍼
│   └── db/               # 젠슨: DB 쿼리 레이어
│       ├── ootd.ts
│       └── usage.ts
├── middleware.ts          # 보호 경로: /upload /card /ootd /calendar /api/ootd /api/usage
└── types/
    ├── index.ts           # 도메인 타입 (User, OotdRecord, OotdItem, UsageLog)
    └── api.ts             # API req/res 타입
supabase/
└── migrations/
    ├── 001_initial.sql    # 4 tables: users, ootd_records, ootd_items, usage_logs
    ├── 002_rls.sql        # Row Level Security 정책
    └── 003_constraints.sql # check_public_share_id + MVP 제외 컬럼 DROP
```

## Key Decisions

- **Card Generation**: Plan A (gpt-image-1) 우선, API 불가 시 Plan B (satori) fallback
- **Vision Model**: Sprint 0 PoC 결과로 Claude vs GPT-4o 결정
- **Auth**: NextAuth.js (Google + Kakao 커스텀 Provider)
- **Usage Limit**: 무료 월 5회 / 유료 월 30회 (MVP는 결제 없음)
- **share_id**: nanoid 8자 (추측 불가)

## ADRs

- [ADR-001: Tech Stack Selection](design-docs/ADR-001-tech-stack.md)
