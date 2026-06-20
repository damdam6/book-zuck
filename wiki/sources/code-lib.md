---
title: "Data Access module (lib)"
type: source
source_path: "src/lib"
source_kind: "code"
module: "lib"
context: null
last_ingested_sha: "87ad773082bf879d36e1286dc5ef251d73e7d8ea"
created: "2026-06-20"
ingested_at: "2026-06-20"
entities: ["supabase", "shadcn-ui"]
concepts: ["ui-data-fetching", "design-system"]
related: ["supabase", "ui-data-fetching", "design-system", "adr-0001-use-supabase-backend"]
---

# Data Access module (lib)

`src/lib/` holds two shared, app-wide singletons.

`supabaseClient.ts` constructs and exports the single Supabase client
(`createClient(supabaseUrl, supabaseAnonKey)` from `@supabase/supabase-js`). Both
values come from Vite env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`,
and the module now throws at import time if either is missing
(`src/lib/supabaseClient.ts:7-11`). Because the **anon** key is bundled into the
client build, access control depends on Supabase Row Level Security rather than
key secrecy — the decision recorded in [[adr-0001-use-supabase-backend]]. The
exported `supabase` singleton is the only integration point with the backend; it
serves data queries ([[ui-data-fetching]]), Auth ([[google-oauth-session]]), and
Edge Function calls ([[audio-transcription-pipeline]]).

`utils.ts` exports `cn(...)` — the standard shadcn class-merge helper
(`clsx` + `tailwind-merge`) used by every [[shadcn-ui]] primitive in
[[code-components]].

## Key takeaways

- One Supabase client for the whole app; no repository/data-access abstraction wraps it (callers import `supabase` directly).
- Fail-fast env validation prevents a silently-misconfigured client.
- `cn()` is infrastructure for the design system, not domain logic.

## Affected wiki pages

- [[supabase]]
- [[ui-data-fetching]]
- [[adr-0001-use-supabase-backend]]

## Citation

`src/lib/supabaseClient.ts:1-13`, `src/lib/utils.ts:1-6`
