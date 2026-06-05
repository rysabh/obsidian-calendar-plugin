/**
 * mergeOptions.ts — turn a saved data.json into a complete ISettings (pure).
 *
 * Starts from the generic DEFAULTS, then copies ONLY recognised keys from the
 * saved data (so stale keys from older versions — e.g. `wordsPerDot`,
 * `weeklyNoteFormat` — are pruned), deep-merging object-valued settings so newly
 * added sub-keys pick up their defaults. Kept pure so it is unit-tested.
 */
import { DEFAULTS, KNOWN_SETTING_KEYS } from "src/defaults";
import type { ISettings } from "src/types";

function isPlainObject(x: unknown): boolean {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

export function mergeSettings(
  saved: Record<string, unknown> | null | undefined
): ISettings {
  const merged: ISettings = { ...DEFAULTS };
  if (!saved) {
    return merged;
  }
  for (const key of KNOWN_SETTING_KEYS) {
    if (!(key in saved)) {
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = (DEFAULTS as any)[key];
    const val = saved[key];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (merged as any)[key] =
      isPlainObject(val) && isPlainObject(def)
        ? { ...(def as Record<string, unknown>), ...(val as Record<string, unknown>) }
        : val;
  }
  return merged;
}
