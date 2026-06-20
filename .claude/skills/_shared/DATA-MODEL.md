# repo-wiki Data Model

3-layer model for code repositories using the `repo-wiki` skill family.

## Layers

### SSOT layer (human/grill-authored, slow-moving)

`repo-wiki` reads, never writes.

- **`src/`** — code (canonical implementation)
- **`CONTEXT.md`** (root, single-context mode) — domain glossary per [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md)
- **`CONTEXT-MAP.md`** (root, multi-context only) — lists per-context CONTEXT.md locations
- **`src/<bc>/CONTEXT.md`** (multi-context only) — per-bounded-context glossary
- **`docs/adr/0001-<slug>.md`** — system-wide ADRs per [ADR-FORMAT.md](./ADR-FORMAT.md)
- **`src/<bc>/docs/adr/`** (multi-context only) — per-context ADRs

### LLM-owned distillation layer (ephemeral, re-buildable)

`wiki/` is central, even in multi-context repos. Multi-context uses slug prefixes (e.g., `bc-ordering-aggregate.md`, `bc-billing-aggregate.md`).

- `wiki/index.md` — master catalog
- `wiki/log.md` — append-only operation log
- `wiki/overview.md` — evolving high-level synthesis
- `wiki/sources/<slug>.md` — 1 page per ingest source:
  - `code-<module>.md` — code module distillation
  - `adr-<num>-<slug>.md` — ADR projection (each ADR gets a wiki-side digest)
  - `context-glossary.md` — CONTEXT.md snapshot
- `wiki/concepts/<slug>.md` — abstract patterns extracted from code
- `wiki/entities/<slug>.md` — people, services, external systems
- `wiki/synthesis/<slug>.md` — cross-cutting analyses
- `wiki/_proposals/` — ingest extract candidates awaiting promotion
  - `term-<x>.md` — candidate glossary additions
  - `adr-<y>.md` — candidate ADRs (grill-with-docs 3-criteria pre-filtered)
- `wiki/_planning/` — skill bookkeeping (never hand-edited):
  - `modules.json` — `module-path → {last_ingested_sha, ingested_at}` map, **keyed by module path** (e.g. `"src/components"`), plus the special `"context-glossary"` key for the CONTEXT.md snapshot. Never keyed by slug/name.
  - `adrs.json` — `adr-path → {last_ingested_sha, ingested_at}` map (e.g. `"docs/adr/0001-x.md"`). ADR SHA tracking lives here, not in `modules.json`.
  - `.ingest-manifest.json` / `.ingest-manifest.last.json` — `/repo-wiki-ingest` extract manifest (live, then rotated on success).
  - `.last-check.json` — `/repo-wiki-check` delta snapshot for next-run diffing.
  - `.rebuild-manifest.jsonl`, `.rebuild-{entities,concepts,synthesis}.todo.jsonl`, `.phase-*-complete` — `/repo-wiki-rebuild` transient pipeline state (cleaned up in finalize).

  > **Key convention:** `modules.json` (code + `context-glossary`) and `adrs.json` (ADRs) are keyed by SSOT path. `/repo-wiki-ingest`, `/repo-wiki-update`, and `/repo-wiki-rebuild` all read/write with these identical key shapes.

### Deployment layer

- `<repo>/.claude/skills/repo-wiki/` — bundle-as-directory deploy via `/link-vault repo-wiki copy`. Claude Code recursively discovers nested `SKILL.md` files. Slash command names come from each `SKILL.md` frontmatter `name:` field.

## Ingest unification

Every SSOT change → 1 page in `wiki/sources/`. ADR ingest = code ingest = CONTEXT diff ingest at the pipeline level: read source, write digest page, derive entities/concepts, propose terms/ADRs.

## Promotion path

`wiki/_proposals/term-*.md` and `wiki/_proposals/adr-*.md` are NEVER auto-promoted by repo-wiki. The user reviews and either:

- Manually edits `CONTEXT.md` / `docs/adr/`
- Runs `/grill-with-docs --import wiki/_proposals/` for interactive resolution

repo-wiki itself never writes to `CONTEXT.md`, `CONTEXT-MAP.md`, or `docs/adr/`.
