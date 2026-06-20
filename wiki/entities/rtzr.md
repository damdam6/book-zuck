---
title: "RTZR (STT provider)"
type: entity
kind: "external-system"
context: null
created: "2026-06-20"
related: ["code-audio-stt", "audio-transcription-pipeline", "supabase"]
---

# RTZR (STT provider)

The Korean speech-to-text provider that produces the actual transcription.
It is invoked server-side by the `stt-submit` Supabase Edge Function (the client
only triggers submission and then polls); the app code never calls RTZR directly.

Its output populates the `transcriptions` row's `utterances` array (each an
**Utterance**: `start_at`, `duration`, `msg`, `spk`, `lang`). See
[[audio-transcription-pipeline]].

## Sources

- [[code-audio-stt]]

## Related concepts

- [[audio-transcription-pipeline]]

## Code touchpoints

- `src/AudioStt.tsx:114` — `functions.invoke("stt-submit")` comment: "RTZR 제출, transcribing 전환"
