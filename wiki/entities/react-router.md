---
title: "React Router"
type: entity
kind: "library"
context: null
created: "2026-06-20"
related: ["code-app", "code-pages", "client-side-routing"]
---

# React Router

`react-router-dom` (v6) provides client-side routing. `<BrowserRouter>` wraps the
app at the root ([[code-app]], `src/main.tsx`), `<Routes>/<Route>` declare the
screen table in `src/App.tsx`, and screens read params via `useParams`
(`BookAgendaPage`). See [[client-side-routing]].

## Sources

- [[code-app]]
- [[code-pages]]

## Related concepts

- [[client-side-routing]]

## Code touchpoints

- `src/main.tsx:5,10` — `<BrowserRouter>`
- `src/App.tsx:1,12-19` — `<Routes>`/`<Route>`
- `src/pages/BookAgenda/BookAgendaPage.tsx:5` — `useParams<{ bookId }>()`
