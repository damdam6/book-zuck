---
title: "Cloudflare R2"
type: entity
kind: "external-system"
context: null
created: "2026-06-20"
related: ["code-audio-stt", "audio-transcription-pipeline", "supabase"]
---

# Cloudflare R2

Object storage that holds uploaded audio files for the transcription pipeline.
The browser uploads directly to R2 via a presigned PUT URL — it never holds R2
credentials. The URL is minted by the `stt-presign` Supabase Edge Function, and
the signed `Content-Type` must match the actual `PUT` request.

See [[audio-transcription-pipeline]] for where R2 sits in the flow and
[[code-audio-stt]] for the client code.

> Note: R2/Workers configuration was added repo-wide (commit "Add Cloudflare
> Workers configuration"); this page covers R2's role as seen from the app code.

## Sources

- [[code-audio-stt]]

## Related concepts

- [[audio-transcription-pipeline]]

## Code touchpoints

- `src/AudioStt.tsx:106-110` — direct `fetch(presign.uploadUrl, { method: "PUT" })` to R2
