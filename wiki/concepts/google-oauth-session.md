---
title: "Google OAuth session"
type: concept
context: null
created: "2026-06-20"
related: ["code-hooks", "code-components", "supabase", "adr-0001-use-supabase-backend"]
---

# Google OAuth session

## Definition

How 북적이 authenticates users: Supabase Auth with Google as the OAuth provider.
The session is the app's identity source of truth, surfaced through the `useAuth`
hook ([[code-hooks]]).

## Architecture / Mechanism

`useAuth` (`src/hooks/useAuth.ts`) reads `supabase.auth.getSession()` on mount and
subscribes to `onAuthStateChange`, exposing `user`, `email`, and Google-metadata
fields `name` (`full_name`) and `profile` (`avatar_url`). Sign-in is triggered in
`TheHeader` via `supabase.auth.signInWithOAuth({ provider: "google",
redirectTo: window.location.origin })`; sign-out via `supabase.auth.signOut()` in
`ProfileModal` ([[code-components]]). Upload in [[code-audio-stt]] is gated on
`user`.

## Contrast

There is no app-level auth context/store — every consumer calls `useAuth`
independently. Profile fields are provider-shaped (Google metadata), not a local
user model.

## Sources

- [[code-hooks]]
- [[code-components]]

## Code touchpoints

- `src/hooks/useAuth.ts:8-29` — session read + `onAuthStateChange` + identity view
- `src/components/common/TheHeader.tsx:10-18` — `signInWithOAuth` (google)
- `src/components/Modal/ProfileModal.tsx:8-10` — `signOut`
