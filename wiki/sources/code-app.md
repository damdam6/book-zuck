---
title: "App shell (entry + routing)"
type: source
source_path: "src/App.tsx"
source_kind: "code"
module: "app"
context: null
last_ingested_sha: "2ca1b4e67c82e5483667d57f08bbb232875f98d8"
created: "2026-06-20"
ingested_at: "2026-06-20"
entities: ["react", "react-router"]
concepts: ["client-side-routing"]
related: ["code-pages", "code-audio-stt", "client-side-routing", "react-router"]
---

# App shell (entry + routing)

The application shell wires React to the DOM and declares the route table. These
are the repo-root files not owned by any `src/<dir>` module: `src/main.tsx`,
`src/App.tsx`, and the legacy `src/Api-Test.tsx`.

`src/main.tsx:7` creates the React root on `#root` and renders `<App />` inside
`<StrictMode>` wrapped by `<BrowserRouter>` — client-side routing is provided by
`react-router-dom` (see [[client-side-routing]], [[react-router]]).

`src/App.tsx` declares the `<Routes>`: `/` → Home, `/bookshelf` → Bookshelf,
`/books/:bookId/agenda` → BookAgenda, `/agenda/new` → AgendaNew, `/my` → My (all
in [[code-pages]]), plus a temporary `/stt` → [[code-audio-stt]] route used to
validate the transcription backend.

`src/Api-Test.tsx` is the original Supabase smoke test — it defines an ad-hoc
`Book` interface and queries the `books` table directly via `useEffect`. It is
explicitly marked temporary (TanStack Query intended later) and is no longer
mounted in the route table; treat it as legacy.

## Key takeaways

- Routing is declarative `react-router-dom` v6 (`<Routes>`/`<Route>`), wrapped at the root in `main.tsx`.
- The route table is the de-facto sitemap: Home, Bookshelf, per-book Agenda, Agenda-new, My, and a temporary STT screen.
- `Api-Test.tsx` is dead-ish legacy (not routed); the canonical `Book` shape now lives in [[context-glossary]].

## Affected wiki pages

- [[code-pages]]
- [[code-audio-stt]]
- [[client-side-routing]]

## Citation

`src/main.tsx:1-13`, `src/App.tsx:1-24`, `src/Api-Test.tsx`
