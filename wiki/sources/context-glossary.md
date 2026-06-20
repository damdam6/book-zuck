---
title: "Context glossary snapshot"
type: source
source_path: "CONTEXT.md"
source_kind: "context"
module: null
context: null
last_ingested_sha: "06b1e3b2036907a25f856d34eb6e61fcd39633db"
created: "2026-06-20"
ingested_at: "2026-06-20"
entities: []
concepts: ["audio-transcription-pipeline"]
related: ["code-pages", "code-audio-stt", "code-app"]
---

# Context glossary snapshot

Wiki snapshot of the single-context root `CONTEXT.md` for 북적이 (book-zuck) — a
book-club community site (React + Supabase). The ubiquitous language:

- **Book** — the core domain entity; a book record in the Supabase `books` table
  (`id`, `title`, `author`, `created_at`). _Avoid:_ Item, Product.
- **Bookshelf** — a user's collection of **Book**s; shown at `/bookshelf`.
  _Avoid:_ Library, Collection.
- **Agenda** (발제) — a discussion topic a user registers against one **Book**;
  created at `/agenda/new`, viewed per-book at `/books/:bookId/agenda`. _Avoid:_
  Topic, Discussion, Question.
- **Transcription** — the record of an uploaded meeting recording converted to
  Korean text; the client polls its status. _Avoid:_ STT result, Script.
- **Utterance** — one speaker turn within a **Transcription** (`start_at`,
  `duration`, `msg`, `spk`, `lang`). _Avoid:_ Segment, Line.

**Relationships:** a **Book** has many **Agenda**; a **Bookshelf** lists many
**Book**s; one **Transcription** has many **Utterance**s.

Terms surface in code as routes/components ([[code-pages]], [[code-app]]) and in
the [[audio-transcription-pipeline]] ([[code-audio-stt]]) for Transcription/
Utterance.

## Key takeaways

- "발제" is canonically **Agenda** (matches the `agenda` routes); don't reintroduce Topic/Question.
- **Transcription** = the whole record; **Utterance** = one line within it — keep them distinct.
- Book/Bookshelf/Agenda are named in scaffolded pages but not yet backed by queries.

## Affected wiki pages

- [[code-pages]]
- [[code-audio-stt]]

## Citation

`CONTEXT.md`
