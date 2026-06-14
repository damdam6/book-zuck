---
title: "React"
type: entity
kind: "library"
context: "ui"
created: "2026-06-14"
related: ["ui-data-fetching"]
---

# React

The UI library powering 북적이's frontend, bootstrapped with Vite. Components,
hooks (`useState`, `useEffect`), and the root render live in the [[code-ui]]
module.

## Sources

- [[code-ui]]

## Related concepts

- [[ui-data-fetching]]

## Code touchpoints

- `src/main.tsx:6` — `createRoot(...).render(<App />)` under `StrictMode`
- `src/App.tsx:4` — top-level `App` component
- `src/Api-Test.tsx:12` — `ApiTest` component using `useState`/`useEffect`
