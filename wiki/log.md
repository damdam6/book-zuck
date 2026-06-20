# Wiki Log

## [2026-06-14] setup | repo-wiki initialized
- context mode: multi
- git sha: 1970488632259ab0a66553904b9023beabc08ddc

## [2026-06-14] ingest --extract | 2 sources, 1 concepts, 2 entities, 1 term-proposals, 1 adr-proposals
- modules: ui, lib
- duration: direct (small repo, no agent fan-out)

## [2026-06-20] ingest --lint | 4 modules, 0 warns
- mode: single-context (CONTEXT.md)
- SSOT healthy: adr-drift 0, term-conflict 0, undefined-frequent-term 0
- coverage gaps (info): missing code-components/code-hooks/code-pages; stale code-ui/code-lib
- decision: proceed to /repo-wiki-rebuild
