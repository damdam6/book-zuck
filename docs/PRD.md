# 북적북적(BUCKZUCK) PRD — 페이지 단위 개발

> 버전: v1.1 (2026-09-24) · 상태: **초안 — 검토 대기** (OQ4 확정 반영)
> 작성 기준: Claude Design 프로토타입 「독서모임 웹사이트 프로토타입」 `Buckzuck Bookclub.dc.html`
> (https://claude.ai/design/p/05aa83a2-ccea-43cf-a18c-b01aa0c7d212?file=Buckzuck+Bookclub.dc.html)
> 스냅숏: `docs/design/buckzuck-bookclub.dc.html` · 로고 원본: `src/assets/brand/logo.svg`
> 선행 스펙: `docs/specs/styling-design-system`, `docs/specs/design-tokens`, `docs/specs/book-agenda-view`,
> `docs/specs/page-based-folder-structure`, `docs/specs/audio-upload-transcribe-store`

---

## 1. 개요

### 1-1. 제품 한 줄 정의
북적북적은 **독서 모임 커뮤니티 웹사이트**다. 모임에서 함께 읽은 책을 **책장**에 쌓고, 책마다
**발제**(토론 질문)를 등록·공유하며, 모임이 끝나면 **기록**과 **별점**을 남긴다. 모임 녹음을
올리면 한국어로 전사해 기록에 붙일 수 있다.

### 1-2. 이번 PRD의 목표
- Claude Design 프로토타입의 4개 화면(home / list / club / my)을 **페이지 단위**로 개발할 수
  있도록 요구사항을 확정한다.
- 이미 구축된 디자인 토큰·shadcn 기반·라우팅 스캐폴딩·인증·전사 파이프라인 위에 **실제 화면과
  데이터 연동**을 얹는다.
- 페이지마다 독립된 스펙(`docs/specs/<page>/spec.md`)을 만들 수 있게 **범위·우선순위·수용 기준**을
  정한다.

### 1-3. 비목표 (이번 범위 밖)
- **Club(모임) 페이지의 세부 설계.** 프로토타입에 있는 만큼만 기술하고, 모임 등록 시스템·보여주기
  시스템 등은 해당 페이지 개발 시점에 별도 스펙으로 구체화한다(§7-4).
- 다크 모드, 다국어, SEO(SPA 유지), 알림, 소셜 공유의 실제 동작(버튼 자리만 확보).
- 발제 상세의 토론 시각화(OpinionViz) — `book-agenda-view` 스펙에서 별도 진행.

### 1-4. 현재 코드 상태 (2026-09-07 main 기준)
| 영역 | 상태 |
|---|---|
| 스택 | Vite 6 · React 19 · TS · Tailwind v4 · shadcn/ui · Supabase · Cloudflare Workers |
| 라우팅 | `/`, `/bookshelf`, `/books/:bookId/agenda`, `/agenda/new`, `/my`, `/stt` — 모두 placeholder |
| 디자인 토큰 | 브랜드 팔레트·neutral 램프·타이포 `text-*`·radius·폰트 4종 `@theme` 등록 완료 |
| 인증 | Supabase Auth 구글 로그인, `useAuth`, `TheHeader`/`ProfileModal` |
| 데이터 | `books`(id, title, author, created_at), `transcriptions` 테이블만 존재 |
| 전사 | R2 업로드 → Edge Function → RTZR → `transcriptions` 저장, `/stt` 임시 화면 |

---

## 2. 사용자와 핵심 시나리오

**대상 사용자:** 소규모 독서 모임 멤버(수 명~십수 명). 모임 리더 1명이 책·일정을 잡고 발제를
올리며, 나머지 멤버는 발제를 보고 참여한 뒤 기록을 남긴다.

| # | 시나리오 | 관련 페이지 |
|---|---|---|
| S1 | 홈에서 지금까지 읽은 책들이 책장에 꽂힌 모습을 훑어보고, 책등을 눌러 그 모임의 발제를 미리 본다 | Home |
| S2 | 책장에서 연도·장르·검색으로 책을 찾고, 내가 참여한 모임만 걸러본다 | 책장 |
| S3 | 모임 페이지에서 일시·장소·참여자·발제·기록·평점을 한눈에 본다 | Club |
| S4 | 모임이 끝난 뒤 한 줄 기록과 별점을 남긴다 | Club |
| S5 | 마이페이지에서 다음 모임, 내가 읽은 책, 내가 남긴 기록을 본다 | My |
| S6 | 리더가 새 발제를 등록한다 | 발제 등록 |
| S7 | 모임 녹음을 올려 전사 결과를 기록에 붙인다 | Club / STT |

---

## 3. 용어 (Ubiquitous Language)

기존 `CONTEXT.md` 용어(Book, Bookshelf, Agenda, Transcription, Utterance)는 그대로 쓴다.
프로토타입에서 새로 드러난 개념은 아래처럼 정의하고, 확정 시 `CONTEXT.md`에 승격한다.

| 용어 | 한글 | 정의 | 피할 말 |
|---|---|---|---|
| **Club** | 모임 | 한 **Book**을 읽고 모이는 **1회의 모임**. 일시·장소·참여자·발제·기록·평점을 가진다. 프로토타입에서는 Book:Club = 1:1 | Meeting, Session, Event |
| **Participant** | 참여자 | Club에 참여한 사용자. 첫 번째 참여자가 **리더**(발제자)이며 아바타에 point 링이 붙는다 | Member(모임 전체 멤버와 혼동) |
| **Note** | 기록 | Club이 끝난 뒤 Participant가 남기는 한 줄 소감. 별점(**Rating**)과 함께 저장된다 | Review, Comment |
| **Rating** | 평점 | Note에 붙는 1~5 별점. Club 평점 = Note 별점 평균 | Score |
| **Spine** | 책등 | 책장에 꽂힌 상태의 Book 표현. 표지 이미지가 있으면 표지, 없으면 색 + 세로 제목 | Card(펼친 상태와 구분) |
| **Sticker** | 스티커 | 홈 히어로의 테이프 붙은 메모(발제/책장) — CTA 역할 | Badge |
| **Glyph Drop** | 떨어지는 글자 | 홈에서 위에서 떨어져 책등에 튕기고 바닥선에 멈추는 Sankofa Display 글자 장식 | Scribble, Doodle |

> ⚠️ 기존 `CONTEXT.md`는 "Agenda는 항상 특정 Book에 속한다"고 정의한다. 프로토타입은 발제를
> Club에 붙인다. Book:Club이 1:1인 동안은 충돌이 없지만, 1:N이 되면 **Agenda의 소속(Book vs
> Club)** 을 다시 결정해야 한다(§11 OQ2).

---

## 4. 브랜드·디자인 원칙

프로토타입은 Noto Sans KR·Major Mono·Nanum Pen Script와 임의 hex로 그려졌다. 구현은 **기존
토큰 SSOT(`design-tokens` 스펙, `src/index.css @theme`)** 를 기준으로 아래 매핑을 따른다.
컴포넌트 안에 생 hex를 쓰지 않는다.

### 4-1. 로고 (확정)
- 헤더 로고는 **제공된 SVG**를 쓴다: `src/assets/brand/logo.svg` (viewBox 0 0 107 51, path 2개,
  fill black). 2줄 구성이며 프로토타입의 `BUCKZUCK<br>BUCKZUCK` 텍스트를 대체한다.
- 기본 표시 크기 107×51 (헤더), 축소 시 비율 유지. `fill`은 `currentColor`로 바꿔 검정 이외
  맥락(예: 붉은 책등 위)에서도 쓸 수 있게 한다.
- 로고와 떨어지는 글자는 원래 **폰트 기반**이다. 원 타이포 사양:
  `font-family: Sankofa Display; weight 400; size 120px; line-height 150%; letter-spacing -3%;
  vertical-align middle`. 로고는 SVG(아웃라인)로 고정하고, 떨어지는 글자는 **실제 텍스트**로
  렌더링한다(§7-1).

### 4-2. 폰트
| 역할 | 프로토타입 | 구현 토큰 | 비고 |
|---|---|---|---|
| 본문/UI(한글) | Noto Sans KR | `--font-sans` (Pretendard) | 확정 |
| 로고 | Major Mono Display | SVG 로고 | 확정 |
| 떨어지는 글자 | SVG 도형 | `--font-sankofa` 120px | 확정(사용자 지정) |
| 손글씨 제목(책장/발제/모임 기록/내 책장/다음 모임/모바일 탭) | Nanum Pen Script | **신규 `--font-hand`** | ⚠️ OQ3 — Figma 토큰 스펙에 없음. 유지 권장 |
| 라틴/숫자(날짜·라벨) | Noto Sans KR | `--font-work` | design-tokens 결정 유지 |
| 책등 장식 문구 | Georgia | `--font-work` | 장식용, 자유 |

### 4-3. 색
| 역할 | 프로토타입 | 구현 토큰 | 비고 |
|---|---|---|---|
| 포인트(활성 탭·번호·별·"다음 모임"·체크박스) | `#E8412F` | `orange-500` = **`#E8412F`** (point) | ✅ OQ4 확정 — 프로토타입 값 채택 |
| 코랄(스티커·평점 배너·아바타·책등) | `#F5A08A` | `coral-300` `#FFA77B` | |
| 주요 액션(로그인 버튼·활성 칩·발제 스티커) | `#111` | `--primary` = black | design-tokens 확정 |
| 바닥선(책장 선반) | `#1a1a1a` 12px | `black` | |
| 호버 틴트(다음 모임 카드) | `#fbe9e5` | `orange-500/10` | |
| 회색 책등·placeholder | `#6f6f6f`~`#e9e9e9` | `neutral-50`~`neutral-800` | 근접 단계로 |
| 보더(입력·칩·구분선) | `#111`, `#ccc`, `#ddd` | `black`, `neutral-300`, `neutral-200` | |

**참여자 색 세트(9색)** — 프로토타입 팔레트와 `book-agenda-view`의 프로필 색이 1:1로 대응한다.
토큰 `participant-1..9`로 등록: `coral-300`, `black`, `white`, `purple-300`, `blue-100`,
`green-100`, 연노랑 `#FAF4B0`(신규), `indigo-300`, 핑크 `#FFB5B5`(신규). white는 `1px neutral-300`
보더, 리더는 `5px orange-500` 링(프로토타입 3px → Figma 5px 채택).

> **포인트 색 확정(OQ4):** 프로토타입 값 **`#E8412F`** 를 채택한다. 기존 토큰
> `--color-orange-500: #f83c00`(`src/index.css`)의 **값만 `#e8412f`로 교체**하고 토큰 이름은
> 유지한다. 두 색이 근접해 나란히 두면 `design-tokens` 스펙이 정리한 near-duplicate 문제가
> 다시 생기므로 별도 토큰을 추가하지 않는다. 이 교체로 `design-tokens` §3-1의 `point`,
> `book-agenda-view`의 선택 링 `5px #F83C00`, 좋아요 아이콘, 검색 캐럿이 모두 함께 따라온다.
> 두 스펙 문서의 hex 표기도 M0에서 같이 갱신한다. (작업 항목: M0)

### 4-4. 형태·모션
- 책등: radius 2px, `inset -3px 0 6px rgba(0,0,0,.12)` 그림자, hover `translateY(-14px)` 0.2s.
- 스티커: 회전(-8°/4°/-2°/1.5°/-0.6°) + 상단 테이프(`rgba(160,200,230,.7)`) + 드롭 섀도.
- 모든 애니메이션은 `prefers-reduced-motion`에서 꺼진다(떨어지는 글자는 최종 위치에 바로 놓임).

### 4-5. 반응형 (기존 OQ "반응형 미정" 해소)
| 구간 | 기준 | 동작 |
|---|---|---|
| mobile | `< 720px` | 헤더 nav 숨김, **하단 탭바** 표시, 히어로 축소, 카드 세로 배치 |
| compact | `720 ~ 1099px` | 히어로 `scale(0.55~0.85)` |
| desktop | `≥ 1100px` | 히어로 원본 크기 |
| wide | `≥ 1200px` | 히어로 우측 책등 묶음 추가 표시 |
| max | `1440px` | 컨테이너 최대 폭(중앙 정렬, `0 0 0 1px #eee` 테두리) |

---

## 5. 정보 구조와 라우팅

| 페이지 | 라우트 | 프로토타입 화면 | 파일 | 우선순위 | 비고 |
|---|---|---|---|---|---|
| 공통 셸 | — | header / 하단 탭 | `src/components/layout/` | **P0** | 로고·nav·로그인·탭바 |
| Home | `/` | `home` | `src/pages/Home/` | **P1** | 히어로 + 가로 책장 + 장식 |
| 책장 | `/bookshelf` | `list` | `src/pages/Bookshelf/` | **P1** | 검색·필터·그리드 |
| 마이 | `/my` | `my` | `src/pages/My/` | **P2** | 로그인 필수 |
| Club(모임) | `/clubs/:clubId` (제안) | `club` | `src/pages/Club/` | **P3 — 디벨롭 필요** | 라우트는 스펙 시 확정 |
| 발제 등록 | `/agenda/new` | (없음) | `src/pages/AgendaNew/` | P3 | `design-tokens` §7 폼 컴포넌트 참조 |
| 책별 발제 view | `/books/:bookId/agenda` | (없음) | `src/pages/BookAgenda/` | P4 | `book-agenda-view` 스펙(tone·OpinionViz) |
| 로그인 | 헤더 버튼(모달 없음) | header | `TheHeader` | P0 | 구글 OAuth, 기존 유지 |
| STT 임시 | `/stt` | (없음) | `src/AudioStt.tsx` | 유지 | Club 기록에 연결 후 제거 |

**내비게이션 흐름**
- 로고 → Home. 헤더 nav `책장` → `/bookshelf`, `마이페이지` → `/my` (활성: point 색 + 2px 밑줄).
- Home 스티커 `발제` → 책장 섹션으로 스크롤, `책장` → `/bookshelf`.
- 책등 클릭 → (설정 `clickBehavior=expand`) 펼침 카드 → 한 번 더 클릭 → Club. `direct`면 바로 Club.
- 책장 카드·내 책장 책등·다음 모임 카드·내 기록 행 → Club.
- Club `← 책장으로` → `/bookshelf`.

---

## 6. 공통 셸 (P0)

### 6-1. 헤더 (GNB)
- 좌: 로고 SVG(클릭 → `/`). 우: nav(책장, 마이페이지 — 데스크톱만) + 로그인 버튼.
- 로그인 버튼: `primary`(검정) r4, 11×18 패딩, 14px 500, 최소 높이 44. 클릭 → 구글 OAuth.
- 로그인 상태: 버튼 자리에 아바타(48 원형) + 이름, 클릭 → `ProfileModal`(마이페이지·로그아웃).
  `ProfileModal`의 `마이페이지` 버튼은 `/my`로 이동해야 한다(현재 미연결).
- 패딩 `clamp(16px,3vw,28px) clamp(20px,4vw,32px)`, 컨테이너 최대 1440.

### 6-2. 모바일 하단 탭바 (`< 720px`)
- fixed bottom, 3열(홈/책장/마이), 높이 64, 상단 1px 검정 보더, safe-area 패딩.
- 라벨 `--font-hand` 28px + 6px 점 인디케이터. 활성 = point 색.
- 본문 `padding-bottom: 64px` 확보.

### 6-3. 인증 정책
- Home·책장·Club은 **비로그인 열람 가능**(⚠️ OQ10). 마이·기록 남기기·발제 등록·전사는 로그인 필수.
- 로그인 필요 동작을 비로그인 상태에서 누르면 구글 로그인으로 유도한다.

### 6-4. 수용 기준
- [ ] 5개 라우트 모두 동일한 헤더가 뜨고, 로고 클릭 시 홈으로 간다.
- [ ] 720px 미만에서 nav가 사라지고 탭바가 뜨며 현재 탭이 point 색으로 표시된다.
- [ ] 로그인/로그아웃 후 헤더가 즉시 갱신된다(`onAuthStateChange`).

---

## 7. 페이지별 요구사항

### 7-1. Home (`/`) — P1

**목적:** 브랜드 첫인상 + "책장이 쌓이는" 느낌. 최근 모임 책들을 가로 책장으로 훑고 바로 발제를
미리 본다.

**레이아웃(위→아래)**
1. **히어로 책장** — 좌측 책등 묶음(700×580 기준, 6권: 회색 4단계 + 흰색 + 붉은 `point` 책등),
   붉은 책등 위에 검정 북마크 탭과 **스티커 2장**:
   - `발제`(검정 140×100, -8°, 손글씨 54px) → 책장 섹션으로 부드럽게 스크롤
   - `책장`(흰색 110×110, 4°, 손글씨 50px, 하단 point 밑줄) → `/bookshelf`
   우측(wide만) 코랄 `BZBZ` 책등 + 회색 책등. 아래 **바닥선** 12px 검정(wide는 260px 간격 2분할).
2. **떨어지는 글자(Glyph Drop)** — 히어로와 하단 장식 섹션 위에 절대 배치 레이어.
   - 글자: `BUCKZUCK`에서 뽑은 글자 4개(히어로) + 3개(하단), `--font-sankofa` **120px, 400,
     line-height 150%, letter-spacing -3%**, 색은 point·초록 `#1f8a1f`·노랑 `#F2C400`·남색
     `#1d2a7a` 순환(⚠️ OQ5: 글자·색 확정).
   - 물리: 위에서 낙하(중력 0.55/프레임), 책등(`data-ob`)에 닿으면 옆으로 튕기고, 바닥선
     (`data-floor`)에서 감쇠 후 정지(±3° 기울기). 책등 사이에 6회 이상 끼면 앞으로 빼서 떨어뜨림.
   - 화면 밖으로 나가면 제거. Home 진입/재진입 시 0.4s 후 재생. 옵션 `scribbles`(표시 여부),
     `dropAnimation`(애니메이션 여부, reduced-motion이면 false).
3. **가로 책장** — 좌우 원형 버튼(48, 반투명 흰 + blur) + 스크롤 컨테이너(스크롤바 숨김).
   - 책은 **날짜 오름차순**, 간격 120(모바일 40), 최소 높이 640(모바일 380).
   - **책등(접힘)**: 폭 44~66(책마다), 높이 540 + (제목 길이 % 3)×30(모바일 320 + …×26),
     세로 제목 20px 700 / 저자 11px / 출판사 9px, hover -14px.
   - **카드(펼침)**: 760×620(모바일 300, 세로), 표지 380px 영역(표지 이미지, 없으면 사선 패턴 +
     세로 제목 64px) + 우측: 제목 32px, 날짜, `저자 · 출판사`, 발제 5개(번호 point, 한 줄 말줄임),
     하단 `참여 n명 · 장소` + `한 번 더 누르면 모임 기록으로 →`. 펼치면 카드가 가로 중앙, 세로로
     화면 안에 들어오도록 스크롤. 카드 클릭 → Club.
   - 바닥선 12px, 좌측 33% 들여쓰기(모바일 0).
4. **하단 장식** — WELCOME 아웃라인 책등, 코랄 `DOKSEO ARCHIVE`, 회전 회색 책등(데스크톱만),
   중앙 알약형 placeholder 4개 + 코랄 스티커(그림자 `12px 14px 0 neutral-600`). 순수 장식, 데이터
   없음. 두 번째 Glyph Drop 레이어의 바닥은 섹션 하단.

**데이터:** `clubs` + `books` 조인(제목·저자·출판사·표지·일시·장소·참여 수·발제 5개). 비로그인
도 열람.

**상태:** 로딩 — 책등 자리에 회색 스켈레톤 8개. 빈 상태 — 책장에 점선 책등 1개 + "첫 모임을
등록해 보세요". 에러 — 인라인 메시지 + 다시 시도.

**수용 기준**
- [ ] 로고 SVG가 헤더에 뜨고 스티커 2개가 각각 스크롤/이동한다.
- [ ] 글자 4+3개가 Sankofa Display 텍스트로 떨어져 책등에 튕기고 바닥선에 멈춘다.
      reduced-motion에서는 즉시 바닥에 놓인다.
- [ ] 책등 클릭 → 카드 펼침 → 카드 클릭 → Club 이동. 좌우 버튼으로 뷰포트 60%씩 스크롤.
- [ ] 720px 미만에서 카드가 세로 배치되고 히어로가 축소된다.
- [ ] `pnpm build`·`pnpm lint` 통과.

### 7-2. 책장 (`/bookshelf`) — P1

**목적:** 지금까지 함께 읽은 모든 책을 찾고 걸러본다.

**레이아웃**
1. 제목 `책장`(`--font-hand` 52~72px) + `지금까지 함께 읽은 N권`(15px neutral-600).
2. **필터 바**(하단 1px 검정 보더): 검색 입력(1px 검정 보더, r4, 최소 높이 44, placeholder
   "책 제목, 저자, 장소 검색") · 연도 칩(전체 + 연도 내림차순) · 구분선(데스크톱) · 장르 칩(전체 +
   장르) · 우측 체크박스 `내가 참여한 모임만`(accent point). 칩: 1px 검정 보더, pill, 활성 = 검정
   배경/흰 글씨, 최소 높이 40.
3. 결과 수 `N권`(13px).
4. **그리드** `repeat(auto-fill, minmax(150px,1fr))`, gap 32×16~24. 카드(hover -6px):
   - 책등 블록 높이 220~280: 표지 이미지 또는 색 + 세로 제목 24px 700 + 출판사 11px,
     좌상단 **상태 배지**(`예정` = point 배경 흰 글씨 / `완료` = 흰 85% 배경 검정 글씨).
   - 제목 17px 700 + 날짜 12px · `저자 · 장르` 13px · 참여자 아바타 스택(18px, -6px 겹침, 흰
     보더) + `n명 · 장소` 12px.
5. 빈 결과: `조건에 맞는 책이 없어요. 검색어나 필터를 바꿔보세요.`(80px 상하 여백, 중앙).

**필터 로직:** `(연도=전체 ∨ 연도 일치) ∧ (장르=전체 ∨ 장르 일치) ∧ (¬내모임만 ∨ 내가 참여)
∧ (검색어 없음 ∨ 제목·저자·장소·출판사 중 포함)`. 상태 = `held_at > 오늘` ? 예정 : 완료.
URL 쿼리(`?q=&year=&genre=&mine=1`)에 동기화해 새로고침·공유에 살아남게 한다.

**데이터:** `clubs ⨝ books ⨝ club_participants ⨝ profiles`. `내가 참여한 모임만`은 로그인 시에만
표시.

**수용 기준**
- [ ] 검색·연도·장르·내 모임 필터가 AND로 동작하고 결과 수가 갱신된다.
- [ ] 예정/완료 배지가 날짜 기준으로 맞게 뜬다.
- [ ] 카드 클릭 → Club. 빈 결과 문구 표시.
- [ ] 150px 최소 폭 그리드가 모바일에서 2열, 1170px에서 5~6열로 흐른다.

### 7-3. 마이페이지 (`/my`) — P2, 로그인 필수

**레이아웃**
1. **프로필 헤더**: 아바타 72~104(코랄 배경, `3px point` 보더 — 구글 프로필 이미지가 있으면
   이미지), 이름 28~36px 700, `{가입연도}부터 함께 읽는 중 · 참여 n회 · 발제 n회`, `프로필 수정`
   버튼(1px 검정 보더, r4, 최소 높이 44).
2. **다음 모임 카드**(우측, 1px 검정 보더, 20×26 패딩, hover 코랄 틴트): `다음 모임`(손글씨 26
   point) / 날짜 24px 700 + 시간 14px / `제목 · 저자` / 장소. 클릭 → Club. 다음 모임이 없으면 가장
   최근 모임을 보여주되 라벨을 `최근 모임`으로 바꾼다.
3. **내 책장**: 제목(손글씨 44~56) + `N권` + 연도 칩(전체 + 내 연도). 책등 가로 나열(flex-wrap,
   하단 정렬, 최소 높이 440, 간격 10~16): 폭 책마다, 높이 380 + (제목 길이 % 3)×30(모바일
   260 + …×22), 세로 제목 18px / 저자 10px / 연도 9px, hover -12px, 클릭 → Club. 맨 끝에 점선
   placeholder `다음 책을 기다리는 자리`(76×380, 2px dashed neutral-300, hover 보더 point) →
   `/bookshelf`. 아래 바닥선 12px.
4. **내가 남긴 기록**(최대 폭 900): 제목(손글씨 44). 행 grid `120px 1fr auto`(모바일 `1fr auto`):
   날짜 13px / `제목 + 저자` 17px 700 + 기록 본문 14px 한 줄 말줄임 / 별 13px point. 상단 1px
   neutral-200 보더, hover 배경 neutral-50, 클릭 → Club. **최신순**.

**데이터:** `profiles(me)`, `club_participants where user_id = me`, `notes where user_id = me`.
`발제 n회` = 내가 리더인 Club 수.

**상태:** 비로그인 접근 → 로그인 유도 화면. 참여 0회 → 내 책장에 placeholder만, 기록 0건 →
`아직 남긴 기록이 없어요`.

**수용 기준**
- [ ] 비로그인 시 로그인 유도, 로그인 후 내 데이터만 표시.
- [ ] 다음 모임 계산이 오늘 기준으로 맞다. 연도 칩이 내 책장에만 적용된다.
- [ ] 기록 행 클릭 → 해당 Club.

### 7-4. Club — 모임 페이지 (`/clubs/:clubId` 제안) — P3, **디벨롭 필요**

> 이 절은 프로토타입에 보이는 범위만 적는다. **모임 등록 시스템**(누가·어떻게 모임을 만들고
> 책·일정·참여자를 붙이는가), **보여주기 시스템**(비공개/공개, 진행 중/완료에 따른 노출)은
> 이 페이지를 개발할 때 `docs/specs/club-page/spec.md`에서 구체화한다. 아래 내용은 그 스펙의
> 출발점이다.

**프로토타입에 있는 것**
1. `← 책장으로` 링크(최소 높이 44).
2. **책 헤더**: 표지 150~220 × 218~320(그림자 `6px 8px 24px`), 제목 34~56px 700 letter-spacing
   -1, `저자` 18~26px 300 + `· 출판사 · 장르` 15px, 우측 `공유` 원형 버튼 48(동작 미정).
   하단: `일시` 날짜 700 + 시간 / `장소` 700, `참여자 n명` + 아바타 52px(색 + 리더 링) + 이름 11px.
3. **2열 그리드**(`minmax(340px,1fr)`, 상단 1px 검정 보더):
   - **발제**: 제목은 검정 스티커(손글씨 44, -2°). 번호(point 700) + 질문 17px, 간격 24.
   - **모임 기록**: 제목은 아웃라인 스티커(손글씨 44, 1.5°) + `기록 남기기` 버튼. 기록 = 아바타
     36 + 이름 15px 700 + 날짜 12px + 별 13px point + 본문 15px/1.7.
4. **모임 평점 배너**(코랄, -0.6°): `모임 평점`(손글씨 30) / `n명이 남긴 별점 평균` / 평균 40~56px
   700 + 별 문자열(★☆ 5개, 반올림).

**이 페이지에서 추후 결정할 것(스펙 작성 시 입력)**
- 모임 등록: 생성 주체(리더만?), 필드(책 선택/신규, 일시, 장소, 참여자 초대), 수정·삭제 권한.
- 보여주기: 예정 모임의 발제 공개 시점, 비참여자에게 기록 노출 여부, 비로그인 열람 범위.
- 기록 남기기 UI: 인라인 폼(텍스트 + 별점 1~5), 1인 1기록 여부, 수정 가능 여부.
- 발제 유형(tone)·토론 시각화(`book-agenda-view`)를 이 페이지에 합칠지, `/books/:bookId/agenda`로
  분리 유지할지.
- 전사(`transcriptions`)를 기록 옆에 붙이는 방식(업로드 진입점, 화자 표시).
- 공유 버튼 동작(링크 복사 / 내보내기).

### 7-5. 발제 등록 (`/agenda/new`) — P3
프로토타입에 없음. `design-tokens` 스펙 §7 "발제 등록 폼" 인벤토리(BookCoverUpload, SegmentedTabs,
QuestionListItem, FormPanel, CategoryOptionRow, EditorToolbar, PrimaryButton)를 따른다. Club 스펙이
확정된 뒤 "어느 Club에 붙는 발제인가"를 정하고 진행한다.

### 7-6. 로그인
헤더 버튼 → Supabase 구글 OAuth(기존 `TheHeader.signInWithGoogle`). 별도 페이지 없음. 첫 로그인
시 `profiles` 행 생성(이름·아바타·가입일·참여자 색 자동 배정).

### 7-7. STT 임시 화면 (`/stt`)
현행 유지. Club 기록에 전사 연결이 끝나면 라우트를 제거한다.

---

## 8. 데이터 모델 초안 (Supabase)

기존 `books`, `transcriptions`는 유지·확장한다. 아래는 페이지 요구를 만족하는 최소 스키마이며,
Club 스펙에서 확정한다.

| 테이블 | 주요 컬럼 | 비고 |
|---|---|---|
| `books` | id, title, author, **publisher, genre, cover_url**, created_at | 기존 + 3컬럼 추가 |
| `clubs` | id, book_id, held_at(timestamptz), place, leader_id, created_at | 상태(예정/완료)는 `held_at` 파생 |
| `club_participants` | club_id, user_id, role(leader/member) | 리더 1명 |
| `agendas` | id, club_id, order, text, tone(nullable) | ⚠️ OQ2 소속(Book/Club) |
| `notes` | id, club_id, user_id, text, rating(1~5), created_at | 1인 1기록 여부 OQ7 |
| `profiles` | id(auth.users), display_name, avatar_url, color(participant-1..9), joined_at | 첫 로그인 시 생성 |
| `transcriptions` | (기존) + club_id(nullable) | 기록에 연결 |

**RLS 원칙:** 열람은 공개 범위 정책(OQ10)에 따르되, 쓰기는 본인 행만. `clubs`·`agendas` 쓰기는
리더만.

**파생값:** Club 평점 = `avg(notes.rating)`; 참여 횟수 = `count(club_participants where me)`;
발제 횟수 = `count(clubs where leader_id = me)`; 다음 모임 = `min(held_at > now)`.

---

## 9. 비기능 요구사항

- **반응형:** §4-5 구간 준수. 가로 스크롤은 컨테이너 내부에서만, 페이지 가로 스크롤 금지.
- **접근성:** 터치 타깃 최소 44px, 칩·버튼 키보드 포커스, 아바타/표지 `alt`, 장식 요소
  `aria-hidden`, `prefers-reduced-motion` 준수.
- **성능:** 폰트 `preconnect`+`display=swap`(이미 적용), 표지 이미지 lazy, 홈 물리 애니메이션은
  `requestAnimationFrame` 단일 루프·화면 밖 요소 제거, Home 진입 시 LCP 2.5s 이하.
- **품질 게이트:** 페이지마다 `pnpm build`·`pnpm lint` 통과, 수동 체크리스트(데스크톱 1440 /
  모바일 390) 확인. 자동 테스트는 v1 미도입(전사 스펙과 동일).
- **보안:** anon 키 + RLS(ADR-0001). 서버 비밀은 Edge Function 시크릿에만.

---

## 10. 개발 순서 (페이지 단위 마일스톤)

각 마일스톤은 `docs/specs/<feature>/spec.md → plan.md → tasks.md`를 거쳐 PR 1개로 머지한다.

| M | 범위 | 스펙 폴더 | 완료 정의 |
|---|---|---|---|
| **M0** | 브랜드·토큰 보강 + 공통 셸 | `app-shell` | 로고 SVG, **포인트 색 `#E8412F` 교체**, `--font-hand`, 참여자 9색, 브레이크포인트 토큰, 헤더·탭바, `ProfileModal→/my` |
| **M1** | Home | `home-page` | 히어로·Glyph Drop·가로 책장(접힘/펼침)·장식, mock → Supabase 연동 |
| **M2** | 책장 | `bookshelf-page` | 필터·검색·그리드·URL 동기화 |
| **M3** | 데이터 기반 | (M1~M2와 병행) | `books` 확장, `clubs`·`club_participants`·`profiles`·`notes` 마이그레이션 + RLS |
| **M4** | 마이페이지 | `my-page` | 프로필·다음 모임·내 책장·내 기록 |
| **M5** | Club | `club-page` | §7-4 결정 사항 확정 후 스펙 → 구현(모임 등록·보여주기 포함) |
| **M6** | 발제 등록 · 전사 연결 | `agenda-new`, `club-transcription` | Club 확정 뒤 |

M1·M2는 Supabase 스키마가 나오기 전까지 프로토타입의 샘플 데이터(17권)를 mock으로 쓰고, M3
완료 시 교체한다.

---

## 11. Open Questions

### 결정 완료 (Resolved)
| # | 질문 | 결정 | 반영 |
|---|---|---|---|
| OQ4 | 포인트 색 `#E8412F`(프로토) vs `#F83C00`(토큰) | ✅ **`#E8412F`(프로토타입) 채택** | §4-3 — `--color-orange-500` 값 교체(M0) |

### 결정 필요 (Open)
| # | 질문 | 영향 | 권장 |
|---|---|---|---|
| OQ1 | Club 페이지 상세 — 모임 등록·보여주기 시스템 | M5 전체 | 사용자 지정: 해당 페이지 개발 시 구체화 |
| OQ2 | Book:Club 1:1 유지 vs 1:N(같은 책 재모임) → Agenda 소속 | 스키마·CONTEXT.md | 1:N 허용, Agenda는 Club 소속으로 변경 |
| OQ3 | 한글 손글씨 폰트(Nanum Pen Script) 채택 여부 | 제목·탭바·스티커 | 채택(`--font-hand`), 디자이너 확인 |
| OQ5 | 떨어지는 글자의 글자 구성·개수·색 4종 | Home | `B U C K` / `Z U C` 7자, 색은 프로토 4색 |
| OQ6 | 발제 tone 시스템·OpinionViz를 Club에 통합할지 | M5·M6 | Club 발제 목록은 단순 리스트, 상세는 `/books/:bookId/agenda` 유지 |
| OQ7 | Note 1인 1기록 여부, 수정 허용 | notes 제약 | 1인 1기록 + 수정 허용 |
| OQ8 | 표지 이미지 소스(직접 업로드 vs 도서 API) | books.cover_url | 우선 직접 업로드(R2 재사용) |
| OQ9 | 책장 검색에 장소·출판사 포함 여부 | 필터 | 프로토타입대로 포함 |
| OQ10 | 비로그인 열람 범위(Home·책장·Club 공개?) | RLS | Home·책장 공개, Club 기록은 참여자만 |
| OQ11 | `/clubs/:clubId` 신설 vs `/books/:bookId` 재사용 | 라우팅 | `/clubs/:clubId` 신설, M5에서 확정 |

---

## 12. 변경 이력
- 2026-09-07 v1.0 초안 — Claude Design 프로토타입 기반 페이지 단위 PRD 작성. 로고 SVG를
  `src/assets/brand/logo.svg`, 프로토타입 스냅숏을 `docs/design/`에 보관.
- 2026-09-24 v1.1 — **OQ4 확정: 포인트 색 = `#E8412F`**(프로토타입 값). 기존 토큰
  `--color-orange-500` 값을 교체하는 방식으로 반영하며, 실제 교체는 M0에서 수행한다.
