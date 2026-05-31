# ADR-001: Tech Stack 선택

## Status

Accepted

## Context

Flutter 패션 앱(CLOSET)의 기술 스택 결정. iOS + Android 동시 지원, 1인 개발 기준.

## Decisions

### State Management: Riverpod 3.0

- GetX는 2026.04 GitHub 삭제 사태로 제외
- Riverpod는 코드 생성(@riverpod) 기반으로 타입 안전성 보장
- Provider보다 테스트 용이성 우수

### Backend: Supabase

- PostgreSQL + Storage + Auth + Realtime 올인원
- Flutter SDK 공식 지원 (supabase_flutter v2.x)
- RLS로 클라이언트-직접 쿼리 보안

### AI Vision: Gemini 2.0 Flash

- 한국어 패션 아이템 인식 정확도 1위
- google_generative_ai 패키지로 Flutter 직접 호환
- OpenAI Vision 대비 비용 저렴

### Navigation: go_router

- Flutter 공식 권장 라우팅 패키지
- 딥링크, 웹 URL 지원
- Riverpod와 통합 용이

### Weather: OpenWeatherMap

- 무료 티어 충분 (월 1000콜)
- REST API, Flutter dotenv 환경변수 관리

## Consequences

- build_runner 코드 생성 빌드 단계 추가 필요
- Supabase RLS 정책 설계가 보안의 핵심
- Gemini API 키는 절대 앱 번들에 포함 금지 → 서버 프록시 필요 (Phase 2)
