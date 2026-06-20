---
title: "Pages module"
type: source
source_path: "src/pages"
source_kind: "code"
module: "pages"
context: null
last_ingested_sha: "87ad773082bf879d36e1286dc5ef251d73e7d8ea"
created: "2026-06-20"
ingested_at: "2026-06-20"
entities: ["react", "react-router"]
concepts: ["client-side-routing"]
related: ["code-app", "client-side-routing", "code-components", "react-router"]
---

# Pages module

`src/pages/` holds one folder per route-level screen, each mounted by
[[code-app]]'s route table:

- `Home/HomePage.tsx` → `/` — landing; links to other screens, uses the
  [[shadcn-ui]] `Button`.
- `Bookshelf/BookshelfPage.tsx` → `/bookshelf` — "책장 리스트" (list of **Book**s).
- `BookAgenda/BookAgendaPage.tsx` → `/books/:bookId/agenda` — per-book **Agenda**;
  reads `bookId` via `useParams`.
- `AgendaNew/AgendaNewPage.tsx` → `/agenda/new` — "발제 등록" (create an **Agenda**).
- `My/MyPage.tsx` → `/my` — user's "마이" screen.

All five are currently **scaffold screens**: each renders `<TheHeader />`
([[code-components]]) plus a heading and a `TODO` comment. The domain wiring
(querying **Book**/**Agenda** from Supabase) is not implemented yet — these pages
fix the routing/IA shape ahead of feature work. See [[context-glossary]] for the
Book/Bookshelf/Agenda terms these screens are named after.

## Key takeaways

- Pages are placeholders: layout + header + TODO, no data fetching yet.
- The folder set encodes the product's information architecture (책장 / 책별 발제 / 발제 등록 / 마이).
- Only `BookAgendaPage` consumes a route param (`:bookId`); the rest are static routes.

## Affected wiki pages

- [[client-side-routing]]
- [[context-glossary]]

## Citation

`src/pages/{Home,Bookshelf,BookAgenda,AgendaNew,My}/*.tsx`
