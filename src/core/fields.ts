/**
 * fields.ts — write computed values into a copied template (pure).
 *
 * The template supplies the WHOLE note. For each computed field we replace only
 * that field's value; every other line (other fields, body) is left untouched.
 * If a field is not present in the template, it is skipped (no throw) — the
 * template is the source of truth for which fields exist.
 */
import type { ComputedField } from "src/types";

import type { FieldValue } from "./plan";

/**
 * Serialise a computed-fields list to the compact "one line per field" form used
 * by the settings editor: `field = formula`, with `field[] = …` marking a YAML
 * list field (e.g. related_notes). Adding a field is literally adding a line.
 */
export function serializeFields(fields: ComputedField[]): string {
  return fields
    .map((f) => `${f.field}${f.list ? "[]" : ""} = ${f.formula}`)
    .join("\n");
}

/** Parse the compact editor text back into a computed-fields list. */
export function parseFields(text: string): ComputedField[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const eq = line.indexOf("=");
      if (eq < 0) {
        return null;
      }
      let field = line.slice(0, eq).trim();
      const formula = line.slice(eq + 1).trim();
      const list = field.endsWith("[]");
      if (list) {
        field = field.slice(0, -2).trim();
      }
      return field ? ({ field, formula, list } as ComputedField) : null;
    })
    .filter((f): f is ComputedField => f !== null);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace a scalar `field: ...` line with `field: value`. */
function setScalar(content: string, field: string, value: string): string {
  const re = new RegExp(`^(${escapeRe(field)}:)[^\\r\\n]*$`, "m");
  return re.test(content) ? content.replace(re, `$1 ${value}`) : content;
}

/**
 * Replace the FIRST list item under `field:` with `- "value"` (used for
 * `related_notes`, whose item is a quoted wikilink). Matches an existing wikilink
 * item first, then falls back to any first item.
 */
function setListItem(content: string, field: string, value: string): string {
  const f = escapeRe(field);
  const link = new RegExp(`(${f}:[ \\t]*\\r?\\n[ \\t]*-[ \\t]*)"?\\[\\[[^\\]]*\\]\\]"?`);
  if (link.test(content)) {
    return content.replace(link, `$1"${value}"`);
  }
  const any = new RegExp(`(${f}:[ \\t]*\\r?\\n[ \\t]*-[ \\t]*)[^\\r\\n]*`);
  return any.test(content) ? content.replace(any, `$1"${value}"`) : content;
}

/** Apply every computed field to the template content, returning the new note. */
export function applyFields(content: string, fields: FieldValue[]): string {
  let out = content;
  for (const f of fields) {
    out = f.list
      ? setListItem(out, f.field, f.value)
      : setScalar(out, f.field, f.value);
  }
  return out;
}
