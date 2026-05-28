# OOTD-re

착장 사진 1장을 업로드하면 AI가 아이템을 분석하고 손글씨 스타일 카드를 생성해 공유 링크로 만들어주는 서비스.

## 로컬 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 항목을 채웁니다.

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=                        # openssl rand -base64 32 로 생성

# Google OAuth (console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Kakao OAuth (developers.kakao.com) — Week 3 이후 필요
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# Supabase (app.supabase.com → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=              # 서버(API Routes)에서만 사용, 클라이언트 노출 금지

# AI API
OPENAI_API_KEY=                         # gpt-image-1 카드 생성 + GPT-4o Vision 분석
ANTHROPIC_API_KEY=                      # Vision 모델 결정 후 필요 시 추가
```

### 3. Supabase 설정

[app.supabase.com](https://app.supabase.com)에서 새 프로젝트를 생성한 후 SQL Editor에서 마이그레이션을 순서대로 실행합니다.

```bash
# 1단계: 테이블 + 인덱스 + 트리거 생성
supabase/migrations/001_initial.sql

# 2단계: RLS 정책 적용
supabase/migrations/002_rls.sql
```

Supabase CLI를 사용하는 경우:

```bash
supabase db push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

## 주요 기술 스택

| 레이어             | 기술                                                   |
| ------------------ | ------------------------------------------------------ |
| Frontend / Backend | Next.js 16 (App Router) + TypeScript + Tailwind CSS    |
| 인증               | NextAuth.js (Google OAuth, Kakao OAuth)                |
| DB / Storage       | Supabase (PostgreSQL + Storage)                        |
| AI 분석            | GPT-4o Vision                                          |
| 카드 생성          | OpenAI gpt-image-1 (Plan A) / satori (Plan B fallback) |
| 배포               | Vercel                                                 |
