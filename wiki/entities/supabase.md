---
title: "Supabase"
type: entity
kind: "external-system"
context: null
created: "2026-06-20"
related: ["code-lib", "adr-0001-use-supabase-backend", "ui-data-fetching", "google-oauth-session", "audio-transcription-pipeline"]
---

# Supabase

Backend-as-a-service (hosted Postgres + auto-generated APIs, Auth, and Edge
Functions) — 북적이's only backend, the decision recorded in
[[adr-0001-use-supabase-backend]]. The whole app reaches it through one client
singleton in [[code-lib]].

Three surfaces are used:

- **Database** — `supabase.from(...)` queries (e.g. `books`, `transcriptions`),
  the basis of [[ui-data-fetching]].
- **Auth** — `supabase.auth` Google OAuth + session events ([[google-oauth-session]]).
- **Edge Functions** — `supabase.functions.invoke("stt-presign" | "stt-submit")`,
  the control plane of the [[audio-transcription-pipeline]].

Security rests on Row Level Security because the anon key ships in the client
bundle.

## Sources

- [[code-lib]]
- [[adr-0001-use-supabase-backend]]

## Related concepts

- [[ui-data-fetching]]
- [[google-oauth-session]]
- [[audio-transcription-pipeline]]

## Code touchpoints

- `src/lib/supabaseClient.ts:13` — `createClient(...)` singleton
- `src/components/common/TheHeader.tsx:11` — `auth.signInWithOAuth({provider:"google"})`
- `src/AudioStt.tsx:98` — `functions.invoke("stt-presign")`
- `src/AudioStt.tsx:61` — `from("transcriptions").select(...)`
