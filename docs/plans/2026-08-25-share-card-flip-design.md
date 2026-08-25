# 공유 카드 뒤집기·아이템 상세 설계

## 목표

공유 페이지의 OOTD 카드를 앞·뒷면으로 뒤집을 수 있게 한다. 앞면은 기존 생성 카드 이미지를 유지하고, 뒷면은 착장을 구성하는 아이템 이름을 탐색 가능한 카드 목록으로 보여준다. 아이템 이름을 선택하면 공개 가능한 개별 이미지와 분류 정보를 모달에서 확인할 수 있어야 한다.

## 구조

- 공유 페이지는 Server Component로 유지해 공개 레코드 조회, OG 메타데이터, 아이템 private path의 단기 signed URL 발급을 서버에서 처리한다.
- 3D 회전과 선택 상태만 `ShareFlipCard` Client Component로 분리한다.
- 카드 앞면과 뒷면은 같은 2:3 영역에 겹치고 `backface-visibility`, `transform-style: preserve-3d`, `rotateY(180deg)`로 전환한다.
- 앞면 전체와 별도 뒤집기 버튼은 모두 키보드로 조작 가능하게 한다. `aria-pressed`, 동적 레이블, `prefers-reduced-motion` 대응을 포함한다. 숨은 면은 `inert`로 격리하고 전환 뒤 보이는 면으로 포커스를 옮긴다.
- 뒷면 아이템 이름은 `product_name`, `style_description`, 한국어 카테고리 순으로 fallback한다. 중복 이름도 각 DB item id를 key로 유지한다.
- 아이템 모달은 기존 native `<dialog>` 기반 `Modal`을 재사용하고 공개 응답에 포함된 `image_url`만 표시한다. crop 이미지는 공개하지 않는다.

## 화면 계약

- 앞면: 기존 카드 이미지, “아이템 보기” affordance.
- 뒷면: Outfit Items 제목, 아이템별 번호·이름·카테고리 버튼, “앞면으로” 버튼.
- 모달: 이미지 또는 이미지 준비 중 placeholder, 표시명, 카테고리, 색상, 브랜드, 제품명, 스타일 설명.
- 기존 하단 아이템 상세 목록은 뒷면/모달과 중복되므로 제거한다. 스타일 요약, 해시태그, 날짜, CTA는 유지한다.
- 아이템이 없으면 뒷면에 안내 문구를 표시하고 flip 자체는 정상 동작한다.

## 검증

- 표시명 fallback과 상세 필드 생성 단위 테스트.
- 아이템 누락 필드·긴 설명·이미지 없음에 대한 렌더 fallback.
- TypeScript, ESLint, production build.
- 공유 페이지 공개 데이터 범위와 외부 링크/이미지 보안 재검토.
- 운영 공유 URL에서 앞·뒷면 전환, 모달 열기·닫기, 모바일 레이아웃 확인.
