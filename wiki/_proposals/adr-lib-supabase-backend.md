---
title: "Use Supabase as the backend (proposed ADR)"
type: proposal
proposal_kind: adr
context: "data-access"
created: "2026-06-14"
status: pending-review
---

# Proposed ADR: Use Supabase as the backend

## 3-criteria pre-filter

- **Hard to reverse:** ✅ Choosing a BaaS embeds Supabase's client, auth model, and Postgres conventions across the app; switching means rewriting the data layer.
- **Surprising / non-obvious:** ✅ The anon key is shipped in the client bundle, so data protection depends entirely on Row Level Security rather than a server-side secret — a non-obvious security posture worth recording.
- **Real trade-off:** ✅ BaaS (fast setup, no backend code) vs a custom API (more control, more work); plus client-side anon key + RLS vs a server proxy.

## Context

북적이 needs a data store and API. The app currently has no backend code of its
own — `src/lib/supabaseClient.ts` constructs a Supabase client directly in the
frontend.

## Decision (proposed)

Adopt Supabase (hosted Postgres + auto APIs) as the backend. Initialize one
shared client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and have UI
components query it directly.

## Consequences

- No server to operate; rapid iteration.
- Security relies on Supabase Row Level Security (anon key is public in the bundle).
- App is coupled to Supabase's query API; no repository abstraction currently insulates callers.

## Evidence

- `src/lib/supabaseClient.ts:1-6`
- `src/Api-Test.tsx:16-21`

## To promote

Create `docs/adr/0001-use-supabase-backend.md`, or run
`/grill-with-docs --import wiki/_proposals/adr-lib-supabase-backend.md`.
