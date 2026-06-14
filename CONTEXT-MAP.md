# Context Map

북적이(book-zuck) — React + Supabase 커뮤니티 사이트.

## Contexts

- [UI](./src/CONTEXT.md) — React 화면/컴포넌트, 사용자 인터랙션 (`src/App.tsx`, `src/Api-Test.tsx`)
- [Data Access](./src/lib/CONTEXT.md) — Supabase 클라이언트 및 데이터 접근 계층 (`src/lib/supabaseClient.ts`)

## Relationships

- UI → Data Access: UI 컴포넌트가 Data Access를 통해 Supabase 데이터를 읽고 쓴다.

_(영역이 늘어나면 여기에 추가: 예 — Auth, Posts/Feed, Notifications …)_
