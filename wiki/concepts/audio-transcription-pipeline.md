---
title: "Audio transcription pipeline"
type: concept
context: null
created: "2026-06-20"
related: ["code-audio-stt", "supabase", "cloudflare-r2", "rtzr", "context-glossary"]
---

# Audio transcription pipeline

## Definition

The end-to-end flow that turns an uploaded meeting recording into a Korean
**Transcription** of **Utterance**s. Driven client-side from [[code-audio-stt]],
mediated by Supabase Edge Functions, with storage and STT delegated to external
systems.

## Architecture / Mechanism

Four steps (`src/AudioStt.tsx:77-130`):

1. **presign** — `functions.invoke("stt-presign")` creates a `transcriptions`
   row and returns a presigned PUT URL.
2. **upload** — the browser `PUT`s the file directly to [[cloudflare-r2]] using
   the signed `Content-Type`.
3. **submit** — `functions.invoke("stt-submit")` hands the object to [[rtzr]] and
   moves status to `transcribing`.
4. **poll** — every `POLL_INTERVAL_MS` (5s) it reads
   `transcriptions.{status,utterances,error_message}` by id until `completed` or
   `failed`.

The state machine is `idle → uploading → transcribing → completed | failed`. The
server owns the row; the client owns the polling loop and rendering.

## Contrast

vs [[ui-data-fetching]] — direct table reads are synchronous request/response;
this pipeline is asynchronous (fire → poll) and routes writes through Edge
Functions so R2/RTZR credentials stay server-side.

## Sources

- [[code-audio-stt]]
- [[supabase]]

## Code touchpoints

- `src/AudioStt.tsx:98-118` — presign → PUT → submit
- `src/AudioStt.tsx:58-75` — `pollUntilDone`
- `src/AudioStt.tsx:9` — `Status` union
