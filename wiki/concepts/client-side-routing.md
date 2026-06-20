---
title: "Client-side routing"
type: concept
context: null
created: "2026-06-20"
related: ["code-app", "code-pages", "react-router"]
---

# Client-side routing

## Definition

How 북적이 maps URLs to screens entirely in the browser, via
[[react-router]] (`react-router-dom` v6). It defines the app's navigable
information architecture.

## Architecture / Mechanism

`<BrowserRouter>` wraps the tree at the root ([[code-app]], `src/main.tsx`). The
route table in `src/App.tsx` binds paths to page components ([[code-pages]]):
`/` Home, `/bookshelf` Bookshelf, `/books/:bookId/agenda` BookAgenda,
`/agenda/new` AgendaNew, `/my` My, and a temporary `/stt` →
[[code-audio-stt]]. Dynamic segments (`:bookId`) are read with `useParams`.

## Contrast

The route set is the product IA (책장 / 책별 발제 / 발제 등록 / 마이) even though
the target pages are still scaffolds — routing shape leads feature implementation.

## Sources

- [[code-app]]
- [[code-pages]]

## Code touchpoints

- `src/main.tsx:5,10` — `<BrowserRouter>`
- `src/App.tsx:12-19` — `<Route>` table
- `src/pages/BookAgenda/BookAgendaPage.tsx:5` — `useParams`
