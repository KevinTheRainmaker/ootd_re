# HANDOFF — OOTD-re MVP

날짜: 2026-05-28
TTH 사일로: 사티아(PO) + 피차이 + 팀쿡 + 저커버그 + 젠슨 + 베조스

---

## 변경 사항 요약

OOTD-re MVP를 0에서 완전히 구현.

**핵심 플로우 (30초):**
사진 업로드 → Claude Vision 분석 → gpt-image-1 손글씨 카드 → /share/[id] 링크 공유

**구현된 기능:**

- 사진 업로드 (drag&drop, 카메라, 10MB/MIME 검증)
- AI 아이템 분석 (Claude Sonnet 4.6 Vision, structured output)
- 아이템 편집 UI (인라인 편집, 카테고리/색상/설명/브랜드/제품명)
- gpt-image-1 카드 생성 (Plan A) + satori fallback (Plan B)
- 공개/비공개 토글 + share_id 즉시 활성화
- /share/[id] SSR 공유 페이지 (OG 메타태그, 비로그인 접근)
- Google + Kakao OAuth (NextAuth.js)
- OOTD 저장/편집/삭제
- 캘린더 리스트 뷰
- Usage 카운터 (무료 5회/월, 유료 30회/월)
- 모바일 반응형 + 에러 처리 + 토스트

---

## 아키텍처 결정

| 결정                               | 이유                                                          |
| ---------------------------------- | ------------------------------------------------------------- |
| Claude Sonnet 4.6 Vision           | Sprint 0 비교 테스트에서 한국어 품질 우수 + URL 직접 지원     |
| sessionStorage로 analyze→card 전달 | URL query string 한계 (items 배열 크기), 빠른 구현            |
| satori (Plan B)                    | html2canvas는 서버에서 동작 안 함. @vercel/og 기반 Edge 호환  |
| Supabase anon + service_role 분리  | RLS 정책 보완, API Routes에서만 admin 접근                    |
| nanoid(8) share_id                 | 추측 불가 + URL 친화적                                        |
| Kakao email fallback               | 심사 미완료 개발 앱 email=null 대응 `kakao_{id}@noemail.ootd` |

---

## 삭제된 항목 (Musk Step 2)

베조스 S1 삭제 분석 결과:

- 결제 시스템 (MVP 제외)
- 검색/필터 (Should → Could)
- 협찬 라벨 (Phase 2)
- SNS 인터랙션 (Phase 3)
- 쇼핑몰 연동 (영구 제외)
- ootd_items: purchase_url, price, size, is_ad (MVP 불필요)
- Claude vs GPT-4o 비교 PoC (Sprint 0에서 Claude 선택 완료)
- 분당 API Rate Limit (DB 월 카운터로 충분)

---

## Ralph Loop 통계

- 총 스토리: 18개 (S0-S17)
- 1회 통과: 16개
- 재시도 후 통과: 2개 (S12 카드UI, 머스크 CONDITIONAL 재평가)
- 에스컬레이션: 0개
- 머스크 평가: v1 67점 → v2 86점 PASS
- 발견된 버그: 9건 (Kakao email, upsert id, middleware 경로, lint, 데이터 파이프, product_name, 월말 계산, 홈 문구, 공개 토글)
- 모두 수정 완료

---

## 남은 작업 (배포 전 필수)

### 즉시 (개발 환경)

- [ ] Supabase 프로젝트 생성 + 마이그레이션 실행 (001→004 순서)
- [ ] Google Cloud Console OAuth 앱 등록 + 허용 도메인 추가
- [ ] Kakao Developers 앱 등록 + Redirect URI 설정
- [ ] .env.local에 실제 API 키 입력

### 배포 전

- [ ] Vercel 프로젝트 연결 + 환경 변수 설정
- [ ] Supabase Storage 버킷 생성 (originals/, cards/)
- [ ] gpt-image-1 API 키 실제 테스트 (ChatGPT UI → API 동작 검증)
- [ ] 베타 사용자 5명 모집

### Phase 2 예정

- [ ] Toss/Stripe 결제 ($4/월 Pro 플랜)
- [ ] 캘린더 그리드 뷰
- [ ] 워터마크 제거 (Pro)
- [ ] 협찬 라벨 (광고 공정화법 대응)

---

## 배운 점 (progress.txt 발췌)

1. **gpt-image-1 URL 직접 입력 불가** — 서버에서 fetch → Buffer 변환 후 API 전달
2. **Kakao OAuth email null** — 개발 앱 미심사 계정은 email=null, fallback 필수
3. **html2canvas 서버 불가** — satori(@vercel/og) 사용
4. **middleware.ts 위치** — 프로젝트 루트, src/ 아님
5. **global-error.tsx** — error.tsx와 다름, html/body 래퍼 필요
6. **sessionStorage 동기 로드** — useState 초기값 함수로 처리 (useEffect setState 패턴 회피)
7. **eslint max-warnings=0** — tsc 통과만으로 검증 완료라 보고하지 말 것. lint도 게이트.

---

## 품질 지표

- 머스크 평가: **86/100 PASS**
- tsc, eslint, build, audit: 전부 PASS
- AI 슬롭: 0 (console.log, as any, TODO 없음)
- 17개 Next.js 라우트 빌드 성공

## 다음 단계

```
npm install
cp .env.example .env.local  (실제 키 입력)
# Supabase 마이그레이션 실행 후
npm run dev
```
