---
title: "UI data fetching"
type: concept
context: "ui"
created: "2026-06-14"
related: ["code-ui", "code-lib", "supabase"]
---

# UI data fetching

## Definition

The pattern by which 북적이 UI components load remote data from Supabase. As
captured in [[code-ui]], a component triggers a query on mount and stores the
result in local React state. It defines *how the UI currently gets its data* —
directly, per-component, without a caching/query layer.

## Architecture / Mechanism

In `src/Api-Test.tsx:15`, a `useEffect` runs once on mount and calls
`supabase.from("books").select("*")`, then writes the returned rows into
`useState` (`src/Api-Test.tsx:13`). Rendering maps over the state array. The
shared client comes from the [[code-lib]] module (`src/lib/supabaseClient.ts`),
not from the component itself.

This is explicitly a temporary approach — `src/Api-Test.tsx:11` notes that
TanStack Query is intended to replace the manual `useEffect` fetch. The planned
move would add request caching, loading/error states, and refetching that the
current inline pattern lacks.

## Contrast

vs the planned TanStack Query approach — manual `useEffect` fetching has no
caching, dedup, or built-in loading/error handling; it is a placeholder.

## Sources

- [[code-ui]]
- [[code-lib]]

## Code touchpoints

- `src/Api-Test.tsx:15` — `useEffect` mount fetch
- `src/Api-Test.tsx:17` — `supabase.from("books").select("*")`
- `src/Api-Test.tsx:13` — result stored in `useState`
