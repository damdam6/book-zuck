---
name: repo-wiki-update
description: Surgical re-ingest of a single SSOT path (one code module, one ADR file, or CONTEXT.md). Regenerates the matching wiki/sources page, refreshes backlinks in pages that cite it, updates wiki/_planning sha. Wiki/* paths are refused — pass an SSOT path.
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion]
orchestration: sequential
---

# repo-wiki-update

Re-distill exactly one SSOT path. Mini version of `/repo-wiki-ingest --extract` scoped to one input. Use when you've touched one module or written one ADR and want the wiki layer in sync without scanning the whole repo.

> Shared docs:
> - [DATA-MODEL.md](../_shared/DATA-MODEL.md)
> - [IRON-RULES.md](../_shared/IRON-RULES.md)
> - [page-scan.md](../_shared/page-scan.md)

## When to run

- After editing `src/<module>/...` — `/repo-wiki-update src/<module>/`
- After writing/editing `docs/adr/<nnnn>-<slug>.md` — `/repo-wiki-update docs/adr/<file>`
- After updating `CONTEXT.md` (terms added/removed/refined) — `/repo-wiki-update CONTEXT.md`
- After updating a per-context glossary — `/repo-wiki-update src/<bc>/CONTEXT.md`

## Arguments

`$ARGUMENTS` is a single SSOT path. Required.

| Form | Effect |
|---|---|
| `src/<module>/` (trailing slash optional) | Re-distill that code module |
| `docs/adr/<nnnn>-<slug>.md` (or `src/<bc>/docs/adr/<file>`) | Re-distill that ADR |
| `CONTEXT.md` (or `src/<bc>/CONTEXT.md`) | Re-distill glossary snapshot |
| `wiki/...` | **Refused** — "wiki/* is LLM-owned. Pass an SSOT path." |
| anything else | Refused with hint |

Optional tokens:

- `--no-backlinks` — skip backlink refresh in pages that cite this source (faster, but graph may drift; `/repo-wiki-check --only cross-link` repairs later)
- `--dry-run` — show what would be written without writing

## Required bash commands

- `[ -d wiki ]` — pre-flight
- `git rev-parse HEAD`, `git rev-list --max-count=1 HEAD -- <path>` — sha capture
- `yq -i` — frontmatter writes
- `find/grep` — backlink discovery

## Procedure

### 1. Pre-flight + arg classification

```bash
[ -d wiki ] || { echo "❌ Run /repo-wiki-setup first."; exit 1; }
```

Classify the argument:

```python
def classify(path):
    if path.startswith("wiki/"): refuse()
    if path == "CONTEXT.md" or path.endswith("/CONTEXT.md"):
        return "context"
    if path.startswith("docs/adr/") or "/docs/adr/" in path:
        return "adr"
    if path.startswith("src/") and is_dir(path):
        return "code"
    refuse()
```

Resolve the corresponding `wiki/sources/` slug:

- `code` → `code-<module-name>` (module = last segment of path)
  - Multi-context: `code-<bc>-<module>` if `<bc>` differs from default
- `adr` → `adr-<nnnn>-<slug>` (parse from filename); for per-context ADRs use `adr-<bc>-<nnnn>-<slug>`
- `context` → `context-glossary` (or `context-<bc>-glossary` for per-context)

If the target wiki page does NOT yet exist, this is a "create" operation rather than "update" — proceed identically, but the report flags it.

### 2. Re-distill the source page

Read the SSOT input(s):

- **code**: read all files under `src/<module>/` matching the standard glob (or `--glob` override if added in future)
- **adr**: read the ADR file
- **context**: read CONTEXT.md (or per-context); record git SHA

Read existing `wiki/sources/<slug>.md` (if any) for prior frontmatter (preserve `created:`, replace `ingested_at:`, `last_ingested_sha:`, regenerate body).

Write `wiki/sources/<slug>.md` per `_shared/templates/repo-wiki-source.md`:

- Body: 200-400 word English distillation
- Frontmatter:
  - `created:` (preserve from existing or set now)
  - `ingested_at:` now
  - `last_ingested_sha:` current SHA of the SSOT path (`git rev-list -1 HEAD -- <path>`)
  - `source_path:` the SSOT path
  - `source_kind:` code | adr | context
  - `module:` for code only
  - `context:` for multi-context (else null)
  - `entities:` and `concepts:` populated based on what the body cites
  - `related:` — leave empty here; populated by Stage 3 below

### 3. Update derived pages (concepts, entities) for this source

If the re-distilled body identifies new or changed abstract patterns / external systems:

- New concept → write `wiki/concepts/<slug>.md` per the concept template
- New entity → write `wiki/entities/<slug>.md` per the entity template
- Existing concept/entity that this source no longer cites → leave alone (other sources may still cite; full cleanup happens in `/repo-wiki-rebuild`)

**Never** delete other pages. **Never** modify other sources' `wiki/sources/` pages — this skill is single-source-scoped.

### 4. Refresh backlinks (skipped if `--no-backlinks`)

Find every page that cites the just-updated source page:

```bash
grep -lr "\\[\\[<slug>\\]\\]" wiki/sources wiki/concepts wiki/entities wiki/synthesis
```

For each citing page:

- Recompute its `related:` frontmatter as `set(outbound) ∪ set(inbound)` for just that page (not the whole graph — partial refresh)
- Write via `yq -i`
- Touch only `related:`; never body

Cap at 50 backlinks per run; if more, report and suggest `/repo-wiki-check --only cross-link` for a full refresh.

### 5. Update wiki/_planning/modules.json

For `code` and `context` (which track SHA):

```bash
yq -p=json -o=json -i ".\"<key>\" = {\"last_ingested_sha\": \"<sha>\", \"ingested_at\": \"<date>\"}" wiki/_planning/modules.json
```

Where `<key>` is the module path (code) or `"context-glossary"` (context).

For `adr`, store under a sibling key (`wiki/_planning/adrs.json`, create if missing) with the same shape.

### 6. Update wiki/index.md and wiki/log.md

If a new page was created in Stage 2 or 3, add it to the appropriate section of `wiki/index.md`.

Append `wiki/log.md`:

```
## [{YYYY-MM-DD}] update | <ssot-path>
- target: wiki/sources/<slug>.md (created|updated)
- derived: <N> concepts, <M> entities (new), <K> backlinks refreshed
- sha: <short>
```

### 7. Report

```
🔄 repo-wiki-update <ssot-path>

Source page: wiki/sources/<slug>.md ({created|updated})
  sha: {old-short} → {new-short}

Derived:
  + wiki/concepts/<x>.md (new)
  + wiki/entities/<y>.md (new)

Backlinks refreshed: {N} pages
  - wiki/concepts/<a>.md
  - wiki/sources/code-<b>.md
  ...

Iron rule reminders:
  - CONTEXT.md / docs/adr/ unchanged (this skill never writes SSOT)
  - For graph-wide drift, run /repo-wiki-check --only cross-link
```

## Iron rules

- Argument must be an SSOT path. Wiki paths rejected.
- Writes scoped to: `wiki/sources/<slug>.md` (the one matching the arg), newly identified `wiki/concepts/` and `wiki/entities/` pages, `related:` frontmatter of backlinks (capped at 50), `wiki/_planning/modules.json` (or `.adrs.json`), `wiki/index.md`, `wiki/log.md`.
- Never writes to `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`, `src/`.
- Never deletes pages. Stale pages are surfaced by `/repo-wiki-check` for explicit user decision.
- Backlink refresh is partial (only the cited side recomputes). Full graph refresh is `/repo-wiki-check --only cross-link`.
- No proposal generation. (Proposals are batch-extracted by `/repo-wiki-ingest --extract`, not by surgical update.)
