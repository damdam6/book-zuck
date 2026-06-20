---
type: overview
created: 2026-06-14
updated: 2026-06-20
---

# Repo Overview

북적이 (book-zuck) is a book-club community site: a React + Vite single-page app
with [[supabase]] as its only backend ([[adr-0001-use-supabase-backend]]). The
core domain is **Book / Bookshelf / Agenda(발제)**, plus a meeting-recording
**Transcription / Utterance** feature ([[context-glossary]]).

The app is organized as: an app shell with react-router routing
([[code-app]], [[client-side-routing]]); scaffolded route screens
([[code-pages]]); reusable UI built on a shadcn/Tailwind [[design-system]]
([[code-components]], [[shadcn-ui]]); a single Supabase client + `cn()` helper
([[code-lib]]); and a `useAuth` hook for Google OAuth sessions
([[code-hooks]], [[google-oauth-session]]).

Two data paths exist: synchronous per-component reads ([[ui-data-fetching]]) and
the asynchronous [[audio-transcription-pipeline]] that uploads audio to
[[cloudflare-r2]] and transcribes via [[rtzr]] through Supabase Edge Functions.

Current state: routing, design system, auth, and the STT pipeline are in place;
most pages are placeholders pending domain wiring (Book/Agenda queries).
