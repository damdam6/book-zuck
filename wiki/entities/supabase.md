---
title: "Supabase"
type: entity
kind: "external-system"
context: "data-access"
created: "2026-06-14"
related: ["ui-data-fetching"]
---

# Supabase

Backend-as-a-service (hosted Postgres + auto-generated APIs) used by 북적이 as its
data store. It sits behind the [[code-lib]] Data Access module and is the app's
only backend.

## Sources

- [[code-lib]]
- [[code-ui]]

## Related concepts

- [[ui-data-fetching]]

## Code touchpoints

- `src/lib/supabaseClient.ts:5` — `createClient(...)` builds the shared client
- `src/Api-Test.tsx:16` — `supabase.from("books")` query against the `books` table
