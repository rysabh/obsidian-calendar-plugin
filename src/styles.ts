/**
 * styles.ts — small CSS the plugin injects at runtime (removed on unload).
 *
 * The confirm modal and the settings tab are built with Obsidian's DOM APIs, not
 * Svelte, so they carry no component CSS. This widens the modal (long paths were
 * being cut off) and gives the settings text fields / pattern textareas room.
 * Scoped to our own classes (`calendar-modal`, `calendar-settings`).
 */
export const PLUGIN_STYLES = `
.calendar-modal {
  width: 540px;
  max-width: 92vw;
}
.calendar-modal .modal-content {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.calendar-settings .setting-item-control {
  flex-grow: 1;
  flex-basis: 55%;
}
.calendar-settings .setting-item-control input[type="text"] {
  width: 100%;
}
.calendar-settings .setting-item-control textarea {
  width: 100%;
  min-height: 5em;
  font-family: var(--font-monospace, monospace);
  white-space: pre;
  resize: vertical;
}
.calendar-settings details {
  margin: 0.75em 0;
  padding: 0.25em 0.5em;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
}
.calendar-settings details > summary {
  cursor: pointer;
  font-weight: var(--font-semibold, 600);
  padding: 0.25em 0;
}
.calendar-settings details ul {
  margin: 0.25em 0 0.5em 1.2em;
  padding: 0;
}
.calendar-settings details ul li {
  margin: 0.1em 0;
}
`;
