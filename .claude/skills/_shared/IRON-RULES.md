# repo-wiki Iron Rules

Mirrors the LLM Wiki schema for code repositories. Applies to every `/repo-wiki-*` skill.

1. **SSOT layer is read-only for skills.** `src/`, `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/` are human/grill-authored. repo-wiki reads only. Promotion to SSOT requires manual edit or explicit `/grill-with-docs --import wiki/_proposals/`.
2. **All wiki writes go to `wiki/`.**
3. **Every ingest updates `wiki/index.md` and appends to `wiki/log.md`.**
4. **Every claim cites a source** via `[[wikilink]]` or path reference (`docs/adr/0001-x`, `CONTEXT.md#term`, `src/<file>:<line>`).
5. **Wiki body is English.** Target repos are assumed English-first. (Diverges from the source vault's Korean-preservation rule.)
6. **Frontmatter writes use `yq -i`** (mikefarah/yq), not `jq`. Round-trip verified; failure rolls back via `git checkout`.
7. **Slug allocation is sequential** in the reducer step. Concurrent agents pick by manifest line, never self-slug.
8. **`wiki/index.md`, `wiki/log.md`, `wiki/_planning/*.json`: always sequential edits.**
9. **Single writer per output file.** Multiple agents working in parallel must own disjoint paths. Every parallel agent's prompt enumerates forbidden paths.
10. **`wiki/_proposals/` is candidates only.** repo-wiki never auto-moves files to `CONTEXT.md` or `docs/adr/`.
11. **ADR numbering is sequential.** Scan `docs/adr/` (and per-context `src/<bc>/docs/adr/`) for highest number; new candidates get N+1. Reducer step.
12. **Multi-context inference** uses `CONTEXT-MAP.md` presence as the trigger. Without it, single-context mode. Skills must not assume multi-context.
13. **No automatic hooks.** All ingest is manually triggered.
14. **No vault MCP dependency in target repos.** repo-wiki skills must work via standard tools (Read/Write/Bash/Edit/Grep/Glob) — the target repo is unrelated to the source vault.
