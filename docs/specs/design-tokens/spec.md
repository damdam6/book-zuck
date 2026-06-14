# Spec: 공용 디자인 토큰 (Design Tokens / Foundations)

> 상태: **Phase 0→1 — 디자인 전반에서 추출한 공용 스펙**. 구현 대상(= `src/index.css @theme` 확장).
> 출처 CSS: 발제 View(기본/확장, 토론/대입), 검색·책장 인덱스, 발제 등록 폼. 캔버스 **1440px** 고정.
> 선행: `styling-design-system`(브랜드 팔레트+shadcn 설치 완료), `book-agenda-view`(View 컴포넌트).
> 이 문서가 **토큰 SSOT**. 페이지/컴포넌트는 여기 토큰만 참조(생 hex 금지).

## Objective

여러 페이지 시안에서 반복되는 값(폰트·색·radius·간격·컴포넌트 치수)을 **공용 토큰**으로
정리·합리화해 구현 가능한 형태로 확정한다. 시안은 near-duplicate 값이 많아(특히 그레이),
**그대로 옮기지 않고 단계로 정규화**한다.

---

## 1. 🅰 폰트 (Font families)

시안에 5종 등장 → 역할 분리 + **통일 결정 필요**:

| 역할 | 폰트 | 용도 | 결정 |
|---|---|---|---|
| 본문/UI(한글) | **Pretendard** | 대부분의 한글 텍스트 | 설치됨 ✅ |
| 디스플레이(로고) | **Sankofa Display** | BUCKZUCK 로고 | 로고 전용, 추가 |
| 디스플레이(인용) | **Padauk** | 큰 따옴표 “ ”, 검색페이지 태그라인 | 추가 |
| 라틴/숫자 A | Work Sans | 책 제목(그리드)·날짜·태그라벨·칩 | ⚠️ 택1 |
| 라틴/숫자 B | Plus Jakarta Sans | 폼 라벨·버튼(등록)·탭 | ⚠️ 택1 |

> **결정 필요(OQ1):** Work Sans vs Plus Jakarta Sans — 라틴/숫자용 **하나로 통일** 권장.
> 또는 한글과 동일하게 Pretendard 숫자 사용. 디스플레이 2종(Sankofa/Padauk)은 로컬 호스팅/대체 확인.

## 2. ✍️ 타이포그래피 스케일 (named text styles)

| 토큰 | 폰트 | weight | size / line-height | 비고 |
|---|---|---|---|---|
| `title` (Header1) | Pretendard | 700 | 64 / 77, ls -0.02 | 책 제목 |
| `display-quote` | Padauk | 700 | 64 / 94 | 검색 태그라인 / 큰따옴표 70 |
| `heading` (Header2) | Pretendard | 600 | 37 / 44, ls -0.02 | 섹션명(발제문) |
| `subtitle` (Header3) | Pretendard | 300 | 37 / 44 | 저자 |
| `question` | Pretendard | 600 | 36 / 43 | 질문 제목, `text-strong` |
| `body-lg` (Header5) | Pretendard | 300 | 30 / 48 | 발췌/인용 본문 |
| `chat` | Pretendard | 500 | 22 / 32 | 채팅 메시지 |
| `label` (Paragraph2) | Pretendard | 300 | 20 / 24 | 일시/장소·저자(그리드)·페이지 ref |
| `value` (Paragraph1) | Work Sans* | 500 | 20 / 23 | 날짜·책제목(그리드)·태그라벨 |
| `caption` (Paragraph3) | Pretendard | 400 | 16 / 19 | select·자음필터·좋아요수 |
| `rating` | Pretendard | 500 | 18 / 22 | 평가 라벨 |
| `button` | Plus Jakarta Sans* | 500 | 25 / 150%, ls -0.02 | 등록 버튼 |
| `tab` | Plus Jakarta Sans* | 500 | 20 / 150% | 탭·폼 라벨 |
| `logo` | Sankofa Display | 400 | 30 / 150%, 기울임 | BUCKZUCK |

`*` = OQ1 통일 대상. → 코드엔 Tailwind `text-*` 커스텀 또는 `@theme --text-*`로 정의.

## 3. 🎨 색상 토큰

### 3-1. 브랜드/포인트 (기존 유지)
- `point` `#F83C00` — 강조·선택 링·좋아요·태그라인·검색 캐럿. **버튼 주색 아님**.
- 발제 tone(태그/시각화): red/green/yellow/blue + gray — `book-agenda-view` 매핑 참조.

### 3-2. ✅ 결정 — primary(액션)=검정, point(강조)=오렌지
역할이 다른 **두 색**으로 분리(확정):
- **`--primary` = `#000000`** — 주요 **액션** 버튼(등록·활성 탭·작성자 태그·예시폼 칩). shadcn `<Button>` 기본색.
- **`point` = `#F83C00`** — **강조/포인트**(선택 링·좋아요·태그라인·검색 캐럿). 버튼 주색 아님.

→ `styling-design-system`의 `--primary=#F83C00` → **`#000000`로 재매핑**, 오렌지는 `point`(기존 brand 토큰) 유지.

### 3-3. 중립(그레이) 램프 — near-duplicate 정규화
시안에 ~28종 그레이가 산재(거의 중복). **10단계로 정규화** 후 시안값을 근접 매핑:

| 토큰 | 값 | 흡수한 시안값 | 용도 |
|---|---|---|---|
| `white` | `#FFFFFF` | — | 카드/버블 bg |
| `neutral-50` | `#F3F3F3` | F0F0F0·F2F2F2·EAEAEA | 폼 필드·셀렉트·칩 bg |
| `neutral-100` | `#E6E6E6` | EAEAEA(search)·E6E6E6 | 스레드/검색 bg |
| `neutral-200` | `#D9D9D9` | D9D9D9·DBDBDB | placeholder 블록·스크롤바 |
| `neutral-300` | `#C4C4C4` | C5C5C5·C0C0C0·C1C0C0 | placeholder 텍스트·보더 |
| `neutral-400` | `#BEBEBE` | BABABA·B1B1B1·AEAEAE | 기본 태그 bg·약한 보더 (=brand gray-400) |
| `neutral-500` | `#9C9C9C` | A1A1A1·8F8F8F·8C8C8C | 보조 텍스트·아이콘·캐럿 |
| `neutral-600` | `#7B7B7B` | 828282 | 번호·뮤트 라벨 |
| `neutral-700` | `#555555` | 49454F | 본문 보조 (=brand gray-700) |
| `neutral-800` | `#353535` | 404040 | 강조 텍스트·태그 글씨·아이콘 |
| `black` | `#000000` | 0B0404·1A202C | 기본 텍스트·primary 버튼 |

> 시안의 `#49454F`는 Material on-surface-variant 기본값(검색바 아이콘 등) — neutral-700로 흡수.
> 정규화로 일부 미세 톤차 손실 허용. 디자이너 컨펌 시 단계 조정(OQ3).

### 3-4. tone 틴트(맥락별) — light/strong
같은 발제유형이라도 view/폼에서 노랑이 다름(`#FFE14E` vs `#FFEE97`, 글씨 `#DA9202` vs `#AC993A`).
→ tone별 **`-bg`(연한 면)/`-strong`(보더·강조)/`-text`(글씨)** 3스텝으로 정의, 맥락은 동일 토큰 재사용:

| tone | bg | strong | text |
|---|---|---|---|
| red(토론) | `#FFDADA` | `#FF7E7E` | `#970000` |
| green(대입) | `#D2E6B9` | `#9BC97E` | `#588B38` |
| yellow(확장) | `#FFF6CA`/`#FFED94` | `#FFE14E`/`#FFEE97` | `#D99101`/`#AC993A` |
| blue(이해) | `#C6E9F4` | `#7ACFEA` | `#1983AD` |
| gray(기본) | `#E6E6E6` | `#BEBEBE` | `#353535` |
| 인용 하이라이트 | `#FFF4BC` | — | — |

## 4. 📐 Radius 스케일
| 토큰 | 값 | 용도 |
|---|---|---|
| `radius-bar` | 5px | 스크롤바 |
| `radius-sm` | 8px | 필터 셀렉트 |
| `radius-md` | 10px | 폼 필드·버튼·카드 |
| `radius-lg` | 20px | 말풍선·인용박스·옵션행 |
| `radius-search` | 28px | 검색바 (≈full) |
| `radius-pill` | 30px | 태그/칩 |
| `radius-full` | 999px | 아바타·아이콘버튼 |

## 5. 📏 레이아웃 / 그리드
- 캔버스 **1440**, 좌우 마진 **135px** → 컨텐츠 폭 **≈1170px** (`container` max-width).
- **책 그리드**: 5열, 표지 185×277, 열 pitch 247(=185+62 gap), 행 pitch 481.
- 검색바 폭 720(min360/max720), 중앙. 헤더(GNB) 1440×102.
- 토큰화: `--container: 1170px`, `--page-margin: 135px`, `--book-cover: 185×277`, grid gap 62.

## 6. 📦 컴포넌트 치수 토큰
| 컴포넌트 | 치수 | radius |
|---|---|---|
| 태그/칩(pill) | h38(view) / h32(폼) | 30 |
| 버튼(primary) | h62, pad 0·20 | 10 |
| 탭 버튼 | h55 | 10 |
| 검색바 | h56 | 28 |
| 필터 셀렉트 | h39 | 8 |
| 폼 셀렉트/필드 | h47~55 | 10 |
| 아바타 | 49(헤더) / 39~44(군집) | full |
| 아이콘버튼 | 48(터치) / 40(컨테이너) | full |

---

## 7. 🧩 컴포넌트 인벤토리 — 페이지 추가분

`book-agenda-view` 스펙의 목록에 **검색/책장**과 **발제 등록**에서 나온 컴포넌트 추가.
(⭐=색/tone 가변 핵심, sc=shadcn)

### 검색 / 책장 인덱스
| 컴포넌트 | 역할·실측 | 구현 |
|---|---|---|
| `QuoteTagline` | 태그라인(Padauk 64, point색, 좌우 큰따옴표) | custom |
| `SearchBar` | 720×56 r28 bg neutral-100, leading 캐럿 + placeholder + trailing 검색아이콘 | sc input 기반 custom |
| `FilterSelect` / `SortSelect` ⭐ | 188×39 r8 bg neutral-50, 라벨+아이콘/캐럿 (사람필터·최신순) | sc select/dropdown |
| `ConsonantFilter` | ㄱ~ㅎ·Aa·1 자음 인덱스 바(545×39 r8) | custom |
| `BookCard` | 표지 185×277(보더/회전 변형) + 제목(value) + 저자(label) | custom |
| `BookGrid` | 5열 반응형 그리드(pitch 247×481) | custom layout |

### 발제 등록 폼
| 컴포넌트 | 역할·실측 | 구현 |
|---|---|---|
| `BookCoverUpload` | 빈 표지(neutral-300) + plus, 제목/저자 placeholder | custom |
| `SegmentedTabs` ⭐ | 3탭(리스트/등록/AI요약), 활성=black, h55 r10 | sc tabs 기반 |
| `QuestionListItem` ⭐ | 번호(neutral-600) + tone 틴트 카드 + 메뉴(dots) | custom |
| `AddButton` | 점선 보더(dashed neutral) + plus, 항목 추가 | custom |
| `FormPanel` ⭐ | tone 보더(3px, 예: `#FFEE97`) 박스, 폼 컨테이너 | custom |
| `ChipButton` | 검정 칩(예시폼 불러오기, r30) + tone 태그칩 | custom/sc badge |
| `FormSelect` | 질문/단일선택 드롭다운(neutral-50/F3F3F3 r10 + 캐럿) | sc select |
| `CategoryOptionRow` ⭐ | 아이콘+라벨 선택 행(공동체/사회/윤리/다른작품, h77 r10) | custom |
| `EditorToolbar` | 측면 첨부 툴(이미지/클립/인용, neutral-50 r10) + 미니 스크롤바 | custom |
| `PrimaryButton` ⭐ | 등록(검정 h62 r10) — **primary=black** | sc button(variant) |

### 전 페이지 공통(이미 식별)
`Header(GNB)` · `IconButton` · `ParticipantAvatar` · `AgendaTag` · `Divider` · `Collapsible` — `book-agenda-view` 참조.

## shadcn 추가 필요(누적)
`tabs`, `collapsible`, `separator`, `dropdown-menu`(또는 `select`), `input`. (button/card/badge 설치됨)

---

## 결정사항 (Resolved)
- **OQ1 폰트** → ✅ **이미지대로**. Work Sans·Plus Jakarta Sans **둘 다 유지**(맥락별 사용), 강제 통일 안 함. 서로 달라도 OK.
- **OQ2 primary** → ✅ **primary=검정(#000)**, point=오렌지(#F83C00) 분리(§3-2).
- **OQ4 tone** → ✅ **이미지대로**, view/폼 맥락 톤차 그대로 유지(서로 달라도 OK).
- **OQ3 그레이 램프** → ✅ 권장 정규화(10단계)는 **편의 기준**. 시안 정확값이 필요하면 그대로 사용 허용(이미지 우선).

## 남은 Open Questions
1. **반응형** — 1440 고정 → 모바일/태블릿 브레이크포인트 정책(미정).
2. **디스플레이 폰트** — Sankofa/Padauk 웹폰트 호스팅·대체 폰트 확보.

## 다음 단계
본 토큰을 `@theme`에 구현: typography `--text-*`, neutral ramp, radius 스케일, **primary=black 재매핑**(point 유지),
디스플레이/라틴 폰트 등록 → 그 위에 컴포넌트(§7) 개발.
