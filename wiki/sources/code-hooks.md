---
title: "Hooks module"
type: source
source_path: "src/hooks"
source_kind: "code"
module: "hooks"
context: null
last_ingested_sha: "d52febee2da923c3741fc7f57a28c727a91e09f5"
created: "2026-06-20"
ingested_at: "2026-06-20"
entities: ["react", "supabase"]
concepts: ["google-oauth-session"]
related: ["google-oauth-session", "supabase", "code-components", "code-audio-stt"]
---

# Hooks module

`src/hooks/` currently contains a single hook, `useAuth.ts`, the app's session
source of truth (see [[google-oauth-session]]).

On mount it calls `supabase.auth.getSession()` and subscribes to
`supabase.auth.onAuthStateChange`, storing the `Session` in React state and
cleaning up the subscription on unmount (`src/hooks/useAuth.ts:8-20`). It returns
a flattened identity view: `session`, `user`, `email`, and — read from
`user.user_metadata` — `name` (`full_name`) and `profile` (`avatar_url`).

Consumers: `TheHeader` and `ProfileModal` ([[code-components]]) gate the auth UI
on `user`, and `AudioStt` ([[code-audio-stt]]) blocks uploads until `user` is
present.

## Key takeaways

- `useAuth` is the only auth abstraction — it wraps the Supabase Auth client from [[code-lib]]; there is no context provider or store.
- Profile fields come from Google's OAuth metadata (`full_name`, `avatar_url`), so they are provider-shaped, not a local profile model.
- Reactivity is event-driven via `onAuthStateChange`, not polling.

## Affected wiki pages

- [[google-oauth-session]]

## Citation

`src/hooks/useAuth.ts:1-31`
