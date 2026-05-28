# OOTD-re Tasks

## Sprint 0

- [x] S0: docs/ 초기화 + Next.js 14 프로젝트 스캐폴딩 (피차이)
- [ ] S1: 삭제 분석 + MVP 스코프 검토
- [x] S2: 아키텍처 ADR + TypeScript 타입 정의 (피차이) — S0 직후 시작
- [ ] S3: Supabase 설정 + DB 마이그레이션 (젠슨)
- [ ] S4: gpt-image-1 PoC + Vision 모델 비교 스크립트
- [ ] S5: NextAuth.js + Google + Kakao OAuth 통합 (젠슨)

## Sprint 1

- [ ] S6: 사진 업로드 API + Supabase Storage (젠슨)
- [ ] S7: 업로드 UI + 홈 레이아웃 + 공통 컴포넌트 (팀쿡)
- [ ] S8: AI 분석 API /api/ootd/analyze (젠슨)
- [ ] S9: 분석 결과 화면 + 아이템 편집 UI (저커버그)
- [ ] S10: 카드 생성 API /api/ootd/generate-card (젠슨)
- [ ] S11: Usage 카운터 + 한도 모달 (저커버그)
- [ ] S12: 카드 결과 화면 (저커버그)
- [ ] S13: OOTD 저장 API + share_id 생성 (젠슨)
- [ ] S14: 공유 페이지 /share/[id] SSR + OG 메타태그 (저커버그)
- [ ] S15: 공개/비공개 토글 + OOTD 편집/삭제
- [ ] S16: OOTD 캘린더 리스트 페이지
- [ ] S17: 모바일 반응형 + 에러 처리 + 토스트

## Review

### S0 (2026-05-28)

- Next.js 14 (App Router, TypeScript, Tailwind) 스캐폴딩 완료
- docs/ 구조: ARCHITECTURE.md, design-docs/index.md, exec-plans/active|completed, references/index.md
- .env.example 생성 (11개 키)
- .gitignore .env\* 포함 확인

### S2 (2026-05-28)

- src/types/index.ts + src/types/api.ts 생성 (도메인 + API 타입)
- src/lib/supabase.ts 생성 (client + admin)
- docs/ARCHITECTURE.md 완성
- docs/design-docs/ADR-001-tech-stack.md 생성
- @supabase/supabase-js, nanoid 설치
