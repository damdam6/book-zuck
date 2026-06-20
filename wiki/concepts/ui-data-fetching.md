---
title: "UI data fetching"
type: concept
context: null
created: "2026-06-20"
related: ["code-lib", "supabase", "audio-transcription-pipeline", "adr-0001-use-supabase-backend"]
---

# UI data fetching

## Definition

How 북적이 components read remote data: a component calls the shared Supabase
client directly (no caching/query layer), typically in a `useEffect`, and stores
rows in local React state. It defines *how the UI gets its data today* — directly,
per-component.

## Architecture / Mechanism

The legacy reference is `src/Api-Test.tsx`: a `useEffect` runs
`supabase.from("books").select("*")` on mount and writes rows into `useState`.
The client comes from [[code-lib]], not the component. This component is marked
temporary (TanStack Query intended later) and is no longer routed; the scaffolded
[[code-pages]] do not yet fetch at all.

## Contrast

vs [[audio-transcription-pipeline]] — that path is async/polling through Edge
Functions; this is plain synchronous table reads. Both share the one Supabase
client and the RLS posture from [[adr-0001-use-supabase-backend]].

## Sources

- [[code-lib]]
- [[supabase]]

## Code touchpoints

- `src/Api-Test.tsx` — `useEffect` → `supabase.from("books").select("*")` → `useState`
- `src/AudioStt.tsx:61` — `from("transcriptions").select(...)` (read side of the pipeline)
