/**
 * seed.ts — fill a STATIC seed note's identity fields.
 *
 * A static template is plain content; the only values the plugin computes are
 * the note's `name` and its parent `related_notes` link. We substitute them
 * into the seed string and write the whole note in ONE `vault.create` — more
 * robust than mutating a freshly-created file's frontmatter (which races the
 * metadata cache), and pure, so it is unit-tested headlessly.
 *
 * The substitution is intentionally forgiving: if a seed lacks a `name:` line
 * or a `related_notes` link, that field is simply left as-is (no throw).
 */

/** Set `name:` (first frontmatter line) and the first `related_notes` link. */
export function fillSeedIdentity(
  seed: string,
  nameField: string,
  parentLink: string
): string {
  let out = seed;

  // `name:` line (empty or not) -> `name: <nameField>`.
  out = out.replace(/^name:[^\r\n]*$/m, `name: ${nameField}`);

  // First list item under `related_notes:` whose value is a wikilink -> parent.
  // Handles quoted or unquoted `[[...]]`.
  out = out.replace(
    /(related_notes:[ \t]*\r?\n[ \t]*-[ \t]*)"?\[\[[^\]]*\]\]"?/,
    `$1"${parentLink}"`
  );

  return out;
}
