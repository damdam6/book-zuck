---
name: repo-wiki-check
description: Bundled wiki maintenance — status (counts/delta), lint (consistency checks), and cross-link (related frontmatter refresh) in a single pass. Tokens — --only csv, --skip csv, --read-only (skips cross-link), --strict (warns become errors), --stale-proposal-days N.
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, AskUserQuestion]
orchestration: sequential-reducer + parallel-cross-link-shards
---

# repo-wiki-check

Routine maintenance pass over the target repo's wiki + SSOT. Three stages bundled into one invocation; share a single `page-scan` so the 3 outputs come at the cost of one walk.

> Shared docs:
> - [DATA-MODEL.md](../_shared/DATA-MODEL.md)
> - [IRON-RULES.md](../_shared/IRON-RULES.md)
> - [page-scan.md](../_shared/page-scan.md) — common enumeration
> - [lint-checks.md](../_shared/lint-checks.md) — check catalog

## When to run

- Routine: weekly or after a batch of ingest/update operations
- After hand-editing wiki pages (to refresh `related:` graph and catch typos in `[[wikilinks]]`)
- Before opening a PR that touches `wiki/` or SSOT (with `--strict` for CI)
- Before `/repo-wiki-rebuild` (so you know what state you're rebuilding from)

## Arguments

`$ARGUMENTS` is freeform. Tokenize and match plain words; `--` prefix is an alias.

| Token | Effect |
|---|---|
| `--only <csv>` | Run only listed stages. Stages: `status`, `lint`, `cross-link` |
| `--skip <csv>` | Skip listed stages |
| `--read-only` | Alias for `--skip cross-link` (status + lint only, no writes) |
| `--strict` | Promote `warn` to `error` (non-zero exit) |
| `--stale-proposal-days <N>` | Override the `stale-proposal` threshold (default 14) |
| `--scope <ssot\|wiki\|all>` | Lint scope (passed to `selected_checks`). Default `all` |

Mutually compatible: `--only` and `--skip` may be combined (`--skip` wins on collision). `--read-only` and `--only cross-link` is contradictory → error.

## Required bash commands

- `[ -d wiki ]` / `[ -f wiki/index.md ]` — pre-flight
- `git rev-parse HEAD`, `git rev-list --max-count=1 HEAD -- <path>` — sha checks
- `yq -i` — frontmatter writes (cross-link stage only)
- `find wiki/ -name "*.md"`, `grep -r "..." wiki/` — page enumeration
- Glob/Grep tools — code scan when lint scope includes SSOT checks

## Procedure

### 0. Pre-flight + arg parsing

```bash
[ -d wiki ] || { echo "❌ Run /repo-wiki-setup first."; exit 1; }
[ -f wiki/index.md ] || { echo "❌ wiki/index.md missing — corrupt skeleton."; exit 1; }
```

Resolve enabled stages:

```
STAGES = {"status", "lint", "cross-link"}
if --only:   STAGES = parse_csv(--only)
if --skip:   STAGES -= parse_csv(--skip)
if --read-only: STAGES -= {"cross-link"}
```

Error if `STAGES` empty.

### 1. Shared scan (always)

Run the procedure in `_shared/page-scan.md` once. Outputs: `pages`, `ssot`, `graph`, plus `code_terms` if lint is in `STAGES` AND scope includes SSOT checks (default).

Hold these in memory; all three stages consume them.

### Stage 1 — Status (read-only)

Skipped if `"status"` not in `STAGES`.

Compute counts and deltas:

**Counts** (from `pages`, `ssot`):

- SSOT: `len(ssot.context.glossary_flat)` terms; `len(ssot.adrs)` ADRs (broken down: system-wide vs per-context); `len(ssot.modules)` modules
- Wiki: `len(pages by area)` for sources/concepts/entities/synthesis
- Proposals: count `wiki/_proposals/term-*.md` and `wiki/_proposals/adr-*.md`; record oldest mtime per kind

**Deltas** (vs `wiki/_planning/.last-check.json`, if it exists):

- Per-area counts diff
- New entries since last check
- Removed entries since last check

**Activity** (last 30 days from `wiki/log.md`):

- Count log lines per operation (ingest/update/check/query/synthesis)

**Coverage** (from `ssot.modules` + `pages`):

- Modules with a `wiki/sources/code-<m>.md` page: count + %
- Missing modules: list

**Drift indicators** (cheap subset; full lint comes in Stage 2):

- Stale source pages (`stale-source-page` check, count only)
- Stale glossary snapshot (boolean)

Render the report (see "Report format" below).

### Stage 2 — Lint (read-only)

Skipped if `"lint"` not in `STAGES`.

Determine checks to run via `selected_checks(scope=--scope, include_code=(code_terms is populated))` from `_shared/lint-checks.md`.

Apply each check against `pages`, `ssot`, `graph`, `code_terms`. Collect findings grouped by check key.

Severity mapping:

- `--strict`: warn → error, info stays info
- Default: warn = warn, error = error, info = info

Render the report (see "Report format" below).

### Stage 3 — Cross-link (writes frontmatter)

Skipped if `"cross-link"` not in `STAGES`.

Refresh `related:` frontmatter on every page in `pages`. Parallel via 4 shards (one per area: sources, concepts, entities, synthesis).

**Per-shard agent procedure:**

For each page in the agent's assigned area:

1. Compute the union `related_set = set(graph.outbound[<slug>]) ∪ set(graph.inbound[<slug>])`
2. Resolve to slug refs (skip broken targets — those surface in lint, not here)
3. Dedupe; sort
4. Write `related:` frontmatter via `yq -i '.related = ["a", "b", ...]'` on the page
5. Touch no other frontmatter field; touch no body

**Forbidden paths** (in each shard agent's prompt):

- Pages outside the shard's assigned area
- `wiki/index.md`, `wiki/log.md`, `wiki/overview.md`, `wiki/_planning/`
- `wiki/_proposals/`
- `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`, `src/`

**Sequential reducer** (after all shards complete):

- Count pages updated per area
- Track total wall time
- (No `wiki/index.md` change — cross-link doesn't add/remove pages)

### 2. Finalize

Append a single combined entry to `wiki/log.md`:

```
## [{YYYY-MM-DD}] check | stages={STAGES} | warns={W} errors={E} cross-linked={X}
- duration: {sec}
```

Write `wiki/_planning/.last-check.json` snapshot (for next-run delta):

```json
{
  "ran_at": "{ISO}",
  "stages": ["status", "lint", "cross-link"],
  "counts": { "sources": 47, "concepts": 19, ... }
}
```

### 3. Exit code

- 2 — any error finding (or `--strict` and any warn)
- 1 — any warn finding
- 0 — clean

## Report format

```
🩺 repo-wiki-check  (stages: {STAGES})

[Stage 1/3] Status
  SSOT
    CONTEXT terms: 27  (+3 since last check)
    ADRs: 12 — system 4, ordering 3, billing 5
    Modules: 41

  Wiki
    sources/: 47 (+5)   concepts/: 19 (+2)   entities/: 8   synthesis/: 3
    Proposals: 6 term + 2 adr  (oldest term: 23d, oldest adr: 8d)

  Coverage
    Modules with wiki/sources/code-* page: 38 / 41 (92%)
    Missing: src/notifications/, src/analytics/, src/legacy-billing/

  Activity (30d): ingest 4 · update 11 · check 3 · query 12 (→ 2 synthesis)

[Stage 2/3] Lint  (scope: all, code-scan: yes)
  term-conflict: warn (2)
    - Customer  glossary "person/org", code uses as auth principal (src/auth/middleware.ts:18)
    - Order     glossary "request for goods", code uses as DB row (src/orders/repository.ts:42)
  adr-drift: warn (1)
    - docs/adr/0003-postgres.md  claims Postgres write model; code imports DynamoDB (src/orders/event-store.ts:5)
  broken-wikilink: warn (3)
    - wiki/sources/code-billing.md → [[payment-aggregate]] (target missing)
    - wiki/concepts/order-saga.md → [[fulfillment-tracker]] (target missing)
    - wiki/synthesis/cqrs-vs-event-sourcing.md → [[cqrs]] (target missing)
  stale-source-page: info (4)
    - code-orders, code-billing, code-payments, code-inventory
  stale-proposal: info (3)
    - wiki/_proposals/term-payment-intent.md (23d)
    - wiki/_proposals/adr-event-bus-choice.md (19d)
    - wiki/_proposals/term-cart.md (17d)

[Stage 3/3] Cross-link
  sources/:   12 pages refreshed
  concepts/:  5 pages refreshed
  entities/:  2 pages refreshed
  synthesis/: 1 page refreshed
  wave: 4 shards × parallel | 1.8s

✅ check complete (8.3s) — 2 stages read-only, 1 stage wrote frontmatter
   2 warns | 0 errors | 8 info
   wiki/log.md updated
```

## Iron rules

- Stage 1 (status) and Stage 2 (lint) are strictly read-only.
- Stage 3 (cross-link) writes only the `related:` field of each page's frontmatter. Never touches body, other frontmatter fields, or any non-page file.
- Single shared scan (`_shared/page-scan.md`). Never re-scan within a single invocation.
- Forbidden paths in cross-link shards include all of `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`, `src/`, and out-of-area wiki pages.
- `wiki/_planning/.last-check.json` is for delta-rendering only; never authoritative.
- Cross-link is parallel by shard but the reducer (log + snapshot) is sequential.
