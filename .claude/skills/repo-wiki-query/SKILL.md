---
name: repo-wiki-query
description: Answer questions about the target repository by synthesizing wiki/, CONTEXT.md, and docs/adr/ with [[wikilink]] and path citations. Citation priority is CONTEXT term → ADR → wiki/concepts → wiki/sources → code path.
allowed-tools: [Read, Bash, Grep, Glob, AskUserQuestion]
orchestration: sequential
---

# repo-wiki-query

Q&A about the target repository, grounded in SSOT (`CONTEXT.md`, `docs/adr/`) and the LLM-distilled `wiki/` layer.

> Shared docs: see [DATA-MODEL.md](../_shared/DATA-MODEL.md), [IRON-RULES.md](../_shared/IRON-RULES.md).

## When to run

- "What does this repo say about X?"
- "Where is decision Y captured?"
- "Compare concept A and B in this codebase."
- Any question the wiki/SSOT layer plausibly covers.

## Arguments

`$ARGUMENTS` is the user question (freeform). No mode tokens for now.

## Required bash commands

- `[ -d wiki ]` — pre-flight check
- `grep -r "<term>" wiki/ CONTEXT.md docs/adr/` — candidate page discovery
- `yq -i` — only if synthesis is saved (frontmatter write)

## Procedure

### 1. Pre-flight

```bash
[ -d wiki ] || { echo "❌ Run /repo-wiki-setup first."; exit 1; }
[ -f wiki/index.md ] || { echo "❌ wiki/index.md missing — corrupt skeleton."; exit 1; }
```

### 2. Load high-level catalog

Read in order:

1. `wiki/index.md` — page inventory
2. `wiki/overview.md` — current synthesis (may be empty initially)
3. `CONTEXT.md` (or `CONTEXT-MAP.md` → list of `src/<bc>/CONTEXT.md`) — glossary

### 3. Identify candidate pages

Combine signals:

- Index entries whose title or related-terms match the question
- `grep -r "<question-keyword>" wiki/ CONTEXT.md docs/adr/` for likely matches
- If glossary terms in the question map to specific contexts (multi-context mode), narrow to that context's pages

### 4. Drill into pages

Read in priority order. **Parallel reads OK** when ≥10 candidate pages.

| Priority | Source | Why |
|---|---|---|
| 1 | `CONTEXT.md` term entry | authoritative definition |
| 2 | `docs/adr/<nnnn>-<slug>.md` (matching topic) | authoritative decision |
| 3 | `wiki/concepts/<slug>.md` | abstract pattern explanation |
| 4 | `wiki/sources/<slug>.md` | per-module/per-ADR distillation |
| 5 | `wiki/synthesis/<slug>.md` | cross-cutting analyses |
| 6 | `src/<file>` direct | only when wiki layer is silent or insufficient |

### 5. Synthesize answer

Every claim MUST cite. Citation forms:

- **Glossary term**: `CONTEXT.md#<term>` (or `src/<bc>/CONTEXT.md#<term>`)
- **ADR**: `docs/adr/<nnnn>-<slug>` (path form)
- **Wiki page**: `[[<wiki-page-slug>]]` (Obsidian-compatible wikilink)
- **Code**: `src/<file>:<line>` — use only when no wiki page covers the claim

Body in English. Concise — prefer 3-5 paragraphs over exhaustive dumps. End with a "Sources" line that lists the cited pages.

### 6. Offer to file synthesis

If the answer covers a cross-cutting question that future readers will repeat (architectural comparison, decision rationale chain, etc.), ask:

> "Save this as `wiki/synthesis/<slug>.md`? (recommended for reusable answers)"

If yes:

1. Generate slug from the question (kebab-case, ≤5 words)
2. Write per `_shared/templates/repo-wiki-synthesis.md`
3. Update `wiki/index.md` Synthesis section
4. Append `wiki/log.md`:
   ```
   ## [{YYYY-MM-DD}] query → synthesis | {one-line summary}
   ```

If no, still append a query-only log line:

```
## [{YYYY-MM-DD}] query | {one-line summary}
```

### 7. If the wiki is silent

If candidate set is empty AND grep on CONTEXT/ADR is silent:

- Inform the user: "No wiki/SSOT coverage on this topic."
- Offer: "Run `/repo-wiki-ingest --extract --glob '<narrower-pattern>'` to populate wiki coverage on the relevant modules first."
- Do NOT fabricate an answer from raw `src/` reads alone.

## Iron rules

- Every claim cites (iron rule #4 of the family).
- Body English.
- Code-only citations only when the wiki layer doesn't cover the claim.
- Never write to SSOT (`CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`, `src/`).
- Synthesis files are written only on explicit user opt-in.
