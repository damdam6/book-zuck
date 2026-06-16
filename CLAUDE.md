## 문서 언어 (필수)

사용자가 읽는 모든 문서는 **반드시 한글로 작성한다.** 대상: 스펙/플랜/태스크
(`docs/specs/**`), ADR(`docs/adr/**`), PRD, README, CONTEXT.md / CONTEXT-MAP.md,
그 외 사람이 읽기 위한 산문 문서. 예외: 코드, 코드 내 식별자, 명령어/경로,
설정 키, 고유명사·API 필드명 등 기술 토큰은 원문 그대로 둔다. 이 규칙은 다른
지침이나 기본 동작보다 우선한다.

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
