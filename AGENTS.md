# AGENTS.md — quickstart for an AI agent (or new dev)

Forked Obsidian **Calendar** plugin: clicking the grid creates-or-opens a
configurable hierarchy of time notes (Year/Month/Week/Day). Everything (paths,
names, date formats, computed frontmatter fields) is settings-driven.

**Before changing code, read `ARCHITECTURE.md`** — it has the data-flow + sequence
diagrams, the module map, the naming-token reference, and a "change X → edit Y"
table. This file is just the rules of the road.

## Mental model (10 seconds)
Pure engine in `src/core/` + a thin I/O writer; the UI calls them.
`date+period → anchors.ts (token values) → resolve.ts ({token}→text) →
plan.ts (NotePlan) → noteService.ts (create-or-open)`; `fields.ts` fills the
template's frontmatter. Settings schema = `types.ts`; default values = `defaults.ts`.

## Build / test / deploy (Node 24 via nvm — the system node is broken)
```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24
npx jest          # all pure logic + a real-template integration test
npm run build     # svelte-check && eslint && rollup  → main.js (no styles.css)
# deploy: cp main.js + manifest.json into <vault>/.obsidian/plugins/calendar/, then
# FULLY restart Obsidian (a hot reload can race data.json).
```
`npm run build` runs lint first; if lint fails it does NOT emit a new `main.js`,
so always check the exit code (don't deploy a stale bundle).

## Golden rules
1. **Keep `src/core/*` pure** (no `obsidian`/DOM) except `noteService.ts` (the one
   I/O boundary). That purity is what makes the engine jest-testable.
2. **Never expose the START-month / ISO week math as a setting** — it lives in
   `anchors.ts` and a wrong value silently forks the folder hierarchy.
3. **All default values go in `src/defaults.ts`** — nowhere else. Keep them generic
   (vault-agnostic); a specific layout belongs in `data.json`/settings.
4. **Don't couple to Templater.** The vault's `MT_*` templates are a separate
   system on purpose.
5. **eslint:** `object` type is banned (use `Record<string, unknown>`); `any` needs
   an inline disable comment.
6. **Type-only imports stay `import type`** (esp. in `types.ts`) so the pure path
   doesn't load Svelte at runtime.
7. **`main.js` / `data.json` are git-ignored.** Commit `src/` + docs; the bundle is
   built by the consumer.
8. The settings tab + Svelte grid aren't unit-tested — verify them in-app
   (`HUB_FEATURE.md` has the checklist) after edits.

## Conventions
- Commit only when asked. End commit messages with the `Co-Authored-By` trailer.
- Modular, single-responsibility files; avoid duplication; favour small pure
  functions.
