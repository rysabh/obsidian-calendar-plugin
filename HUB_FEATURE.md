# Calendar → time-hierarchy feature (fork)

Clicking the calendar grid creates-or-opens nested time notes
(Year / Month / Week / Day, plus a right-click day Overview). All naming, paths,
formats, and computed frontmatter fields are driven from the plugin's own
settings, so it works in any vault. The Templater `MT_*` templates remain a
**separate, independent** way to make the same notes — nothing is shared.

- **How the code works / how to change it →** see [`ARCHITECTURE.md`](./ARCHITECTURE.md).
- **Agent/dev quickstart + rules →** see [`AGENTS.md`](./AGENTS.md).
- **End-user "set these settings → get that layout" guide →** the vault's
  `0_Inbox/adjust_calendar_settting.md`.

## Manual UI verification (must be done in Obsidian)

The settings tab and the Svelte grid only run inside Obsidian, so they aren't
unit-tested. After building + deploying, **fully restart Obsidian**, then:

- [ ] **Settings render first:** open Settings → Calendar and confirm the page
      draws with no console errors (a throw in `display()` blanks the page).
- [ ] **Day create/open:** click an empty day → confirm → it creates the nested
      `…/Day_<…>/<prefix>Day_<…>.md`. Open it: `name:` and the parent
      `related_notes:` are filled; the rest of the template is intact. Click again
      → it just opens (no duplicate).
- [ ] **Missing template surfaces a Notice:** set a wrong Day template path (it
      shows ✗) → click → a Notice names the bad path (no silent failure). Restore it.
- [ ] **Week / Month / Year** clicks create the right notes; a cross-month week
      (e.g. a May day of an Apr-start week) nests under the Apr month (START-month).
- [ ] **Settings drive naming:** change *Day date format* to `MMM_DD_YYYY` → a new
      day note is `…_Day_Jun_04_2026`. *Reset all settings to defaults* works.
- [ ] **Templates off:** turn *Use templates* off → a click creates an empty note
      with the correct name/location.
- [ ] **Cues / right-click menu / hover** work; the Overview menu item creates the
      `_Overview_Day_<…>` note.

## Build & deploy (summary)

```
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24
npx jest && npm run build      # → main.js (no styles.css; CSS is JS-injected)
# copy main.js + manifest.json into <vault>/.obsidian/plugins/calendar/, then
# fully restart Obsidian.
```
