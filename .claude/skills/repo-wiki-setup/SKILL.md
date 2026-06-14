---
name: repo-wiki-setup
description: Bootstrap repo-wiki structure (wiki/, docs/adr/, templates/) in a code repository. Detects single vs multi-context via CONTEXT-MAP.md. Refuses if wiki/ already exists. Never overwrites existing CONTEXT.md, CONTEXT-MAP.md, or docs/adr/*.md.
allowed-tools: [Read, Write, Bash, Edit, AskUserQuestion]
orchestration: sequential
---

# repo-wiki-setup

Bootstraps the repo-wiki layout in a code repository. Creates the LLM `wiki/` skeleton and `docs/adr/` placeholder; leaves any existing SSOT files (`CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/*.md`) untouched.

> Shared docs (resolve via `../_shared/`):
> - [DATA-MODEL.md](../_shared/DATA-MODEL.md)
> - [IRON-RULES.md](../_shared/IRON-RULES.md)
> - [CONTEXT-FORMAT.md](../_shared/CONTEXT-FORMAT.md)
> - [ADR-FORMAT.md](../_shared/ADR-FORMAT.md)

## When to run

- New code repository adopting repo-wiki for the first time
- After `/link-vault repo-wiki copy` (or symlink) in the target repo

## Refuse conditions

Refuse if ANY of these exist in cwd:

- `wiki/` directory
- `templates/repo-wiki-source.md` (or any `repo-wiki-*.md` template)

Existence of `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/` is OK — they're SSOT, may pre-exist. Setup will NOT overwrite them, only fill in what's missing.

## Required bash commands

This skill writes to the target repo (not the source vault). Allow:

- `mkdir -p wiki/{sources,entities,concepts,synthesis,_proposals,_planning}`
- `mkdir -p docs/adr templates`
- `touch docs/adr/.gitkeep`
- `git rev-parse --is-inside-work-tree` (to detect a repo)
- `git rev-parse HEAD` (for the initial log entry's SHA, if a git repo)

## Procedure

### 1. Pre-flight

```bash
cwd=$(pwd)

# Refuse if invoked from the vault that owns this skill
if [ -f "$cwd/raw/agent-toolkit/_external-manifest.json" ]; then
  echo "❌ Refused — looks like you're in the source vault, not a target repo."
  exit 1
fi

# Refuse if wiki/ already exists
if [ -d "$cwd/wiki" ]; then
  echo "❌ Refused — wiki/ already exists. Use /repo-wiki-update or /repo-wiki-rebuild instead."
  exit 1
fi
```

### 2. Detect context model

Auto-detect:

- `CONTEXT-MAP.md` exists → **multi-context**
- Root `CONTEXT.md` exists → **single-context**
- Neither exists → ask the user

`AskUserQuestion` with two options:

- **Single context** (recommended for most repos) — creates an empty `CONTEXT.md` stub at root
- **Multi-context** — creates `CONTEXT-MAP.md` stub with an example sub-context listing

### 3. Create wiki/ skeleton

```bash
mkdir -p wiki/sources wiki/entities wiki/concepts wiki/synthesis wiki/_proposals wiki/_planning
```

Write:

- **`wiki/index.md`**
  ```md
  ---
  type: index
  created: {YYYY-MM-DD}
  ---

  # Wiki Index

  ## Sources
  _(populated by /repo-wiki-ingest)_

  ## Concepts
  _(populated by /repo-wiki-ingest)_

  ## Entities
  _(populated by /repo-wiki-ingest)_

  ## Synthesis
  _(populated by /repo-wiki-query when offered)_

  ## Proposals (awaiting promotion to SSOT)
  _(populated by /repo-wiki-ingest --extract)_
  ```

- **`wiki/log.md`**
  ```md
  # Wiki Log

  ## [{YYYY-MM-DD}] setup | repo-wiki initialized
  - context mode: {single|multi}
  - git sha: {sha or "(not a git repo)"}
  ```

- **`wiki/overview.md`**
  ```md
  ---
  type: overview
  created: {YYYY-MM-DD}
  ---

  # Repo Overview

  _(evolves as /repo-wiki-ingest --extract runs over the codebase)_
  ```

- **`wiki/_planning/modules.json`**
  ```json
  {}
  ```

### 4. Create docs/adr/

```bash
mkdir -p docs/adr
[ -f docs/adr/.gitkeep ] || touch docs/adr/.gitkeep
```

Never delete or overwrite existing `docs/adr/0001-*.md` files.

### 5. Create CONTEXT.md or CONTEXT-MAP.md if missing

**Single-context mode, `CONTEXT.md` missing:** write an empty CONTEXT.md stub modeled on `_shared/CONTEXT-FORMAT.md`:

```md
# {Repo Name}

{One-line description.}

## Language

_(define terms here as `/grill-with-docs` resolves them)_

## Relationships

_(express cardinality between terms)_
```

**Multi-context mode, `CONTEXT-MAP.md` missing:** write a stub:

```md
# Context Map

## Contexts

- [Example](./src/example/CONTEXT.md) — placeholder; replace with your bounded contexts

## Relationships

_(populate as contexts get defined)_
```

Never overwrite if already present.

### 6. Copy templates

The skill's deployed location is `<repo>/.claude/skills/repo-wiki/repo-wiki-setup/SKILL.md`. The shared templates live at `<repo>/.claude/skills/repo-wiki/_shared/templates/`. Locate and copy:

```bash
script_dir="$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")"
shared_templates="${script_dir}/../_shared/templates"

mkdir -p templates
cp "${shared_templates}/repo-wiki-source.md" templates/
cp "${shared_templates}/repo-wiki-entity.md" templates/
cp "${shared_templates}/repo-wiki-concept.md" templates/
cp "${shared_templates}/repo-wiki-synthesis.md" templates/
```

If `script_dir` resolution fails (some deploy modes have no shell `$0`), fall back to reading the templates via the `Read` tool against the deployed path and writing them via `Write` — the path is `.claude/skills/repo-wiki/_shared/templates/repo-wiki-*.md`.

### 7. Optionally extend the target repo's CLAUDE.md

Ask the user: "Add a `repo-wiki` section to your CLAUDE.md? (recommended)"

If yes and CLAUDE.md exists, append:

```md
## repo-wiki

This repo uses the repo-wiki skill family. SSOT is `src/`, `CONTEXT.md`, and `docs/adr/`. LLM-distilled knowledge lives under `wiki/` and is owned by the skills — do not hand-edit `wiki/sources/`, `wiki/concepts/`, `wiki/entities/`, `wiki/synthesis/`, or `wiki/_planning/`. Proposals in `wiki/_proposals/` are review candidates; promote via manual edit or `/grill-with-docs --import wiki/_proposals/`.

See `.claude/skills/repo-wiki/_shared/IRON-RULES.md` for invariants.
```

If yes and CLAUDE.md is missing, ask whether to create one. Default: skip (CLAUDE.md is user-curated).

### 8. Report

```
✅ repo-wiki initialized
- context mode: {single|multi}
- created: wiki/{index,log,overview}.md, wiki/_planning/modules.json
- created: docs/adr/.gitkeep
- created: templates/repo-wiki-{source,entity,concept,synthesis}.md
- {created|skipped (exists)}: CONTEXT.md|CONTEXT-MAP.md
- {appended|skipped}: CLAUDE.md repo-wiki section

Next:
  /repo-wiki-ingest --lint     # check CONTEXT/ADR vs code drift
  /repo-wiki-ingest --extract  # populate wiki/ and wiki/_proposals/
```

## Iron rules

- Never overwrite existing `CONTEXT.md`, `CONTEXT-MAP.md`, or `docs/adr/*.md`.
- Never create or modify `CLAUDE.md` without explicit user opt-in.
- Refuse on existing `wiki/`.
- Templates are copied (not symlinked) into the target repo so the repo is self-contained after setup.
