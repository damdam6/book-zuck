---
title: "Design system"
type: concept
context: null
created: "2026-06-20"
related: ["code-components", "code-lib", "shadcn-ui"]
---

# Design system

## Definition

The styling and component foundation: Tailwind CSS with a semantic design-token
layer, plus shadcn-style primitives that consume those tokens. It defines *how UI
is composed and themed* across 북적이.

## Architecture / Mechanism

Tokens (brand colors, radius, semantic roles like `primary`, `foreground`,
`border`, `ring`, `destructive`) are declared in `src/index.css` and referenced by
className in the [[shadcn-ui]] primitives under `src/components/ui/`
([[code-components]]). Each primitive uses `class-variance-authority` for variant
maps and the `cn()` helper (`clsx` + `tailwind-merge`) from [[code-lib]] to merge
classes safely.

## Contrast

vs ad-hoc Tailwind utilities used directly in scaffolded [[code-pages]] (e.g.
`px-24 py-8`): the design system centralizes tokens + variants, while page-level
markup still mixes raw utilities pending real UI work.

## Sources

- [[code-components]]
- [[code-lib]]

## Code touchpoints

- `src/index.css` — design tokens (≈274 lines)
- `src/components/ui/button.tsx:7-` — `cva` variant map referencing tokens
- `src/lib/utils.ts:4` — `cn()`
