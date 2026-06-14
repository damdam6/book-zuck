---
name: repo-wiki-ingest
description: 2-stage code-repository ingest. Stage A (lint) reports CONTEXT.md and ADR consistency against the current code. Stage B (extract) scans modules and writes wiki/sources, wiki/concepts, wiki/entities, plus glossary/ADR candidates to wiki/_proposals. Tokens — lint, extract, --glob <pat>, --grill.
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion, Agent]
orchestration: sequential-reducer + parallel-fan-out
---

# repo-wiki-ingest

Two-stage ingest of a target code repository. Stage A is read-only consistency lint; Stage B writes the wiki layer and proposes SSOT additions.

> Shared docs:
> - [DATA-MODEL.md](../_shared/DATA-MODEL.md)
> - [IRON-RULES.md](../_shared/IRON-RULES.md)
> - [CONTEXT-FORMAT.md](../_shared/CONTEXT-FORMAT.md)
> - [ADR-FORMAT.md](../_shared/ADR-FORMAT.md)
> - [page-scan.md](../_shared/page-scan.md) — Stage A reuses the shared scan
> - [lint-checks.md](../_shared/lint-checks.md) — Stage A reuses the SSOT-focused subset of checks

## When to run

- After meaningful code changes (new modules, refactors)
- After `/repo-wiki-setup` (first run)
- Periodically (`--lint` only) for drift monitoring

## Arguments

`$ARGUMENTS` is a single freeform string. Tokenize and match plain words; `--` prefix is an alias.

| Token | Effect |
|---|---|
| `lint` (alias `--lint`) | Stage A only |
| `extract` (alias `--extract`) | Stage B only |
| neither | Stage A → confirm → Stage B (full pipeline) |
| `--glob <pattern>` | Override scan glob. Default: `src/**/*.{ts,tsx,js,jsx,py,go,rs,java,kt,swift,rb,c,cpp,cs}` |
| `--grill` (alias `grill`) | On ambiguous extract candidate, immediately hand off to `/grill-with-docs` instead of writing a proposal file |

## Required bash commands

- `[ -d wiki ]` / `[ -f wiki/index.md ]` — pre-flight checks
- `git rev-parse HEAD` — current SHA for `wiki/_planning/modules.json`
- `git rev-list --max-count=1 HEAD -- <module-path>` — per-module last-touched SHA
- `yq -i` — frontmatter writes (mikefarah/yq)

## Procedure

### Pre-flight

```bash
[ -d wiki ] || { echo "❌ Run /repo-wiki-setup first."; exit 1; }
[ -f wiki/index.md ] || { echo "❌ wiki/index.md missing — corrupt skeleton."; exit 1; }
```

Detect mode:

- `CONTEXT-MAP.md` exists → multi-context, parse it for the context list
- Else → single-context, root `CONTEXT.md` is canonical (may be empty)

Resolve glob:

- Default: `src/**/*.{ts,tsx,js,jsx,py,go,rs,java,kt,swift,rb,c,cpp,cs}`
- `--glob` override: use the user-provided pattern
- Validate the glob produces ≥1 file; otherwise abort with a hint

### Stage A — Lint (read-only)

#### A.1 Run shared scan + checks

Run the procedure in `../_shared/page-scan.md` with `--with-code` enabled (Stage A needs `code_terms` for SSOT-vs-code drift checks). Outputs: `pages`, `ssot`, `graph`, `code_terms`.

Apply the SSOT-focused subset of checks from `../_shared/lint-checks.md`. Specifically:

- `term-conflict`, `orphan-glossary-term`, `undefined-frequent-term`, `adr-drift` — code/SSOT drift
- `missing-source-page`, `stale-source-page` — coverage gaps relevant to whether Stage B should run

Wiki-internal checks (`broken-wikilink`, `orphan-page`, `frontmatter-violation`, etc.) are out of scope for ingest's Stage A — they belong to `/repo-wiki-check`'s lint stage. Run that separately for full health.

#### A.2 Report

Group findings by check key per the format in `../_shared/lint-checks.md` "Report grouping". Header:

```
🔍 repo-wiki-ingest --lint complete  ({N} modules scanned, {F} files)
```

Then one block per non-empty check.

Append summary to `wiki/log.md`:

```
## [{YYYY-MM-DD}] ingest --lint | {N} modules, {warn-count} warns
```

#### A.3 Decision gate

If invoked with `--lint` only → stop.

Otherwise `AskUserQuestion`:

- **Continue to Stage B** (default)
- **Stop here** — review findings, fix manually, re-run later
- **Open /grill-with-docs** — drop into interactive resolution on the first warn

### Stage B — Extract (writes to wiki/* and wiki/_proposals/*)

#### B.1 Build module manifest (sequential reducer)

Enumerate target modules:

- Single-context: depth-1 dirs under `src/`
- Multi-context: depth-1 dirs under each `src/<bc>/`

For each module:

```
current_sha   = $(git rev-list --max-count=1 HEAD -- src/<module>/)
last_ingested = wiki/_planning/modules.json[<module>].last_ingested_sha   # null if absent
mode          = "create" if last_ingested is null
              | "update" if current_sha != last_ingested
              | "skip"   otherwise
```

Build the manifest as a list of `(module_path, output_slug, mode)`. Filter out `skip` rows. Persist the manifest to `wiki/_planning/.ingest-manifest.json` (so it can be replayed on failure).

ADRs are also ingest sources:

- For each `docs/adr/<nnnn>-<slug>.md` (+ per-context), check whether `wiki/sources/adr-<nnnn>-<slug>.md` exists and matches the ADR file's git SHA — same skip/create/update logic

CONTEXT snapshot is also a source:

- Compute hash of CONTEXT.md (and per-context CONTEXT.md files); compare against `wiki/_planning/modules.json["context-glossary"].last_ingested_sha`

#### B.2 Parallel fan-out (wave-based throttling)

Dispatch in waves of 10. One agent per manifest row. Each agent's prompt MUST enumerate:

- The single output paths it owns (e.g., `wiki/sources/code-<module>.md`, `wiki/concepts/<this-module-only>-*.md`, `wiki/_proposals/term-<module>-*.md`, `wiki/_proposals/adr-<module>-*.md`)
- **Forbidden paths:** other modules' outputs, `wiki/index.md`, `wiki/log.md`, `wiki/overview.md`, `wiki/_planning/`, `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`, anything under `src/`

Per-module agent procedure:

1. Read the module source (`src/<module>/**`)
2. Read `CONTEXT.md` / per-context glossary
3. Write `wiki/sources/code-<module>.md` per `_shared/templates/repo-wiki-source.md`
4. Identify abstract patterns and write each as `wiki/concepts/<module>-<pattern-slug>.md` per `_shared/templates/repo-wiki-concept.md` (one page per distinct pattern; reuse pattern slugs across modules → reducer handles the merge in B.3)
5. Identify external services/systems referenced and write each as `wiki/entities/<entity-slug>.md`
6. Per glossary candidate (frequent identifier not in glossary, passes "specific to this context" test): write `wiki/_proposals/term-<module>-<term-slug>.md` with proposed definition and the code evidence
7. Per ADR candidate (architectural shape / integration pattern / tech lock-in / boundary decision / deliberate deviation — see ADR-FORMAT.md): pre-filter with the 3-criteria check (hard-to-reverse + surprising + real-trade-off). Write only if all three pass. Path: `wiki/_proposals/adr-<module>-<slug>.md`
8. **Never** write outside the agent's declared output paths
9. **Never** touch `CONTEXT.md` / `docs/adr/` / `src/`

If `--grill` is active, instead of writing `wiki/_proposals/term-*.md` or `adr-*.md`, the agent pauses and yields the candidate back; the reducer queues it for an interactive `/grill-with-docs` invocation between waves.

#### B.3 Sequential reducer

After all waves complete:

1. **Deduplicate cross-module concept pages.** If multiple modules emitted `<module>-payment-aggregate.md` for the same underlying pattern, merge into a single `wiki/concepts/payment-aggregate.md` and update the constituent modules' `wiki/sources/code-<m>.md` to cite it.
2. **Update `wiki/index.md`** with new entries under Sources / Concepts / Entities / Proposals sections (yq + Edit).
3. **Update `wiki/_planning/modules.json`** — for each ingested row, write `{module: {last_ingested_sha: <sha>, ingested_at: <date>}}`.
4. **Append `wiki/log.md`:**
   ```
   ## [{YYYY-MM-DD}] ingest --extract | {N} sources, {C} concepts, {E} entities, {Pt} term-proposals, {Pa} adr-proposals
   - modules: {m1}, {m2}, ...
   - duration: {sec}
   ```
5. Delete `wiki/_planning/.ingest-manifest.json` (or rotate to `.ingest-manifest.last.json`).

#### B.4 Report

```
📦 repo-wiki-ingest --extract complete

Written ({N} agents, {wave-count} waves):
  - wiki/sources/: {n-new} new, {n-update} updated
  - wiki/concepts/: {n-new} new ({n-merge} merged across modules)
  - wiki/entities/: {n-new} new

Proposals (awaiting your review — NOT auto-promoted):
  - wiki/_proposals/term-*.md ({Pt})
  - wiki/_proposals/adr-*.md ({Pa})  [all passed 3-criteria pre-filter]

To promote proposals:
  - Manual: edit CONTEXT.md / docs/adr/ yourself
  - Interactive: /grill-with-docs --import wiki/_proposals/
```

## Iron rules

- Never write to `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/*.md`, or `src/`.
- Never auto-promote `wiki/_proposals/` to SSOT.
- Manifest-first, dispatch-second — every row of work is on the manifest before any agent starts.
- Single writer per output path. Per-module agent prompts must enumerate forbidden paths.
- Sequential reducer owns `wiki/index.md`, `wiki/log.md`, `wiki/_planning/*` and the cross-module concept merge.
- Wave size = 10.
- ADR proposals must pass the 3-criteria pre-filter before being written.
