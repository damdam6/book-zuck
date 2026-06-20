---
title: "Audio STT screen"
type: source
source_path: "src/AudioStt.tsx"
source_kind: "code"
module: "audio-stt"
context: null
last_ingested_sha: "2ca1b4e67c82e5483667d57f08bbb232875f98d8"
created: "2026-06-20"
ingested_at: "2026-06-20"
entities: ["supabase", "cloudflare-r2", "rtzr"]
concepts: ["audio-transcription-pipeline", "google-oauth-session"]
related: ["audio-transcription-pipeline", "supabase", "cloudflare-r2", "rtzr", "code-hooks"]
---

# Audio STT screen

`src/AudioStt.tsx` is a single-screen, temporary UI that drives the voice →
Korean transcription pipeline end to end (see [[audio-transcription-pipeline]]).
Its own header comment frames it as a backend-validation UI; the production UI is
deferred.

Client-side validation (`src/AudioStt.tsx:30-39`) restricts uploads to
`mp4/m4a/mp3/amr/flac/wav` and ≤200MB (the cap is justified by Edge Function
memory limits). Upload requires an authenticated user via [[code-hooks]]
(`useAuth`).

The `run()` flow (`src/AudioStt.tsx:77-130`):

1. **presign** — `supabase.functions.invoke("stt-presign")` creates a
   `transcriptions` row and returns a presigned PUT URL.
2. **PUT to R2** — the file is uploaded directly to [[cloudflare-r2]] with the
   same `Content-Type` that was signed.
3. **submit** — `supabase.functions.invoke("stt-submit")` hands the object to
   [[rtzr]] (the Korean STT provider) and flips status to `transcribing`.
4. **poll** — every 5s it reads `transcriptions.status/utterances/error_message`
   by id until `completed` or `failed`.

Results render as a list of **Utterance** rows (`[mm:ss 화자 N] msg`), matching
the glossary shape in [[context-glossary]].

## Key takeaways

- The transcription state machine (`idle→uploading→transcribing→completed/failed`) lives client-side; the server owns the `transcriptions` row.
- Storage (R2) and STT (RTZR) are reached only through Supabase Edge Functions (`stt-presign`, `stt-submit`) — the browser never holds those credentials.
- This screen is temporary/validation-only; the `/stt` route in [[code-app]] is its only entry point.

## Affected wiki pages

- [[audio-transcription-pipeline]]
- [[cloudflare-r2]]
- [[rtzr]]

## Citation

`src/AudioStt.tsx:1-200`
