---
title: "UI module"
type: source
source_path: "src/"
source_kind: "code"
module: "ui"
context: "ui"
last_ingested_sha: "c7c1c6e1e114fadefdc21b8d9084952c1a7f1ddc"
created: "2026-06-14"
ingested_at: "2026-06-14"
entities: ["react", "supabase"]
concepts: ["ui-data-fetching"]
related: ["code-lib"]
---

# UI module

The UI module is the React presentation layer of 북적이(book-zuck). It owns the
application entry point and the user-facing components. `src/main.tsx` boots the
app: it creates a React root on the `#root` DOM node and renders `<App />` inside
`<StrictMode>`. `src/App.tsx` is the top-level component — currently a heading
("여기가 북적이 사이트 시작") styled with Tailwind utility classes plus the
`<ApiTest />` component.

`src/Api-Test.tsx` is the only data-bound component so far. It defines a local
`Book` TypeScript interface (`id`, `title`, `author`, `created_at`) and, on mount
via `useEffect`, queries the Supabase `books` table (`select("*")`) and stores the
rows in `useState`. The result is rendered as a `<ul>` of book title/author rows.
The component is explicitly marked temporary — a code comment notes the data
fetching will move to TanStack Query later, so the current inline `useEffect` +
`supabase` call is a placeholder rather than the intended steady-state pattern.

The UI module depends on the [[code-lib]] Data Access module for its Supabase
client; it does not construct the client itself.

## Key takeaways

- Entry point `main.tsx` renders `<App />` under React StrictMode.
- `ApiTest` is the sole data-bound component; it reads the `books` table directly via the shared Supabase client.
- Data fetching is intentionally temporary (inline `useEffect`); TanStack Query is the planned replacement.
- Styling uses Tailwind utility classes.

## Affected wiki pages

- [[ui-data-fetching]]
- [[supabase]]
- [[react]]

## Citation

`src/App.tsx`, `src/Api-Test.tsx`, `src/main.tsx`
