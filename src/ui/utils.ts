import type { TFile } from "obsidian";
import { getDateFromFile, getDateUID } from "obsidian-daily-notes-interface";

/**
 * Lookup the dateUID for a given file by matching its name against the daily and
 * weekly note formats. Used only for the active-cell highlight. (Custom `_HUB_*`
 * names won't match — a known cosmetic limitation.)
 */
export function getDateUIDFromFile(file: TFile | null): string {
  if (!file) {
    return null;
  }

  let date = getDateFromFile(file, "day");
  if (date) {
    return getDateUID(date, "day");
  }

  date = getDateFromFile(file, "week");
  if (date) {
    return getDateUID(date, "week");
  }
  return null;
}
