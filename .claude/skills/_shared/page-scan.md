# Wiki Page Scan Spec

Common page enumeration + frontmatter parsing shared by `/repo-wiki-check`, `/repo-wiki-ingest`, and `/repo-wiki-update`. A single scan pass populates the data structures below; downstream stages consume them without re-reading files.

## Inputs

- cwd (target repo root)
- Optional filter: `paths_filter = [<glob>, ...]` — restrict scan to a subset

## Outputs

Three in-memory maps + one graph. All paths are repo-relative.

### `pages`

Every `wiki/{sources,concepts,entities,synthesis}/*.md`:

```
pages[<slug>] = {
  path:        "wiki/sources/code-orders.md",
  area:        "sources" | "concepts" | "entities" | "synthesis",
  title:       <from frontmatter or H1>,
  type:        <frontmatter type:>,
  frontmatter: {<all yaml fields>},
  body:        <markdown body>,
  outbound:    [<slug-or-path-cited-via-wikilink-or-pathref>],
  size_bytes:  <int>,
  mtime:       <unix>,
}
```

Slug = filename without `.md`. Excludes `wiki/_proposals/`, `wiki/_planning/`, `wiki/index.md`, `wiki/log.md`, `wiki/overview.md`.

### `ssot`

```
ssot.context = {
  mode:    "single" | "multi",
  files:   [{path: "CONTEXT.md", terms: {<term>: {def, avoid_aliases, line}}}, ...],
  glossary_flat: {<term>: {def, source_path}},   # merged view across all CONTEXT.md
}

ssot.adrs = [
  {num: 1, slug: "event-sourced-orders", path: "docs/adr/0001-event-sourced-orders.md",
   title: ..., body: ..., context: null | <bc-slug>, mtime: ...},
  ...
]

ssot.modules = [
  {path: "src/orders", context: null | <bc-slug>, current_sha: <git rev-list -1>,
   last_ingested_sha: <from wiki/_planning/modules.json[<path>] or null>},
  ...
]
```

### `graph`

```
graph.inbound[<slug>]  = [<slug-of-page-pointing-here>]
graph.outbound[<slug>] = [<slug-or-path-this-page-points-to>]
```

Outbound includes:
- `[[wiki-slug]]` references (resolved to a slug if `pages[slug]` exists; else recorded as broken)
- Path references like `docs/adr/0001-x` or `src/orders/repository.ts:42` (recorded as-is, not normalized to slugs)

### `code_terms` (only when `--with-code` is set by caller)

```
code_terms[<term>] = {
  count:           <int>,
  sample_locations: ["src/foo.ts:42", ...],
}
```

Extraction rules:
- Identifiers: class, interface, type, top-level function, exported const
- Doc-comment phrases (capitalized noun phrases)
- String constants (filter out URLs, ICU patterns, i18n keys, file paths)
- Threshold: only retain terms with `count >= 1`; downstream callers apply their own thresholds

## Procedure

### 1. Enumerate pages

```bash
find wiki/sources wiki/entities wiki/concepts wiki/synthesis \
     -maxdepth 1 -name "*.md" -type f 2>/dev/null
```

For each path:
- Read file (single I/O)
- Parse YAML frontmatter via `yq`
- Extract H1 if `title:` is absent
- Body = post-frontmatter content
- Outbound = regex `\[\[([^\]]+)\]\]` matches + path-form regex (`docs/adr/[0-9]+-[a-z0-9-]+`, `src/[^ )]+`)

### 2. Build SSOT inventory

- `CONTEXT-MAP.md` exists → `mode = multi`; parse linked CONTEXT.md paths
- Else → `mode = single`; root `CONTEXT.md` only (may be missing → `terms = {}`)
- Parse each CONTEXT.md "Language" section (term name in `**Bold**:`, definition on the following line, `_Avoid_:` optional)
- `docs/adr/*.md` + per-context `src/<bc>/docs/adr/*.md` → list ADR records (number from filename prefix, slug from rest, title from H1)
- Enumerate `src/<bc>/` (multi) or `src/` (single) depth-1 dirs as modules
- For each module, `git rev-list --max-count=1 HEAD -- <path>` for `current_sha`
- Read `wiki/_planning/modules.json[<module-path>]` for `last_ingested_sha` (keyed by module path, never by slug; see DATA-MODEL.md). ADR SHAs live in `wiki/_planning/adrs.json[<adr-path>]`

### 3. Build graph

For each page in `pages`:
- For each item in `outbound`: append to `graph.outbound[<slug>]` and `graph.inbound[<target-slug>]` (if target is a known slug)
- Broken wikilinks (target slug missing from `pages`) accumulate in a separate `graph.broken_wikilinks` list

### 4. (Optional) Code term extraction

Only when caller passes `--with-code` (used by full lint pass and full ingest, skipped by status-only and cross-link-only). Per glob (default: `src/**/*.{ts,tsx,js,jsx,py,go,rs,java,kt,swift,rb,c,cpp,cs}`):

- Stream files with `Glob` + `Read`
- For each file, extract per the rules above
- Populate `code_terms`

## Performance

Whole `wiki/` scan + frontmatter parse: O(N pages). Expected <2s on N=500.
SSOT scan: O(M ADRs + K terms). Expected <1s on M=50, K=200.
Code scan: O(F files). Expected ~5s per 1000 files; the dominant cost — gate behind `--with-code`.

## Caching

`/repo-wiki-check` may cache `pages` + `graph` + `code_terms` in memory across its 3 stages. No on-disk cache — git/mtime invalidation is fragile and the in-memory cost is acceptable.
