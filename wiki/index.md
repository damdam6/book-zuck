---
type: index
created: 2026-06-14
updated: 2026-06-20
---

# Wiki Index

## Sources
- [[adr-0001-use-supabase-backend]] — ADR projection: Supabase as backend
- [[code-app]] — app shell: entry + react-router route table (`src/main.tsx`, `src/App.tsx`)
- [[code-audio-stt]] — voice → Korean transcription screen (`src/AudioStt.tsx`)
- [[code-components]] — shadcn UI primitives + header/profile/auth UI (`src/components`)
- [[code-hooks]] — `useAuth` session hook (`src/hooks`)
- [[code-lib]] — Supabase client singleton + `cn()` (`src/lib`)
- [[code-pages]] — route-level screens (`src/pages`)
- [[context-glossary]] — CONTEXT.md snapshot (Book/Bookshelf/Agenda/Transcription/Utterance)

## Concepts
- [[audio-transcription-pipeline]] — presign → R2 PUT → submit → poll
- [[client-side-routing]] — react-router URL → screen mapping
- [[design-system]] — Tailwind tokens + shadcn primitives
- [[google-oauth-session]] — Supabase Auth (Google) via `useAuth`
- [[ui-data-fetching]] — direct per-component Supabase queries

## Entities
- [[cloudflare-r2]] — object storage for uploaded audio (external system)
- [[react]] — UI library
- [[react-router]] — client-side routing library
- [[rtzr]] — Korean STT provider (external system)
- [[shadcn-ui]] — copy-in component pattern (radix + cva)
- [[supabase]] — backend-as-a-service (external system)

## Synthesis
_(populated by /repo-wiki-query when offered)_

## Proposals (awaiting promotion to SSOT)
_(none — initial proposals promoted: ADR → `docs/adr/0001-use-supabase-backend.md`, `Book` term → `CONTEXT.md`)_
