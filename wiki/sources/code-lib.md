---
title: "Data Access module (lib)"
type: source
source_path: "src/lib"
source_kind: "code"
module: "lib"
context: "data-access"
last_ingested_sha: "c7c1c6e1e114fadefdc21b8d9084952c1a7f1ddc"
created: "2026-06-14"
ingested_at: "2026-06-14"
entities: ["supabase"]
concepts: []
related: ["code-ui"]
---

# Data Access module (lib)

The Data Access module (`src/lib`) is the data layer of 북적이(book-zuck). At
present it consists of a single file, `src/lib/supabaseClient.ts`, which
constructs and exports the shared Supabase client used across the app.

The client is created with `createClient(supabaseUrl, supabaseKey)` from
`@supabase/supabase-js`. Both values are read from Vite environment variables:
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Because the key is the public
**anon** key and is read via `import.meta.env`, it is bundled into the
client-side build — access control therefore relies on Supabase Row Level
Security rather than secrecy of the key.

The exported `supabase` singleton is the single integration point between the app
and the Supabase backend; UI components (see [[code-ui]]) import it directly to
run queries. There is no repository/abstraction layer yet — callers use the
Supabase query builder inline.

## Key takeaways

- Single responsibility: build and export the shared `supabase` client.
- Credentials come from Vite env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Uses the public anon key in the client bundle → security depends on Supabase RLS.
- No repository abstraction yet; consumers call the Supabase query builder directly.

## Affected wiki pages

- [[supabase]]

## Citation

`src/lib/supabaseClient.ts`
