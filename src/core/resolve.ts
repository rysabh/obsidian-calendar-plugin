/**
 * resolve.ts — PATTERN -> TEXT (pure). The single primitive of the engine.
 *
 * `resolve` expands a pattern string by swapping each `{token}` for its value
 * from the bag. The SAME function builds folder paths, file names, AND
 * frontmatter field values — that is the "one computation module".
 *
 * Tokens: prefix Kind year month day weekId weekRange  (+ {date:MOMENT_FORMAT}).
 * An unknown token is left literally in place (so it is visible, never silently
 * dropped); `unknownTokens` lets the settings UI flag a bad pattern up front.
 */
import type { Bag } from "./anchors";

/** Token names the resolver guarantees (besides the `{date:FMT}` escape hatch). */
export const KNOWN_TOKENS = [
  "prefix",
  "Kind",
  "year",
  "month",
  "day",
  "weekId",
  "weekRange",
];

const TOKEN_RE = /\{([A-Za-z]+)(?::([^}]*))?\}/g;

export function resolve(pattern: string, bag: Bag): string {
  return pattern.replace(TOKEN_RE, (whole, name: string, fmt?: string) => {
    if (name === "date" && fmt != null) {
      return bag.date.format(fmt);
    }
    const value = bag.values[name];
    return value != null ? value : whole; // unknown -> leave literal
  });
}

/** Token names in `pattern` that the resolver does not know (for validation). */
export function unknownTokens(pattern: string): string[] {
  const bad: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_RE);
  while ((m = re.exec(pattern)) !== null) {
    const name = m[1];
    if (name !== "date" && !KNOWN_TOKENS.includes(name)) {
      bad.push(name);
    }
  }
  return bad;
}
