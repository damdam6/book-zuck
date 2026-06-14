---
name: repo-wiki-rebuild
description: Full destructive rebuild of wiki/ from SSOT (src/ + CONTEXT.md + docs/adr/). Wipes wiki/sources/, wiki/entities/, wiki/concepts/, wiki/synthesis/, then regenerates via parallel C1 manifest pipeline. Preserves wiki/_proposals/, wiki/log.md (append), wiki/overview.md. USER-CONFIRMED ONLY — requires explicit confirmation, git tag + branch backup.
allowed-tools: [Read, Write, Bash, Edit, Grep, Glob, Agent, AskUserQuestion]
orchestration: parallel-c1-manifest
---

# repo-wiki-rebuild

Wipe-and-regenerate the LLM-distilled layer (`wiki/sources/`, `wiki/entities/`, `wiki/concepts/`, `wiki/synthesis/`) from SSOT. Used when the wiki has drifted badly, when templates change, or after large SSOT imports.

DESTRUCTIVE. Always create a git tag + branch before running.

> Shared docs:
> - [DATA-MODEL.md](../_shared/DATA-MODEL.md)
> - [IRON-RULES.md](../_shared/IRON-RULES.md)
> - [page-scan.md](../_shared/page-scan.md) — used for SSOT enumeration in manifest phase
> - [lint-checks.md](../_shared/lint-checks.md) — post-rebuild verification

## When to run

- Template schema changed (`templates/repo-wiki-*.md` modified) — every page needs regeneration
- Large SSOT import (many ADRs added, big module refactor, glossary overhaul)
- Wiki drifted badly from SSOT, incremental `/repo-wiki-update` is impractical
- Migration between vault/skill versions

## When NOT to run

- Single module changed → `/repo-wiki-update src/<module>/`
- Hand-edited a few wiki pages → `/repo-wiki-check --only cross-link` is enough
- Just want to see drift → `/repo-wiki-check` (read-only)

## Arguments

| Token | Effect |
|---|---|
| `--dry-run` | Show manifest + projected wipe list without executing |
| `--no-synthesis` | Skip Phase 6 (synthesis discovery) |
| `--wave-size N` | Override wave size (default 10) |
| `--keep-overview` | Preserve `wiki/overview.md` (default behavior; explicit token for clarity) |
| `--regenerate-overview` | Regenerate `wiki/overview.md` from rebuilt content (opt-in; will overwrite user edits) |

## Required bash commands

- `[ -d wiki ]` / `[ -f wiki/index.md ]` — pre-flight
- `git rev-parse --is-inside-work-tree` — require git repo (for backup)
- `git status --porcelain` — uncommitted-change check
- `git tag <tag>` + `git checkout -b <branch>` — backup before destructive
- `rm -rf wiki/sources wiki/entities wiki/concepts wiki/synthesis` — wipe (target repo, not vault — bash filesystem ops allowed)
- `mkdir -p wiki/{sources,entities,concepts,synthesis,_planning}` — recreate
- `git rev-list --max-count=1 HEAD -- <path>` — per-source SHA
- `yq -i` — frontmatter writes
- `touch wiki/_planning/.phase-N-complete` — sentinel barriers

## Pipeline overview

```
Phase 0   Confirm + backup (sequential)
Phase 1   Wipe (sequential)
Phase 2   Build manifest (sequential reducer)
Phase 3   Sources fan-out (parallel × N agents, waves of 10)        ← C1 phase
Phase 4   Entities/concepts reducer (sequential)
Phase 5   Entities/concepts fan-out (parallel × M agents)            ← C2 phase
Phase 6   Cross-link (parallel × 4 shards)                           ← D phase
Phase 7   Synthesis discovery (parallel × K candidates, opt-out)
Phase 8   Finalize: rebuild index.md, append log.md, write _planning
```

Sentinel files: `wiki/_planning/.phase-N-complete` written by the sequential step that closes each phase. The next phase verifies the sentinel before starting.

## Procedure

### Phase 0 — Confirm + backup

#### 0.1 Pre-flight

```bash
[ -d wiki ] || { echo "❌ Run /repo-wiki-setup first."; exit 1; }
[ -f wiki/index.md ] || { echo "❌ wiki/index.md missing — corrupt skeleton."; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "❌ Not a git repo. Rebuild requires git for backup. Aborting."; exit 1;
}
```

#### 0.2 Show wipe scope

Run the shared scan from `_shared/page-scan.md`. Report:

```
🩻 repo-wiki rebuild — PRE-FLIGHT

Will WIPE:
  wiki/sources/    : 47 files
  wiki/entities/   : 8 files
  wiki/concepts/   : 19 files
  wiki/synthesis/  : 3 files
  total: 77 files, X.X MB

Will PRESERVE:
  wiki/index.md            (rebuilt at end)
  wiki/log.md              (append-only)
  wiki/overview.md         ({preserved | will regenerate per --regenerate-overview})
  wiki/_proposals/         : 6 files (user-owned)
  wiki/_planning/          (rebuilt)
  CONTEXT.md, CONTEXT-MAP.md, docs/adr/, src/  (SSOT — never touched)

Manifest preview ({total} sources):
  code modules: {N}
  ADRs:         {M}
  context glossaries: {K}

Backup that will be created:
  git tag    : repo-wiki-rebuild-pre-{YYYY-MM-DD-HH-MM}
  git branch : repo-wiki-rebuild-{YYYY-MM-DD-HH-MM}
```

If `--dry-run`, stop here.

#### 0.3 Uncommitted-change guard

```bash
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️ Working tree has uncommitted changes."
  # AskUserQuestion: "Stash, commit, or abort?"
fi
```

#### 0.4 Explicit confirmation

`AskUserQuestion`:

- **Proceed with wipe + rebuild** (default: NO)
- **Abort**

Require an explicit "yes" type answer. Default = abort.

#### 0.5 Backup

```bash
ts=$(date +%Y-%m-%d-%H-%M)
git tag "repo-wiki-rebuild-pre-${ts}"
git checkout -b "repo-wiki-rebuild-${ts}"
```

Report the tag and branch names; surface the rollback command:

```
ℹ️ Rollback: git reset --hard repo-wiki-rebuild-pre-{ts}
```

### Phase 1 — Wipe (sequential)

```bash
rm -rf wiki/sources wiki/entities wiki/concepts wiki/synthesis
mkdir -p wiki/sources wiki/entities wiki/concepts wiki/synthesis wiki/_planning

# Reset _planning state (but keep _proposals/)
rm -f wiki/_planning/modules.json wiki/_planning/adrs.json \
      wiki/_planning/.phase-*-complete wiki/_planning/.rebuild-manifest.jsonl \
      wiki/_planning/.last-check.json
echo '{}' > wiki/_planning/modules.json
```

`wiki/_proposals/` is preserved — those files are user-owned candidates.

Write sentinel:

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ" > wiki/_planning/.phase-1-complete
```

### Phase 2 — Build manifest (sequential reducer)

Re-run `_shared/page-scan.md` SSOT side (without `--with-code`; `code_terms` only matters for lint, not rebuild). From `ssot.modules`, `ssot.adrs`, `ssot.context.files`, build manifest rows:

**Manifest row schema (`wiki/_planning/.rebuild-manifest.jsonl`, one JSON per line):**

```json
{
  "id": "0001",
  "kind": "code",
  "src": "src/orders",
  "slug": "code-orders",
  "context": null,
  "sha": "abc1234",
  "title": "Orders module"
}
```

Kinds:

- `code` — one row per `src/<module>` (single) or `src/<bc>/<module>` (multi). `slug = "code-<module>"` or `"code-<bc>-<module>"`
- `adr` — one row per `docs/adr/<nnnn>-<slug>.md` or `src/<bc>/docs/adr/<nnnn>-<slug>.md`. `slug = "adr-<nnnn>-<slug>"` or `"adr-<bc>-<nnnn>-<slug>"`
- `context` — one row per `CONTEXT.md` (root in single mode; per `src/<bc>/CONTEXT.md` in multi). `slug = "context-glossary"` or `"context-<bc>-glossary"`

Assign sequential `id` (4-digit zero-padded). Sort: code → adr → context for deterministic order. Write to `wiki/_planning/.rebuild-manifest.jsonl`.

Report:

```
📋 Manifest built: {total} rows
  - code:    {N}
  - adr:     {M}
  - context: {K}
```

Sentinel:

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ" > wiki/_planning/.phase-2-complete
```

### Phase 3 — Sources fan-out (parallel, waves of `--wave-size`)

Verify `.phase-2-complete` exists.

Dispatch one agent per manifest row. Wave size default 10.

**Per-agent prompt template:**

```
You are writing a SINGLE wiki source page. Manifest row:

{json row}

Procedure:
1. Read the SSOT at <src>.
2. Write wiki/sources/<slug>.md per templates/repo-wiki-source.md.
   Frontmatter:
     - title: <title>
     - type: source
     - source_path: <src>
     - source_kind: <kind>
     - module: <module-name> (code only, else null)
     - context: <context> (multi-context only, else null)
     - last_ingested_sha: <sha>
     - created: today
     - ingested_at: today
     - entities: []      (populate with slugs you identify)
     - concepts: []      (populate with slugs you identify)
     - related: []       (left empty; Phase 6 fills this)
   Body: 200-400 word English distillation.
3. Write wiki/_extracts/<slug>.yaml — see schema below.

FORBIDDEN paths (do not read, do not write):
  - wiki/sources/<any-other-slug>.md
  - wiki/entities/, wiki/concepts/, wiki/synthesis/
  - wiki/index.md, wiki/log.md, wiki/overview.md
  - wiki/_planning/ (except your own _extracts file)
  - wiki/_proposals/
  - CONTEXT.md, CONTEXT-MAP.md, docs/adr/, src/  (SSOT — read-only allowed, never write)
  - manifest file
  - any other manifest row's outputs
```

**`wiki/_extracts/<slug>.yaml` schema** (per-source extraction summary for Phase 4 reducer):

```yaml
slug: code-orders
entities:                            # candidates this source identified
  - slug: stripe
    kind: external-system
    mentions: 7
  - slug: payment-gateway
    kind: service
    mentions: 3
concepts:                            # abstract patterns this source identified
  - slug: aggregate-root
    mentions: 4
  - slug: event-sourcing
    mentions: 12
```

After a wave completes, write a per-wave sentinel:

```bash
touch wiki/_planning/.phase-3-wave-{N}-complete
```

When all waves complete (total agents == total manifest rows):

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ" > wiki/_planning/.phase-3-complete
```

### Phase 4 — Entities/concepts reducer (sequential)

Verify `.phase-3-complete` exists.

Read every `wiki/_extracts/*.yaml`. Aggregate:

```
entity_index[<slug>] = {
  kind: <kind>,                     # consensus across sources (warn on conflict)
  sources: [<source-slug>, ...],    # which sources mentioned it
  total_mentions: <int>,
}

concept_index[<slug>] = {
  sources: [<source-slug>, ...],
  total_mentions: <int>,
}
```

**Promotion threshold:** an entity or concept becomes its own page only when mentioned by ≥ 2 sources OR total_mentions ≥ 5 in a single source. Below threshold = stays as inline mention in source page only, no dedicated page.

Write the work-list files:

- `wiki/_planning/.rebuild-entities.todo.jsonl`
- `wiki/_planning/.rebuild-concepts.todo.jsonl`

Each row:

```json
{"slug": "stripe", "kind": "external-system", "sources": ["code-orders", "code-billing"], "total_mentions": 9}
```

Sentinel:

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ" > wiki/_planning/.phase-4-complete
```

### Phase 5 — Entities/concepts fan-out (parallel)

Verify `.phase-4-complete` exists.

Dispatch one agent per `.rebuild-entities.todo.jsonl` row AND one per `.rebuild-concepts.todo.jsonl` row. Single-writer rule: each agent owns exactly one output path.

**Per-entity agent prompt:**

```
Write wiki/entities/<slug>.md per templates/repo-wiki-entity.md.

Sources that cite this entity: <list>. Read those wiki/sources/*.md pages first to collect what they say.

Frontmatter:
  - title, type: entity, kind: <kind>, context: <bc-or-null>, created: today
  - related: []   (Phase 6 fills)

Body: one-line identity + "Sources" section listing the cited wiki/sources pages + "Code touchpoints" (file:line references gathered from the sources).

FORBIDDEN paths:
  - wiki/entities/<any-other-slug>.md
  - wiki/concepts/, wiki/sources/, wiki/synthesis/  (read-only for sources OK)
  - wiki/index.md, wiki/log.md, wiki/overview.md, wiki/_planning/, wiki/_proposals/
  - SSOT paths (CONTEXT.md, docs/adr/, src/) — read-only OK
```

**Per-concept agent prompt:** analogous, writes `wiki/concepts/<slug>.md` per `templates/repo-wiki-concept.md`.

Wave size = `--wave-size` (default 10).

Sentinel after all complete:

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ" > wiki/_planning/.phase-5-complete
```

### Phase 6 — Cross-link (parallel × 4 shards)

Verify `.phase-5-complete` exists.

Reuse the cross-link logic from `/repo-wiki-check` Stage 3 verbatim:

- 4 shards: `sources`, `concepts`, `entities`, `synthesis` (synthesis pages don't exist yet on first rebuild — skip if empty)
- Each shard agent computes `related = inbound ∪ outbound` from `[[wikilinks]]` in bodies and writes only `related:` frontmatter via `yq -i`

Forbidden paths per shard: identical to `/repo-wiki-check` Stage 3.

Sentinel:

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ" > wiki/_planning/.phase-6-complete
```

### Phase 7 — Synthesis discovery (parallel, opt-out via `--no-synthesis`)

Verify `.phase-6-complete` exists. Skip whole phase if `--no-synthesis`.

#### 7.1 Cluster discovery (sequential)

Scan `wiki/concepts/*.md`. Identify clusters where multiple concepts share strong cross-references (heuristic: ≥ 3 concept pages mutually cite each other within 2 hops via `related:`). Each cluster is a synthesis candidate.

Write candidates to `wiki/_planning/.rebuild-synthesis.todo.jsonl`:

```json
{"slug": "cqrs-vs-event-sourcing", "concepts": ["cqrs", "event-sourcing", "command-handler", "projection"], "rationale": "<short>"}
```

Cap at 10 candidates per rebuild (keep synthesis sparse).

#### 7.2 Synthesis fan-out (parallel)

One agent per candidate. Writes `wiki/synthesis/<slug>.md` per `templates/repo-wiki-synthesis.md`. Body answers "what cross-cutting story do these concepts tell?".

Forbidden: anything outside its own synthesis page.

Sentinel:

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ" > wiki/_planning/.phase-7-complete
```

### Phase 8 — Finalize (sequential)

#### 8.1 Rebuild `wiki/index.md`

Enumerate all pages in `wiki/{sources,entities,concepts,synthesis}/`. Generate index with sections grouped by area, sorted alphabetically by slug. Preserve the frontmatter shape from `/repo-wiki-setup`.

#### 8.2 Populate `wiki/_planning/modules.json`

For each code-kind manifest row, write `{<module-path>: {last_ingested_sha, ingested_at}}`. Similarly populate `wiki/_planning/adrs.json` and the `context-glossary` entry.

#### 8.3 (Conditional) Regenerate `wiki/overview.md`

Only if `--regenerate-overview` was passed. Otherwise leave as-is. If regenerating: synthesize a 1-paragraph repo overview citing the top-cited concepts and entities (no new wikilinks introduced beyond what already exists).

#### 8.4 Append `wiki/log.md`

```
## [{YYYY-MM-DD}] rebuild | full
- backup tag:    repo-wiki-rebuild-pre-{ts}
- backup branch: repo-wiki-rebuild-{ts}
- manifest rows: {total} ({N} code, {M} adr, {K} context)
- pages written: {S} sources, {E} entities, {C} concepts, {Y} synthesis
- duration:      {sec}
- overview:      {preserved | regenerated}
```

#### 8.5 Cleanup transient files

```bash
rm -f wiki/_planning/.phase-*-complete \
      wiki/_planning/.rebuild-manifest.jsonl \
      wiki/_planning/.rebuild-entities.todo.jsonl \
      wiki/_planning/.rebuild-concepts.todo.jsonl \
      wiki/_planning/.rebuild-synthesis.todo.jsonl \
      wiki/_planning/.phase-3-wave-*-complete
rm -rf wiki/_extracts
```

#### 8.6 Post-rebuild verification

Automatically invoke `/repo-wiki-check --only lint` (read-only). Surface any errors/warns inline:

```
🔎 Post-rebuild lint:
  broken-wikilink: 0
  frontmatter-violation: 0
  index-mismatch: 0
  ...
```

If errors → exit code 2 with a "rebuild produced inconsistencies; investigate before merging the branch" hint.

#### 8.7 Final report

```
✅ repo-wiki rebuild complete

Backup:
  tag    repo-wiki-rebuild-pre-{ts}
  branch repo-wiki-rebuild-{ts}   ← you are here

Generated:
  wiki/sources/   : {S}
  wiki/entities/  : {E}
  wiki/concepts/  : {C}
  wiki/synthesis/ : {Y}

Preserved untouched:
  wiki/_proposals/ : 6 files
  wiki/overview.md : ({preserved|regenerated})

Verification: ({pass | N warns | N errors})

Next steps:
  - Review the rebuild branch
  - If satisfied: git checkout main && git merge repo-wiki-rebuild-{ts}
  - If not: git reset --hard repo-wiki-rebuild-pre-{ts} && git branch -D repo-wiki-rebuild-{ts}
```

## Iron rules

- **User confirmation required.** Wipe never proceeds without explicit "Proceed" answer; default answer is "Abort".
- **Git backup mandatory.** Tag + branch created before any wipe. Refuse outright if not in a git repo.
- **Uncommitted-change guard.** Warn (and offer stash/commit/abort) if working tree is dirty.
- **SSOT never touched.** Phase 1 wipe and all subsequent writes skip `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`, `src/`.
- **`wiki/_proposals/` preserved.** User-owned candidates never wiped.
- **`wiki/overview.md` preserved by default.** Regeneration opt-in via `--regenerate-overview` (will overwrite user edits).
- **Sentinel files gate every phase.** No phase starts without its predecessor's `.phase-N-complete` file present.
- **Single writer per output file** in every parallel phase. Forbidden paths enumerated in every agent prompt.
- **Sequential reducers** own manifests, sentinels, todo files, `wiki/index.md`, `wiki/log.md`, `wiki/_planning/*.json`.
- **Wave size capped** (`--wave-size`, default 10) for parallel phases (3, 5, 7).
- **Post-rebuild verification** runs `/repo-wiki-check --only lint` and surfaces errors. Rebuild branch should not be merged if errors persist.
- **Transient `wiki/_extracts/` and `.phase-*` markers cleaned up** in finalize. Manifest JSONL files are also removed after successful completion.
- **Rollback is `git reset --hard <pre-tag>`** — always shown in the final report.

## Backout

If anything goes wrong mid-rebuild (interrupted, agent failures, bad results):

```bash
# Hard rollback to pre-rebuild state
git reset --hard repo-wiki-rebuild-pre-{ts}

# Optional: delete the abandoned branch
git checkout main
git branch -D repo-wiki-rebuild-{ts}

# Sentinel + transient cleanup (in case reset didn't catch all)
rm -f wiki/_planning/.phase-*-complete wiki/_planning/.rebuild-*.jsonl
rm -rf wiki/_extracts
```

## Comparison with `/repo-wiki-update` and `/repo-wiki-ingest --extract`

| Axis | `update <path>` | `ingest --extract` | `rebuild` |
|---|---|---|---|
| Scope | 1 SSOT path | All modules (+ ADRs, CONTEXT) | All SSOT, all pages |
| Destructive | No (in-place update) | No (additive, dedupe) | YES (wipes first) |
| Agents | 1 (sequential) | N modules × wave | N+M parallel waves through 8 phases |
| Proposals | Not generated | Generated | NOT generated (rebuild is reproductive, not exploratory) |
| Git backup | No | No | REQUIRED |
| Cross-link | Partial (per touched page) | Optional follow-up `/repo-wiki-check` | Phase 6 always runs |
| Synthesis | No | No | Phase 7 (opt-out) |
| Use case | After 1 commit | Initial fill, periodic | Schema change, drift, mass import |
