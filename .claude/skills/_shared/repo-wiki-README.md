# repo-wiki

Skill family that brings the LLM Wiki pattern to code repositories. Combines [grill-with-docs](../grill-with-docs/SKILL.md) SSOT (CONTEXT.md + ADRs) with an LLM-distilled `wiki/` layer per-repo.

## Quick deploy

In the target code repository:

```
/link-vault repo-wiki copy          # deploys the whole bundle (requires /link-vault bundle-as-dir support)
/repo-wiki-setup                    # bootstrap wiki/ + docs/adr/ + templates/
/repo-wiki-ingest --lint            # report CONTEXT/ADR drift vs current code
/repo-wiki-ingest --extract         # populate wiki/sources, concepts, entities + _proposals
/repo-wiki-query "<question>"       # ask, get cited answers
/repo-wiki-update src/<module>/     # re-distill one module after a code change
/repo-wiki-check                    # routine maintenance — status + lint + cross-link in one pass
```

> **Deploy caveat:** `_shared/` is a sibling to each child skill. `_shared/` access works in symlink mode out of the box. Copy mode requires `/link-vault` to support bundle-as-directory deploy (issue tracked separately — see project docs).

## Skills

### Phase 1 — content lifecycle

| Slash | Folder | Purpose |
|---|---|---|
| `/repo-wiki-setup` | `repo-wiki-setup/` | Bootstrap structure. Refuses on existing `wiki/`. Never overwrites SSOT |
| `/repo-wiki-ingest` | `repo-wiki-ingest/` | 2-stage: lint then extract. Module-level parallel fan-out |
| `/repo-wiki-query` | `repo-wiki-query/` | Q&A with mandatory citations |

### Phase 2 — maintenance

| Slash | Folder | Purpose |
|---|---|---|
| `/repo-wiki-update` | `repo-wiki-update/` | Surgical re-ingest of a single SSOT path (module / ADR / CONTEXT.md) |
| `/repo-wiki-check` | `repo-wiki-check/` | Bundled maintenance — status (counts/delta) + lint (consistency checks) + cross-link (graph refresh) in one pass |

### Phase 3 — destructive rebuild

| Slash | Folder | Purpose |
|---|---|---|
| `/repo-wiki-rebuild` | `repo-wiki-rebuild/` | Full wipe-and-regenerate from SSOT via 8-phase parallel C1 manifest pipeline. User-confirmed, git tag + branch backup mandatory |

## Shared docs

All child skills resolve these via `../_shared/`:

- [DATA-MODEL.md](./_shared/DATA-MODEL.md) — 3-layer architecture (SSOT / LLM-owned / deploy)
- [IRON-RULES.md](./_shared/IRON-RULES.md) — invariants every skill must respect
- [CONTEXT-FORMAT.md](./_shared/CONTEXT-FORMAT.md) — glossary format (mirrored from grill-with-docs)
- [ADR-FORMAT.md](./_shared/ADR-FORMAT.md) — ADR format (mirrored from grill-with-docs)
- [page-scan.md](./_shared/page-scan.md) — shared wiki page enumeration + frontmatter parsing
- [lint-checks.md](./_shared/lint-checks.md) — catalog of every consistency check (SSOT side reused by `/repo-wiki-ingest`, full set by `/repo-wiki-check`)

## Templates

`_shared/templates/repo-wiki-{source,entity,concept,synthesis}.md` are copied into the target repo's `templates/` by `/repo-wiki-setup`.

## Relationship to grill-with-docs

- **Structural reuse** (default): `CONTEXT.md` and `docs/adr/` use grill-with-docs formats; repo-wiki reads them but never writes
- **Delegation** (`--grill` on `/repo-wiki-ingest`): ambiguous candidates trigger an interactive `/grill-with-docs` session inline
- **Promotion** (separate): proposals in `wiki/_proposals/` can be batch-promoted via `/grill-with-docs --import wiki/_proposals/`

## Relationship to the source vault's `/wiki-*` skills

`wiki-*` operates on this vault (`raw/` SSOT + `wiki/` distillation, English body, Korean quotes preserved). `repo-wiki-*` is the **code-repo variant** with different SSOT layers (`src/` + `CONTEXT.md` + `docs/adr/`) and English-only body. The skill families do not share code; they share architectural philosophy.
