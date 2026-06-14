# Lint Check Catalog

Catalog of every consistency check applied across the repo-wiki layer. Single source of truth — referenced by `/repo-wiki-ingest` Stage A and `/repo-wiki-check` Stage 2.

All checks operate on the outputs of [page-scan.md](./page-scan.md) (`pages`, `ssot`, `graph`, optional `code_terms`).

## Severity levels

- **error** — must fix; `--strict` flag promotes warns to errors
- **warn** — should fix; default visible
- **info** — informational; visible by default, no exit code impact

## Check catalog

### SSOT-vs-code drift (requires `code_terms`)

#### `term-conflict` (warn)

Identifier matches a glossary term name AND semantic usage diverges. Heuristics:

- Type signature contradicts definition noun (e.g., glossary says "person", code uses `class Customer { id: string; orderCount: number }` with no person attributes → fine, but `interface Customer { sessionToken: string }` → conflict, suggests auth principal misuse)
- Comment phrasing contradicts definition (NLP-ish — compare key nouns/verbs in glossary def vs nearby comment)
- Cross-context contamination (multi-context only): term defined in context A appears in code under context B

Output: `{term, glossary_def, observed_usage, sample_locations}`.

#### `orphan-glossary-term` (info)

Glossary term has 0 occurrences in `code_terms`.

Output: `{term, source_path}`.

Possible meanings: term is genuinely unused (consider removing), or term is in user-facing strings only (which the scanner excludes by default).

#### `undefined-frequent-term` (warn)

`code_terms[<term>].count >= 10` AND term not in `ssot.context.glossary_flat` AND term is not a general programming concept.

General programming concept filter (skip if matches any):
- Common patterns: Factory, Builder, Adapter, Wrapper, Helper, Util, Service, Manager, Handler, Provider, Repository (note: Repository may be domain-specific in DDD contexts — flag for review rather than silently skip)
- HTTP/web primitives: Request, Response, Handler, Middleware, Router, Endpoint, Controller
- Data plumbing: Buffer, Stream, Queue, Channel, Event, Message, Payload, Result, Error, Exception
- Time/types: Date, Time, Duration, Timestamp, ID, UUID, Number, String, Boolean

Output: `{term, count, sample_locations, suggested_definition}`.

#### `adr-drift` (warn)

ADR text contradicts current code. Heuristics:

- ADR mentions library X (e.g., "Postgres write model") but code imports Y (e.g., `import { DynamoDB } from "@aws-sdk/client-dynamodb"` in the matching module)
- ADR mentions pattern P ("event-sourced") but code lacks the pattern's markers (no event store, no `apply()`/`mutate()` methods, etc.)
- ADR-claimed file/module no longer exists

Output: `{adr_path, adr_claim, observed, observed_locations}`.

### Wiki-layer integrity (no code scan needed)

#### `broken-wikilink` (warn)

`graph.broken_wikilinks` is non-empty. Each entry has `(source_page, broken_target)`.

Output: `{source_page, broken_target}`.

#### `orphan-page` (info)

Page in `pages` with `graph.inbound[<slug>]` empty.

Exceptions (suppressed automatically):
- `wiki/sources/code-<top-level-module>.md` — top-level entry points, may legitimately have no inbound
- `wiki/sources/adr-*.md` — ADR projections are leaf nodes, may legitimately have no inbound

Output: `{slug, area, path}`.

#### `frontmatter-violation` (warn)

A page in `pages` is missing required frontmatter or has wrong values:

- `type:` field absent or doesn't match its `area:` (e.g., page under `wiki/sources/` has `type: concept`)
- Slug prefix doesn't match expected convention:
  - `wiki/sources/code-*.md`, `adr-*.md`, `context-*.md`
  - other areas: free slug
- `created:` field absent or non-ISO-date

Output: `{slug, path, violations: [<rule>]}`.

#### `stale-source-page` (info)

`pages[<slug>]` is `code-<module>` AND `frontmatter.last_ingested_sha != ssot.modules[<module>].current_sha`.

Output: `{slug, module, last_sha, current_sha}`.

#### `stale-glossary-snapshot` (info)

`pages["context-glossary"]` exists AND `frontmatter.last_ingested_sha != git rev-list -1 -- CONTEXT.md`.

(Multi-context: applied per `wiki/sources/context-<bc>-glossary.md`.)

#### `index-mismatch` (warn)

`wiki/index.md` lists entries that don't exist in `pages`, OR `pages` has entries not listed in `wiki/index.md`.

Output: `{missing_from_index: [<slug>], missing_from_disk: [<slug>]}`.

### Source coverage

#### `missing-source-page` (info)

A module in `ssot.modules` has no matching `wiki/sources/code-<module>.md`.

Output: `{module_path}`.

#### `extra-source-page` (warn)

`wiki/sources/code-<x>.md` exists but no matching module in `ssot.modules` (module was deleted or renamed).

Output: `{slug, last_ingested_sha, suggested_action: "delete | rename"}`.

### Proposal hygiene

#### `stale-proposal` (info)

A file under `wiki/_proposals/` older than 14 days (configurable via `--stale-proposal-days <N>`).

Output: `{path, age_days, kind: "term | adr"}`.

#### `duplicate-proposal` (warn)

Two `wiki/_proposals/term-*.md` files with the same proposed term, or two `wiki/_proposals/adr-*.md` with overlapping subject (heuristic: title similarity).

Output: `{proposal_paths: [<a>, <b>], suggested_merge}`.

## Check selection

Callers select a subset:

```
ALL_CHECKS = [
  "term-conflict", "orphan-glossary-term", "undefined-frequent-term", "adr-drift",
  "broken-wikilink", "orphan-page", "frontmatter-violation",
  "stale-source-page", "stale-glossary-snapshot", "index-mismatch",
  "missing-source-page", "extra-source-page",
  "stale-proposal", "duplicate-proposal",
]

CODE_REQUIRED = ["term-conflict", "orphan-glossary-term", "undefined-frequent-term", "adr-drift"]
```

Caller-side selection logic:

```python
def selected_checks(scope, include_code):
    base = ALL_CHECKS
    if scope == "wiki": base = [c for c in base if c not in CODE_REQUIRED]
    if scope == "ssot": base = CODE_REQUIRED
    if not include_code: base = [c for c in base if c not in CODE_REQUIRED]
    return base
```

## Report grouping

Group findings by check key; within each group, sort by severity then by primary path.

```
{check-key}: {severity} ({count})
  - {one-line per finding, primary path first}
```

## Exit code

- 0 — no warns or errors
- 1 — at least one warn (or any error in `--strict` mode)
- 2 — at least one error

(Skill text reports always render, exit code is for CI/script integration.)
