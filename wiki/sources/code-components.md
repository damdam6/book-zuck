---
title: "Components module"
type: source
source_path: "src/components"
source_kind: "code"
module: "components"
context: null
last_ingested_sha: "87ad773082bf879d36e1286dc5ef251d73e7d8ea"
created: "2026-06-20"
ingested_at: "2026-06-20"
entities: ["react", "shadcn-ui", "supabase"]
concepts: ["design-system", "google-oauth-session"]
related: ["design-system", "shadcn-ui", "code-hooks", "code-pages", "google-oauth-session"]
---

# Components module

`src/components/` holds reusable presentation. Two layers coexist:

**Design-system primitives** (`src/components/ui/`): `button.tsx`, `card.tsx`,
`badge.tsx` are shadcn-style components built on `radix-ui` `Slot` +
`class-variance-authority` (`cva`) variant maps, composed through the `cn()`
helper from [[code-lib]]. Their classNames reference semantic design tokens
(`bg-primary`, `text-foreground`, `border-ring`, …) — see [[design-system]] and
[[shadcn-ui]].

**App components**: `common/TheHeader.tsx` renders the top bar; when logged out
it shows a "구글 로그인" button that calls `supabase.auth.signInWithOAuth({
provider: "google" })`, and when logged in it shows the avatar/name and toggles
`Modal/ProfileModal.tsx`. `ProfileModal.tsx` shows name/email/avatar and a
로그아웃 button (`supabase.auth.signOut()`). Both read identity via `useAuth`
([[code-hooks]]) — this is the UI side of [[google-oauth-session]].

## Key takeaways

- `ui/` = generic shadcn primitives (variant-driven, token-styled); `common/` + `Modal/` = app-specific composition.
- Auth UX (Google sign-in, sign-out, profile) is implemented in `TheHeader`/`ProfileModal`, not in pages — pages just mount `TheHeader`.
- Components talk to Supabase Auth directly via the shared client from [[code-lib]].

## Affected wiki pages

- [[design-system]]
- [[google-oauth-session]]

## Citation

`src/components/ui/{button,card,badge}.tsx`, `src/components/common/TheHeader.tsx`, `src/components/Modal/ProfileModal.tsx`
