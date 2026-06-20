---
title: "React"
type: entity
kind: "library"
context: null
created: "2026-06-20"
related: ["code-app", "code-components", "code-pages", "code-hooks", "design-system"]
---

# React

The UI library powering 북적이's frontend, bootstrapped with Vite. The root is
rendered in [[code-app]] (`src/main.tsx`), screens live in [[code-pages]],
reusable UI in [[code-components]], and stateful logic in custom hooks
([[code-hooks]]).

## Sources

- [[code-app]]
- [[code-components]]
- [[code-pages]]
- [[code-hooks]]

## Related concepts

- [[design-system]]
- [[client-side-routing]]

## Code touchpoints

- `src/main.tsx:7` — `createRoot(...).render(<App/>)` under `StrictMode`
- `src/hooks/useAuth.ts:8` — `useState`/`useEffect` session hook
- `src/AudioStt.tsx:5` — `useRef`/`useEffect` polling
