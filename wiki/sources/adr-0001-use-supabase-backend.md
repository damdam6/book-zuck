---
title: "ADR 0001 — Use Supabase as the backend"
type: source
source_path: "docs/adr/0001-use-supabase-backend.md"
source_kind: "adr"
module: null
context: null
last_ingested_sha: "06b1e3b2036907a25f856d34eb6e61fcd39633db"
created: "2026-06-20"
ingested_at: "2026-06-20"
entities: ["supabase"]
concepts: ["ui-data-fetching", "google-oauth-session", "audio-transcription-pipeline"]
related: ["supabase", "code-lib", "ui-data-fetching"]
---

# ADR 0001 — Use Supabase as the backend

Wiki projection of `docs/adr/0001-use-supabase-backend.md` (status: accepted).

**Decision:** adopt Supabase (hosted Postgres + auto-generated APIs) as the
backend. A single shared client is initialized from `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` and UI components query it directly; authentication uses
Supabase Auth (Google OAuth).

**Why it's an ADR (3 criteria):** hard to reverse (Supabase's client, auth model,
and Postgres conventions are spread across the app), surprising (the anon key
ships in the client bundle, so protection rests entirely on Row Level Security),
and a real trade-off (BaaS vs custom API; client anon key + RLS vs a server
proxy).

**Consequences:** no server to operate; security depends on RLS; the app is
coupled to Supabase's query API with no repository abstraction insulating callers
([[code-lib]]). This single decision underpins three concepts —
[[ui-data-fetching]], [[google-oauth-session]], and the Edge-Function-mediated
[[audio-transcription-pipeline]].

## Key takeaways

- The backend choice is the architectural keystone: data, auth, and the STT pipeline all run through one Supabase client.
- RLS — not secrecy — is the security boundary; this is the non-obvious part future readers must know.
- No repository layer exists yet; adding one later is the natural escape hatch from Supabase coupling.

## Affected wiki pages

- [[supabase]]
- [[code-lib]]

## Citation

`docs/adr/0001-use-supabase-backend.md`
