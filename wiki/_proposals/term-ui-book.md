---
title: "Book (proposed glossary term)"
type: proposal
proposal_kind: glossary-term
context: "ui"
created: "2026-06-14"
status: pending-review
---

# Proposed term: Book

**Proposed definition:** A book record in 북적이 — the core domain entity. Shape
(per the TypeScript interface): `id` (number), `title` (string), `author`
(string), `created_at` (string/timestamp). Stored in the Supabase `books` table.

## Evidence

- `src/Api-Test.tsx:4-9` — `interface Book { id; title; author; created_at }`
- `src/Api-Test.tsx:17` — `supabase.from("books").select("*")`

## Why propose

`Book` is the central domain noun of the app and currently exists only as an
ad-hoc interface inside a component marked temporary. Promoting it to CONTEXT.md
(UI or a future domain context) pins down the canonical shape and naming before
more components depend on it.

## To promote

Add a `Book` definition under the appropriate context in `CONTEXT.md`, or run
`/grill-with-docs --import wiki/_proposals/term-ui-book.md`.
