---
title: "shadcn/ui"
type: entity
kind: "library"
context: null
created: "2026-06-20"
related: ["code-components", "code-lib", "design-system"]
---

# shadcn/ui

The component pattern used for 북적이's UI primitives — copy-in components built on
`radix-ui` primitives (`Slot`) and `class-variance-authority` (`cva`) variant
maps, styled with Tailwind semantic tokens and merged via the `cn()` helper
([[code-lib]]). Not a runtime dependency you configure centrally; the components
live in-repo under `src/components/ui/`.

See [[design-system]] for the token/styling layer and [[code-components]] for the
concrete primitives (`button`, `card`, `badge`).

## Sources

- [[code-components]]
- [[code-lib]]

## Related concepts

- [[design-system]]

## Code touchpoints

- `src/components/ui/button.tsx:7` — `cva(...)` variant map + `Slot`
- `src/components/ui/badge.tsx:7` — `cva(...)`
- `src/lib/utils.ts:4` — `cn()` (clsx + tailwind-merge)
