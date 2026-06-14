# Spec: Page-Based Folder Structure (페이지 구조 스캐폴딩)

## Objective

사이트의 핵심 화면들을 **page-based folder 구조**로 스캐폴딩한다. 이번 작업의 범위는
**라우팅과 폴더 구조만** 잡는 것 — 각 페이지는 제목 + TODO 수준의 placeholder이며,
실제 데이터 페칭/UI/Supabase 연동은 후속 작업에서 채운다.

**대상 페이지 (5개):**

| 페이지 | 한글 | Route | 폴더 |
|---|---|---|---|
| Home | 홈페이지 | `/` | `src/pages/Home/` |
| Bookshelf | 책장 리스트 | `/bookshelf` | `src/pages/Bookshelf/` |
| Book Agenda | 책별 모임 발제 view | `/books/:bookId/agenda` | `src/pages/BookAgenda/` |
| Agenda New | 모임 발제 등록 | `/agenda/new` | `src/pages/AgendaNew/` |
| My | 마이 페이지 | `/my` | `src/pages/My/` |

**성공 = ** `npm run dev`로 위 5개 경로에 접속하면 각각 고유한 placeholder 페이지가
뜨고, `npm run build`(`tsc -b && vite build`)가 통과한다.

### User stories (placeholder 수준)

- 사용자는 `/`에서 홈을 본다 (기존 MainPage가 Home으로 이전됨).
- 사용자는 `/bookshelf`에서 책장 리스트 자리(placeholder)를 본다.
- 사용자는 `/books/:bookId/agenda`에서 해당 책의 발제 모음 자리를 본다 — URL의 `bookId`를 페이지에서 읽어 표시한다.
- 사용자는 `/agenda/new`에서 발제 등록 폼 자리를 본다 (책 선택 UI는 후속).
- 사용자는 `/my`에서 마이페이지 자리를 본다.

## Tech Stack

기존 스택을 그대로 사용한다. **새 의존성 추가 없음.**

- Vite 6 + React 19
- react-router-dom 7 (수동 `<Routes>` 구성, `App.tsx`)
- TypeScript ~5.8 (strict)
- Tailwind CSS 4
- Path alias: `@/` → `src/`
- (참고) Supabase / Google OAuth — 이번 범위에서는 건드리지 않음

## Commands

```
Dev:    npm run dev
Build:  npm run build      # tsc -b && vite build  (타입체크 포함 — 검증 게이트)
Lint:   npm run lint       # eslint .
Preview: npm run preview
```

## Project Structure

```
src/
├── pages/
│   ├── Home/
│   │   └── HomePage.tsx              # / (기존 MainPage 내용 이전)
│   ├── Bookshelf/
│   │   └── BookshelfPage.tsx         # /bookshelf
│   ├── BookAgenda/
│   │   └── BookAgendaPage.tsx        # /books/:bookId/agenda
│   ├── AgendaNew/
│   │   └── AgendaNewPage.tsx         # /agenda/new
│   └── My/
│       └── MyPage.tsx                # /my
├── components/
│   └── common/TheHeader.tsx          # 공유 헤더 (변경 없음)
└── App.tsx                           # 5개 Route 등록
```

규칙: **폴더당 한 페이지**, 폴더명·컴포넌트명은 PascalCase, 파일명 `<Name>Page.tsx`.
페이지 전용 하위 컴포넌트가 생기면 해당 페이지 폴더 안에 둔다 (후속 작업).

## Code Style

기존 컨벤션(named arrow component + `export default`, `@/` alias, Tailwind 인라인 클래스, Korean UI text)을 그대로 따른다. Placeholder 페이지 예시:

```tsx
// src/pages/Bookshelf/BookshelfPage.tsx
import TheHeader from "@/components/common/TheHeader";

const BookshelfPage = () => {
  return (
    <>
      <TheHeader />
      <main className="px-24 py-8">
        <h1 className="text-2xl font-bold">책장 리스트</h1>
        {/* TODO: 책장 리스트 구현 */}
      </main>
    </>
  );
};

export default BookshelfPage;
```

URL 파라미터를 읽는 페이지 예시:

```tsx
// src/pages/BookAgenda/BookAgendaPage.tsx
import { useParams } from "react-router-dom";
import TheHeader from "@/components/common/TheHeader";

const BookAgendaPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  return (
    <>
      <TheHeader />
      <main className="px-24 py-8">
        <h1 className="text-2xl font-bold">책별 모임 발제</h1>
        <p className="text-gray-500">bookId: {bookId}</p>
        {/* TODO: 해당 책의 발제 목록 구현 */}
      </main>
    </>
  );
};

export default BookAgendaPage;
```

`App.tsx` 라우팅:

```tsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/bookshelf" element={<BookshelfPage />} />
  <Route path="/books/:bookId/agenda" element={<BookAgendaPage />} />
  <Route path="/agenda/new" element={<AgendaNewPage />} />
  <Route path="/my" element={<MyPage />} />
</Routes>
```

## Testing Strategy

이 단계는 placeholder 스캐폴딩이므로 단위 테스트를 추가하지 않는다. 검증은 다음으로 대체한다:

- **타입/빌드 게이트:** `npm run build` 통과 (tsc strict)
- **Lint:** `npm run lint` 통과
- **수동 확인:** `npm run dev` 후 5개 경로 각각 접속 → 고유 placeholder 렌더 확인

실제 기능이 붙는 후속 단계에서 테스트 전략을 별도 정의한다.

## Boundaries

- **Always:** 기존 네이밍/폴더 컨벤션 준수, `@/` alias 사용, `npm run build` + `npm run lint` 통과 후 커밋, Korean UI 텍스트 유지.
- **Ask first:** 새 의존성 추가(예: TanStack Router/Query), 라우트 경로·폴더 구조 변경, `TheHeader`/`useAuth`/Supabase 등 공유 코드 수정, 라우팅 라이브러리 교체.
- **Never:** placeholder 단계에서 데이터 페칭/Supabase 연동 임의 추가, 시크릿 커밋, `wiki/` 산출물 직접 수정, 범위 밖 페이지 추가.

## Success Criteria

- [ ] `src/pages/` 아래 5개 페이지가 각자 폴더로 존재한다 (Home, Bookshelf, BookAgenda, AgendaNew, My).
- [ ] `App.tsx`에 5개 라우트가 등록되어 있고 각 경로가 해당 페이지를 렌더한다.
- [ ] 기존 `MainPage.tsx` 내용이 `HomePage.tsx`로 이전되고, 더 이상 참조되지 않는 `MainPage.tsx`는 제거된다.
- [ ] `/books/:bookId/agenda` 페이지가 `useParams`로 `bookId`를 읽어 표시한다.
- [ ] `npm run build`와 `npm run lint`가 통과한다.
- [ ] `npm run dev`에서 5개 경로가 각각 고유 placeholder를 렌더한다.

## Open Questions

- (해결됨) 라우트 구조 → **책 중심 중첩** (`/books/:bookId/agenda`).
- (해결됨) 발제 등록의 책 지정 → **책 선택은 후속**, 지금은 `/agenda/new` 단일 라우트.
- 404 / NotFound 라우트와 공통 레이아웃(`<Outlet>` 기반)을 이번에 포함할지 — 현재 범위에서는 **제외**, 필요 시 PLAN 단계에서 논의.
