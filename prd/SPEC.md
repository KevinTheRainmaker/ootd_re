# 기술 명세 (SPEC)

> PRD 기반 자동 생성 | /tth에서 직접 참조

## 기술 스택

| 레이어                      | 기술                                                                         | 선택 이유                                               |
| --------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| Frontend                    | Next.js 14 (App Router) + TypeScript + Tailwind CSS                          | SSR (공유 페이지 OG 메타), 단일 코드베이스, Vercel 통합 |
| Backend                     | Next.js API Routes (서버리스)                                                | 별도 백엔드 인프라 불필요, 1인 개발 적합                |
| DB                          | Supabase (PostgreSQL)                                                        | 무료 한도 + RLS + Storage + Auth 통합                   |
| Auth                        | NextAuth.js (Google + Kakao OAuth)                                           | 한국 시장 Kakao 필수, NextAuth 생태계 성숙              |
| Storage                     | Supabase Storage                                                             | DB와 동일 벤더, 무료 1GB                                |
| AI 분석                     | Claude Vision (claude-sonnet-4-6) 또는 GPT-4o Vision (Sprint 0 비교 후 결정) | 패션 도메인 인식 성능 비교 필요                         |
| 카드 생성 Plan A            | OpenAI gpt-image-1 API (이미지 편집)                                         | 차별화 핵심 (사진 위 손글씨 주석)                       |
| 카드 생성 Plan B (fallback) | html2canvas + Google Fonts (Nanum Pen Script)                                | Plan A 실패 시 백업, 비용 0                             |
| Rate Limiting               | Supabase DB usage 카운터 (monthly_card_count)                                | 별도 인프라 불필요, RLS로 보안                          |
| 배포                        | Vercel                                                                       | Next.js 표준, GitHub 연동 자동 배포                     |
| 결제                        | (MVP 제외, Phase 2에 Toss/Stripe)                                            | MVP 우선순위 외                                         |
| 모니터링                    | Vercel Analytics + Supabase Logs                                             | 무료 + 통합                                             |

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                   사용자 (브라우저)                       │
└─────────────────────────────────────────────────────────┘
              │                          │
              │ HTTP/SSR                 │ /share/[id] (공개)
              ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js App (Vercel Edge/Serverless)        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Pages (SSR) │  │ API Routes  │  │ NextAuth        │ │
│  │ - /         │  │ - /api/...  │  │ - Google        │ │
│  │ - /share    │  │             │  │ - Kakao         │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
        │              │              │              │
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Supabase    │ │  Supabase    │ │  OpenAI /    │ │  OpenAI      │
│  PostgreSQL  │ │  Storage     │ │  Anthropic   │ │  gpt-image-1 │
│  (RLS 적용)  │ │  (원본/카드) │ │  Vision API  │ │  (Plan A)    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### 데이터 흐름 (카드 생성)

```
1. 사용자 사진 업로드
   → POST /api/ootd/upload
   → Supabase Storage (original/)
   → original_image_url 반환

2. AI 분석 호출
   → POST /api/ootd/analyze { image_url }
   → Claude Vision / GPT-4o Vision
   → JSON 응답 (items, summary, hashtags)

3. (선택) 사용자가 분석 결과 편집

4. 카드 생성
   → POST /api/ootd/generate-card { ootd_data }
   → usage_logs 카운터 체크 → 한도 초과 시 403
   → Plan A: gpt-image-1 API 호출
   → Plan A 실패 시 Plan B: html2canvas 렌더링
   → Supabase Storage (cards/)
   → card_image_url 반환

5. OOTD 레코드 저장
   → POST /api/ootd/save
   → ootd_records + ootd_items insert
   → share_id 생성 (nanoid)

6. 공유
   → /share/[share_id] (SSR + OG)
```

---

## API 설계

### 인증 관련 (NextAuth)

| Method | Path                      | 설명              |
| ------ | ------------------------- | ----------------- |
| GET    | /api/auth/signin          | 로그인 페이지     |
| GET    | /api/auth/callback/google | Google OAuth 콜백 |
| GET    | /api/auth/callback/kakao  | Kakao OAuth 콜백  |
| POST   | /api/auth/signout         | 로그아웃          |

### OOTD 관련

| Method | Path                    | 설명                        | Request                             | Response                                                 |
| ------ | ----------------------- | --------------------------- | ----------------------------------- | -------------------------------------------------------- |
| POST   | /api/ootd/upload        | 사진 업로드                 | multipart/form-data (image)         | `{ url: string }`                                        |
| POST   | /api/ootd/analyze       | AI 분석                     | `{ image_url: string }`             | `{ items: Item[], summary: string, hashtags: string[] }` |
| POST   | /api/ootd/generate-card | 카드 생성 (usage 체크 포함) | `{ ootd_data: OotdData }`           | `{ card_image_url: string, plan_used: 'A' \| 'B' }`      |
| POST   | /api/ootd/save          | OOTD 저장                   | `{ ootd_record, items, is_public }` | `{ id: string, share_id: string \| null }`               |
| GET    | /api/ootd/[id]          | 상세 조회 (본인)            | -                                   | `{ ootd_record, items }`                                 |
| PATCH  | /api/ootd/[id]          | 편집                        | `{ items?, memo?, is_public? }`     | `{ ootd_record, items }`                                 |
| DELETE | /api/ootd/[id]          | 삭제                        | -                                   | `{ success: true }`                                      |
| GET    | /api/ootd/calendar      | 월별 캘린더 데이터          | `?year=2026&month=5`                | `{ records: Ootd[] }`                                    |
| GET    | /api/usage              | 사용량 조회                 | -                                   | `{ year_month, card_generation_count, limit }`           |

### 공유 페이지

| Method | Path              | 설명                               |
| ------ | ----------------- | ---------------------------------- |
| GET    | /share/[share_id] | SSR 공개 페이지 (OG 메타태그 포함) |

### 요청/응답 예시

#### POST /api/ootd/analyze

**Request**:

```json
{ "image_url": "https://supabase.co/storage/.../abc.jpg" }
```

**Response 200**:

```json
{
  "items": [
    {
      "category": "outer",
      "color": "베이지",
      "style_description": "오버사이즈 트렌치 코트, 빈티지 분위기",
      "brand": null,
      "confidence": 0.85
    },
    {
      "category": "bottom",
      "color": "다크 브라운",
      "style_description": "와이드 코듀로이 팬츠",
      "brand": null,
      "confidence": 0.78
    }
  ],
  "summary": "조용한 럭셔리 + 빈티지 믹스. 가을 시즌에 어울리는 톤온톤 코디.",
  "hashtags": ["#OOTD", "#빈티지", "#가을코디", "#트렌치코트"]
}
```

**Response 4xx**:

- 400: 사진에서 착장 미인식
- 401: 인증 필요
- 500: AI API 오류

#### POST /api/ootd/generate-card

**Request**:

```json
{
  "ootd_data": {
    "original_image_url": "...",
    "items": [...],
    "summary": "...",
    "hashtags": [...]
  }
}
```

**Response 200**:

```json
{
  "card_image_url": "https://supabase.co/storage/.../card_xyz.png",
  "plan_used": "A"
}
```

**Response 403** (한도 초과):

```json
{ "error": "monthly_limit_exceeded", "current": 5, "limit": 5, "plan": "free" }
```

---

## 데이터 모델

### users

| 필드       | 타입        | 제약                                   | 설명              |
| ---------- | ----------- | -------------------------------------- | ----------------- |
| id         | uuid        | PK                                     | NextAuth 자동     |
| email      | text        | UNIQUE NOT NULL                        |                   |
| name       | text        |                                        |                   |
| image      | text        |                                        | 프로필 이미지 URL |
| plan       | text        | DEFAULT 'free' CHECK IN ('free','pro') |                   |
| created_at | timestamptz | DEFAULT now()                          |                   |
| updated_at | timestamptz | DEFAULT now()                          |                   |

### ootd_records

| 필드               | 타입        | 제약                                     | 설명                         |
| ------------------ | ----------- | ---------------------------------------- | ---------------------------- |
| id                 | uuid        | PK                                       |                              |
| user_id            | uuid        | FK users(id) ON DELETE CASCADE, NOT NULL |                              |
| date               | date        | NOT NULL                                 | 착장 날짜 (기본 = 오늘)      |
| original_image_url | text        | NOT NULL                                 |                              |
| card_image_url     | text        |                                          | 카드 생성 전엔 NULL          |
| style_summary      | text        |                                          | AI 분석 요약                 |
| hashtags           | text[]      | DEFAULT '{}'                             |                              |
| is_public          | boolean     | DEFAULT false                            |                              |
| share_id           | text        | UNIQUE                                   | nanoid 8자, 공개 시에만 생성 |
| memo               | text        |                                          | 사용자 메모 (200자)          |
| plan_used          | text        | CHECK IN ('A','B')                       | 카드 생성 시 사용된 플랜     |
| created_at         | timestamptz | DEFAULT now()                            |                              |
| updated_at         | timestamptz | DEFAULT now()                            |                              |

**인덱스**:

- `idx_ootd_user_date` (user_id, date DESC)
- `idx_ootd_share` (share_id) WHERE is_public = true

### ootd_items

| 필드              | 타입        | 제약                                                                 | 설명                |
| ----------------- | ----------- | -------------------------------------------------------------------- | ------------------- |
| id                | uuid        | PK                                                                   |                     |
| ootd_id           | uuid        | FK ootd_records(id) ON DELETE CASCADE, NOT NULL                      |                     |
| category          | text        | NOT NULL CHECK IN ('top','bottom','outer','shoes','bag','accessory') |                     |
| color             | text        |                                                                      |                     |
| style_description | text        |                                                                      |                     |
| brand             | text        |                                                                      |                     |
| product_name      | text        |                                                                      |                     |
| purchase_url      | text        |                                                                      |                     |
| price             | integer     |                                                                      | KRW                 |
| size              | text        |                                                                      |                     |
| is_ad             | boolean     | DEFAULT false                                                        | 협찬 여부 (Phase 2) |
| order_idx         | integer     | DEFAULT 0                                                            | 카드 내 순서        |
| created_at        | timestamptz | DEFAULT now()                                                        |                     |

**인덱스**:

- `idx_items_ootd` (ootd_id, order_idx)

### usage_logs

| 필드                  | 타입        | 제약                                     | 설명           |
| --------------------- | ----------- | ---------------------------------------- | -------------- |
| id                    | uuid        | PK                                       |                |
| user_id               | uuid        | FK users(id) ON DELETE CASCADE, NOT NULL |                |
| year_month            | text        | NOT NULL                                 | 'YYYY-MM' 포맷 |
| card_generation_count | integer     | DEFAULT 0                                |                |
| created_at            | timestamptz | DEFAULT now()                            |                |
| updated_at            | timestamptz | DEFAULT now()                            |                |

**제약**: UNIQUE (user_id, year_month)

---

## 인증 & 보안

- **인증 방식**: NextAuth.js + JWT 세션 (7일 유지)
- **OAuth Providers**:
  - Google (NextAuth 기본)
  - Kakao (커스텀 Provider, 한국 시장 필수)
- **권한 모델**:
  - 본인 OOTD: 모든 CRUD
  - 타인 OOTD (공개): GET /share/[id]만 가능
  - 타인 OOTD (비공개): 접근 불가 (404)
- **Supabase RLS 정책**:
  - users: 본인 row만 SELECT/UPDATE
  - ootd_records: 본인 + 공개 row 조회, 본인만 수정
  - ootd_items: 부모 ootd_record 권한 상속
  - usage_logs: 본인만 SELECT, 서비스 키로만 UPDATE (API에서)
- **API Rate Limit**:
  - /api/ootd/analyze: 사용자당 분당 5회
  - /api/ootd/generate-card: 월 한도 (free 5 / pro 30)
- **보안 체크리스트**:
  - [ ] 환경변수 분리 (.env.local, Vercel Secrets)
  - [ ] OpenAI/Anthropic API 키 서버 사이드만 사용
  - [ ] Supabase Service Role 키는 API Routes에서만
  - [ ] 사용자 입력 이미지 사이즈 제한 (10MB)
  - [ ] 사용자 입력 이미지 MIME 검증

---

## 인프라 & 배포

- **호스팅**: Vercel (Hobby → Pro 시점 = MAU 500+)
- **CI/CD**: GitHub → Vercel 자동 배포 (main 브랜치 = production, PR = preview)
- **환경**:
  - `development`: 로컬 + Supabase 개발 프로젝트
  - `preview`: PR별 Vercel Preview + 동일 Supabase 개발 프로젝트
  - `production`: main 브랜치 + Supabase 프로덕션 프로젝트
- **환경변수**:
  ```
  NEXTAUTH_URL
  NEXTAUTH_SECRET
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  KAKAO_CLIENT_ID
  KAKAO_CLIENT_SECRET
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  OPENAI_API_KEY
  ANTHROPIC_API_KEY (선택, Vision 모델 결정 후)
  ```
- **도메인**: 차후 (MVP는 Vercel 도메인)

---

## 카드 생성 파이프라인

### Plan A — gpt-image-1 (차별화 핵심)

```
1. 클라이언트 → POST /api/ootd/generate-card
2. 서버: usage_logs 카운터 체크 (free=5, pro=30)
3. 서버: 분석 결과 → 손글씨 프롬프트 작성
   예: "Take this OOTD photo and add handwritten-style annotations with arrows pointing to:
        - Trench coat: '베이지 오버사이즈 트렌치 (Caveat font feel)'
        - Pants: '다크 브라운 와이드 코듀로이'
        Style: white pen handwriting, casual, 1080x1920 vertical format."
4. OpenAI gpt-image-1 API (image edit) 호출
   input: original_image_url
   prompt: 위 프롬프트
5. 응답 이미지 → Supabase Storage (cards/{ootd_id}.png)
6. card_image_url + plan_used='A' 반환
7. usage_logs.card_generation_count++
```

**실패 처리**:

- API 오류, 부적절한 결과, 타임아웃 → Plan B 자동 진입

### Plan B — html2canvas (Fallback)

```
1. (Plan A 실패 시 또는 명시적 호출)
2. 서버 사이드 렌더링:
   - React 컴포넌트 <CardTemplate ootd={...} />
   - Layout: 원본 사진 (배경) + SVG 화살표 + 텍스트 오버레이
   - 폰트: Google Fonts "Nanum Pen Script"
3. Puppeteer 또는 satori (Vercel Edge 호환) 사용 추천
   * satori 우선 검토 (Edge 호환, Vercel 친화)
4. 1080x1920 PNG 변환
5. Supabase Storage 저장
6. plan_used='B' 반환
```

**도구 선택 (Sprint 0에서 결정)**:

- html2canvas (브라우저) → 서버에서는 동작 안 함, 클라이언트 렌더링 필요
- **satori (권장)**: Vercel @vercel/og 기반, 서버 사이드 SVG → PNG
- @react-pdf/renderer: PDF지만 이미지 출력 가능

---

## 마일스톤 (TTH 스토리 분해용)

> 각 마일스톤은 `/tth`가 스토리로 분해할 때 참조. verify는 검증 커맨드/조건.

### Sprint 0: 기술 검증 (3-5일)

1. [ ] **M0.1**: OpenAI API 키 확보 + gpt-image-1 단일 호출 성공
   - verify: `curl` 또는 Node 스크립트로 사진 1장 입력 → 결과 이미지 다운로드
2. [ ] **M0.2**: 10장 샘플 PoC, 손글씨 주석 품질 평가 (4/10 이상 사용 가능 = go)
   - verify: 평가 시트 + go/no-go 결정 문서
3. [ ] **M0.3**: Claude Vision vs GPT-4o Vision 비교 (10장)
   - verify: 카테고리/색상/설명 정확도 표 → 모델 결정
4. [ ] **M0.4**: Supabase 프로젝트 + 테이블 생성 + RLS 기본 정책
   - verify: SQL 마이그레이션 파일 + 테이블 4개 존재
5. [ ] **M0.5**: NextAuth Google + Kakao 사전 등록
   - verify: 로컬에서 Google 로그인 1회 성공

### Phase 1: MVP (4주)

#### Week 1: 기반 구축

6. [ ] **M1.1**: Next.js 14 프로젝트 초기화 + Tailwind + TypeScript
   - verify: `npm run dev` → localhost:3000 표시
7. [ ] **M1.2**: NextAuth + Google + Kakao 로그인 통합
   - verify: 양쪽 OAuth 로그인 → users 테이블 row 생성
8. [ ] **M1.3**: 사진 업로드 UI + Supabase Storage 업로드
   - verify: 5MB JPG 업로드 → Storage에 파일 존재 + URL 반환

#### Week 2: AI 분석 + 카드 생성

9. [ ] **M1.4**: /api/ootd/analyze 구현 (선택된 Vision API)
   - verify: 사진 URL → JSON 응답 (items, summary, hashtags)
10. [ ] **M1.5**: 분석 결과 표시 + 편집 UI
    - verify: 아이템 카드 클릭 → 편집 → 저장
11. [ ] **M1.6**: 카드 생성 Plan A (또는 Plan B) 통합
    - verify: 분석 → 카드 생성 클릭 → 카드 이미지 표시 (30초 이내)
12. [ ] **M1.7**: usage_logs 카운터 + 한도 체크 + 모달
    - verify: 5회 연속 생성 후 6회째 → 403 + 모달

#### Week 3: 공유 + 기록

13. [ ] **M1.8**: OOTD 저장 + share_id 생성
    - verify: 저장 → DB row + nanoid share_id
14. [ ] **M1.9**: /share/[share_id] SSR 페이지 + OG 메타태그
    - verify: 카카오톡 링크 미리보기 정상, 비로그인 접근 가능
15. [ ] **M1.10**: 공개/비공개 토글 + 비공개 404 처리
    - verify: 비공개 OOTD의 /share/[id] → 404
16. [ ] **M1.11**: "내 OOTD" 리스트 페이지 + 캘린더 리스트 뷰
    - verify: 월별 페이지네이션 동작, 항목 클릭 → 상세

#### Week 4: 마무리

17. [ ] **M1.12**: 상세/편집/삭제 페이지
    - verify: CRUD 일관성 테스트
18. [ ] **M1.13**: 모바일 반응형 QA
    - verify: iOS Safari + Android Chrome 모두 정상
19. [ ] **M1.14**: 에러 처리 + 로딩 상태 + 토스트 메시지
    - verify: 네트워크 끊김/타임아웃/한도 초과 시나리오 모두 사용자 친화 메시지
20. [ ] **M1.15**: 베타 사용자 5명 모집 + 사용 사례 추적
    - verify: 5명 모두 가입 + 카드 1개 이상 생성

---

## /tth 연결

- FEATURES.md의 각 기능(F1-F10)이 이 SPEC에서 기술적으로 뒷받침됨
- 마일스톤(M0.x, M1.x)은 /tth가 스토리로 분해할 때 직접 참조
- 각 마일스톤의 verify 조건은 /tth의 "Definition of Done"으로 활용
- Sprint 0 마일스톤(M0.1-M0.5)은 **순차 실행**: M0.1-M0.2 결과에 따라 Plan A/B 결정 → 이후 모든 카드 관련 스토리에 영향
