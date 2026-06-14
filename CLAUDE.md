## repo-wiki

This repo uses the repo-wiki skill family. SSOT is `src/`, `CONTEXT.md`, and `docs/adr/`. LLM-distilled knowledge lives under `wiki/` and is owned by the skills — do not hand-edit `wiki/sources/`, `wiki/concepts/`, `wiki/entities/`, `wiki/synthesis/`, or `wiki/_planning/`. Proposals in `wiki/_proposals/` are review candidates; promote via manual edit or `/grill-with-docs --import wiki/_proposals/`.

See `.claude/skills/_shared/IRON-RULES.md` for invariants.

## Spec / plan document location

Spec-driven artifacts live together per feature under `docs/` (SSOT), never under `wiki/`:

```
docs/specs/<feature-name>/
  spec.md     ← /spec-driven-development (SPECIFY)
  plan.md     ← /planning-and-task-breakdown (PLAN)
  tasks.md    ← /planning-and-task-breakdown (TASKS)
```

Use a kebab-case `<feature-name>`. Decisions go to `docs/adr/`, ubiquitous-language terms to `CONTEXT.md`. `wiki/` is AI-distilled output owned by repo-wiki skills — do not put specs or plans there.
