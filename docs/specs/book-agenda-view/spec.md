# Spec: 책별 발제 View — 공통 컴포넌트 리스트업

> 상태: **Phase 0 — 컴포넌트 리스트업** (실측값 반영, props 시그니처는 Phase 1).
> 출처: 디자인 시안 2종 CSS — "모임등록 뷰어_상세보기"(기본/확장), "...상세보기2"(토론/대입).
> 대상 페이지: `/books/:bookId/agenda` (`src/pages/BookAgenda/`).
> 기준 캔버스: **1440px** width (좌우 컨텐츠 마진 135px, 컨텐츠 폭 ≈ 1170px).

## Objective

발제 상세 화면을 **공통(재사용) 컴포넌트**로 분해·목록화한다. CSS 2종 대조로 수치·색을
실측 반영했다. props 시그니처와 상태(state)는 다음 단계.

## 🔑 핵심 발견 — "발제 유형(tone)이 색과 레이아웃을 모두 결정"

각 발제 질문(섹션)은 **유형 태그**(기본/토론/대입/확장/이해)를 가지며, 그 유형 하나가
→ ① 태그 색 ② 스레드/섹션 배경 틴트 ③ 인용 박스 틴트 ④ 패널 보더 ⑤ **참여자 의견
시각화 레이아웃**까지 전부 결정한다. 두 시안을 대조하면 규칙이 일관된다:

| 유형 | tone | 태그 bg / 글씨·아이콘 | 태그 아이콘 | 스레드 배경 | 인용 박스 / 따옴표 | 패널 보더 | 시각화 레이아웃 |
|---|---|---|---|---|---|---|---|
| 기본 | gray | `#BEBEBE` / `#353535` | badge-check | `#E6E6E6` | — | — | **수직 평가축** 4단계(완전좋아요~별로에요) |
| 토론 | red | `#FF7E7E` / `#970000` | bolt | `#FFDADA` | (red 계열) | red | **양극 스펙트럼**(예: 지수 ↔ 레이첼) |
| 대입 | green | `#D2E6B9` / `#588B38` | heart | (green) | `#D2E6B9` / `#588B38` | `4px #D2E6B9` | **3점 척도 스펙트럼**(희망없다~보통~희망적) |
| 확장 | yellow | `#FFE14E` / `#DA9202` | globe-alt | `#FFED94` | `#FFF4BC` / `#FFE14E` | `4px #FFE14E` | **카테고리 군집 + 탭바**(공동체/사회/…) |
| 이해 | blue | (시안 없음·추정) | — | (blue) | (blue) | blue | (추정) |

> ⇒ 모든 색 가변 컴포넌트는 `tone` prop(=발제 유형) 하나를 받아 위 매핑을 적용한다.
> 매핑 테이블은 코드에 **단일 SSOT**(예: `agendaTone.ts`)로 두고 컴포넌트가 참조.
> 색은 컴포넌트 내부 하드코딩 금지 — `tone`→토큰 해석만.

## 🎨 팔레트 갭 (styling-design-system 보강 필요)

CSS에 **기존 브랜드 팔레트에 없는 색**이 다수 등장. 토큰 추가 검토:

- **그레이 확장:** `#353535`(태그/라벨 글씨), `#404040`(질문 제목), `#9C9C9C`(쉐브론/내보내기),
  `#C1C0C0`(구분선), `#E6E6E6`(기본 스레드 bg). 현재 gray-700=#555555보다 어두운 단계 필요.
- **인용 틴트:** `#FFF4BC`(확장 인용 bg), `#FFF8A8`(이미 yellow-200).
- **프로필(참여자) 색 세트** — 팔레트와 일부 겹치나 별도 세트:
  `#FFB5B5`(red, 신규), `#0B0404`(near-black), `#FFFFFF`, `#DAC3F4`(purple-300), `#C6E9F4`(blue-100),
  `#D2E6B9`(green-100), `#FAF4B0`(신규 연노랑), `#A9B3E8`(indigo-300), `#FFA77B`(coral-300).
- 확장 글씨 `#DA9202` ≈ 기존 yellow-700 `#D99101` (사실상 동일, 통일 권장).

## ✍️ 타이포그래피 (실측) — 폰트 4종 필요

| 용도 | 폰트 | weight / size / line-height |
|---|---|---|
| 책 제목 | Pretendard | 700 / 64 / 77, ls -0.02em |
| 저자 | Pretendard | 300 / 37 / 44 |
| 섹션명(발제문) | Pretendard | 600 / 37 / 44 |
| 질문 제목 | Pretendard | 600 / 36 / 43, `#404040` |
| 본문/인용 | Pretendard | 300 / 30 / 48 |
| 채팅 메시지 | Pretendard | 500 / 22 / 32 |
| 라벨(일시/장소/참여자) | Pretendard | 300 / 20 / 24 |
| 값(날짜·태그라벨·좋아요수·p.137) | **Work Sans** | 500/400 / 16~20 |
| 로고(BUCKZUCK) | **Sankofa Display** | 400 / 30, 살짝 기울임(matrix) |
| 큰 따옴표 “ | **Padauk** | 700 / 70 |

> 현재 Pretendard만 설치됨. **Work Sans / Sankofa Display / Padauk 추가** 필요(또는 대체).
> Open Question: Work Sans(숫자/태그라벨)를 Pretendard로 통일할지 디자이너 확인.

---

## 컴포넌트 목록 (실측 반영)

표기: **shadcn** = shadcn/ui 충당, **custom** = 직접. ⭐ = 색/레이아웃 가변 핵심.

### A. 레이아웃 / 글로벌
| # | 컴포넌트 | 실측·역할 | 구현 |
|---|---|---|---|
| A1 | `Header(GNB)` | 1440×102, BUCKZUCK 로고(Sankofa, 2줄 겹침) + 우측 프로필/내보내기 | 기존 `TheHeader` 확장 |
| A2 | `IconButton` | 공유 버튼: 66px 원 `#F0F0F0` + share 아이콘 | shadcn Button(size=icon) |
| A3 | `ExportDropdown` ⭐ | PDF/JPG/PNG/Word 선택(헤더 8px radius, 항목 39px, top border `#C4C4C4`) | shadcn (add dropdown-menu/select) |
| A4 | `ScrollIndicator` | 우측 페이지 점(`#000` 26px) + 영역 내부 커스텀 스크롤바(5px `#D9D9D9` r5) | custom |

### B. 책 헤더
| # | 컴포넌트 | 실측·역할 | 구현 |
|---|---|---|---|
| B1 | `BookCover` | 185×277 이미지 + 하단 수상/페스티벌 칩 | custom |
| B2 | `BookMetaHeader` | 제목(64) + 저자(37) + 공유 액션 묶음 | custom 조합 |
| B3 | `InfoRow` | 아이콘(캘린더/핀, ~25px) + 라벨(300/20) + 값(Work Sans/20) | custom |
| B4 | `AvatarGroup` | 참여자 49px 원 가로 나열(간격 ~64px) + 라벨 people 아이콘 | custom |
| B5 | `ParticipantAvatar` ⭐ | 49px 원, `color` bg, 선택 시 `5px #F83C00` 링, white는 `1px #C0C0C0` 보더; 군집용 39px 변형 | custom |

### C. 발제 섹션 (유형별 tone 적용)
| # | 컴포넌트 | 실측·역할 | 구현 |
|---|---|---|---|
| C1 | `SectionHeader` | book 아이콘(45) + "발제문"(600/37) | custom |
| C2 | `AgendaTag` ⭐ | pill 109×38, radius 30, 아이콘+라벨(Work Sans 20), `tone`별 bg/글씨/아이콘 | shadcn Badge 확장 |
| C3 | `QuestionBlock` | 번호+질문(600/36 `#404040`) + 태그 + 본문 + 하단 collapse 쉐브론 | custom |
| C4 | `OpinionViz` ⭐ | **유형별 시각화 컨테이너** (아래 4 레이아웃 분기) | custom |
| C4a | `RatingColumn` | 기본: 세로 4단계(표정 아이콘 40 + 라벨) + 세로축선, 단계별 `#D9D9D9` blob(r30)에 토큰 | custom |
| C4b | `SpectrumBar` | 토론/대입: 양끝/3점 라벨 + 가로 축, 반투명 틴트 blob(r200, `mix-blend:multiply`) 겹침 + 토큰 | custom |
| C4c | `CategoryCluster` | 확장: 회전된 `#FFF4BC` blob(r30) 산포 + 토큰 | custom |
| C5 | `CategoryTabBar` | 확장 하단: 상단 구분선 + 아이콘+라벨 6탭(공동체/사회/윤리/미래/시스템/다른작품) | shadcn (add tabs) |
| C6 | `TokenCluster`(Blob) | 토큰 N개 담는 둥근 blob, `tint`·형태 가변 (C4 하위 공용) | custom |

### D. 코멘트 / 채팅
| # | 컴포넌트 | 실측·역할 | 구현 |
|---|---|---|---|
| D1 | `CommentThread` | `tone` 배경 틴트(예 `#FFDADA`/`#E6E6E6`)·722px 영역·내부 스크롤·하단 collapse | custom + shadcn Collapsible |
| D2 | `ChatBubble` ⭐ | 흰 말풍선(r20) + 꼬리(Polygon) + 작성자 색 태그(r `0 20 20 0`) + 메시지(500/22) | custom |
| D3 | `AuthorTag` ⭐ | 작성자 색 라벨(우영=`#0B0404`/흰글씨, 수빈=green·blue/색글씨) — `color`(필수) | custom |
| D4 | `LikeButton` | 하트(채워짐 `#F83C00` point / 빈 `#A3A3A3`) + 카운트(16) | custom |
| D5 | `Collapsible` / `CollapseChevron` | 19×8 쉐브론(`#9C9C9C`) 펼치기/접기 | shadcn (add collapsible) |

### E. 인용 / 하이라이트
| # | 컴포넌트 | 실측·역할 | 구현 |
|---|---|---|---|
| E1 | `OutlinedPanel` | 인용 섹션 박스, `tone` 보더(`4px #FFE14E`/`#D2E6B9`) | custom |
| E2 | `ExcerptText` | 발췌 본문(300/30/48) + 우측 페이지 ref(`p.137`) | custom |
| E3 | `QuoteBlock` ⭐ | `tone` 틴트 bg(r20) + 큰 따옴표(Padauk 70, `tone`색) + 본문 + 페이지 | custom |
| E4 | `Divider` | 인용 사이 구분선(0.5px `#000`), 탭바 위 2px `#C1C0C0` | shadcn (add separator) |

### F. 보조
| # | 컴포넌트 | 역할 | 구현 |
|---|---|---|---|
| F1 | `Icon` | lucide 우선; 시안은 heroicons/akar/ion/boxicons 혼용 → lucide 대응 매핑 필요 | lucide-react |

---

## ⭐ 우선 설계 핵심
`tone` 시스템(`agendaTone.ts` SSOT) → `AgendaTag` · `ParticipantAvatar` · `ChatBubble`/`AuthorTag`
· `QuoteBlock`/`OutlinedPanel` · `OpinionViz`(4 레이아웃). 이 축들이 색·레이아웃을 prop으로 받아 재사용.

## shadcn 추가 필요
`badge`(확장), `tabs`, `collapsible`, `separator`, `dropdown-menu`(또는 `select`).
(Button/Card/Badge 설치됨)

## Open Questions / 다음 단계
1. **이해(blue) 유형** 시안 없음 — tone 매핑·시각화 레이아웃 확정 필요.
2. **OpinionViz 데이터 모델** — 평가축/스펙트럼/카테고리 각 입력 스키마와 토큰 배치 규칙(좌표 vs 자동 패킹).
3. **폰트 정책** — Work Sans/Sankofa/Padauk 실제 도입 vs Pretendard 통일.
4. **팔레트 보강** — 추가 그레이·인용 틴트·프로필 색 세트를 `styling-design-system @theme`에 반영.
5. **반응형** — 시안은 1440 고정. 모바일/축소 대응 범위.
6. **아이콘 매핑** — 시안의 heroicons/akar/ion/boxicons → lucide 1:1 매핑표.
7. **파일 위치** — 도메인 컴포넌트는 `src/components/agenda/`, 순수 UI는 `src/components/ui/`(shadcn) 분리 제안.
8. **props 시그니처 확정**(Phase 1) — `tone` 타입을 발제 유형 enum과 일치.
