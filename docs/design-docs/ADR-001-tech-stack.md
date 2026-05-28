# ADR-001: Tech Stack Selection

**Date:** 2026-05-28  
**Status:** Accepted

## Context

OOTD-re MVP — 착장 사진 1장을 AI로 분석해 손글씨 카드를 생성하고 링크로 공유하는 웹앱.
빠른 출시, 소규모 팀, Vercel 배포를 전제로 스택을 선정한다.

## Decision

| Layer      | Choice                    | Rationale                                          |
| ---------- | ------------------------- | -------------------------------------------------- |
| Framework  | Next.js 14 (App Router)   | SSR/SSG 통합, Vercel 최적화, API Routes 내장       |
| Language   | TypeScript                | 타입 안전성, 팀 협업 계약                          |
| Styling    | Tailwind CSS              | 빠른 UI 개발, 유틸리티 클래스                      |
| Database   | Supabase (PostgreSQL)     | RLS, Storage, Auth 통합 — 별도 서버 불필요         |
| Auth       | NextAuth.js               | Google + Kakao OAuth, 세션 관리                    |
| Card Gen A | OpenAI gpt-image-1        | 원본 사진 위 손글씨 주석 (Sprint 0 PoC 필요)       |
| Card Gen B | satori + Nanum Pen Script | gpt-image-1 API 불가 시 fallback, Vercel Edge 호환 |
| Vision     | Claude / GPT-4o           | Sprint 0 비교 후 결정                              |
| Deploy     | Vercel                    | Next.js 최적 배포 환경                             |

## Consequences

- Kakao Provider는 NextAuth 기본 미포함 → 커스텀 Provider 구현 필요
- gpt-image-1 API 지원 여부 Sprint 0 Day 1-3 내 검증 필수
- supabaseAdmin (service_role 키)는 API Routes에서만 사용 — 클라이언트 노출 금지
- share_id는 nanoid 8자로 생성 (추측 불가)
