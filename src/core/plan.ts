/**
 * plan.ts — COMPOSE (pure). Stage that turns date+period+settings into a concrete
 * NotePlan (where the note goes, what it's called, which fields to compute), by
 * resolving the per-period patterns against the token bag. No I/O lives here.
 */
import type { Moment } from "moment";

import type { ISettings, PeriodKind } from "src/types";

import { tokenBag } from "./anchors";
import { resolve } from "./resolve";

/** A resolved, computed field value ready to write into a note's frontmatter. */
export interface FieldValue {
  field: string;
  value: string;
  list: boolean;
}

/** Everything the writer needs to create-or-open one note. */
export interface NotePlan {
  /** Folder that should contain the note (full, incl. root). "" = vault root. */
  folderPath: string;
  /** File name WITHOUT extension. */
  fileName: string;
  /** `${folderPath}/${fileName}` (no extension). */
  destPath: string;
  /** Frontmatter fields to overwrite (everything else copied from template). */
  fields: FieldValue[];
}

/** Join non-empty path segments with "/". */
function joinPath(...parts: string[]): string {
  return parts.filter((p) => p && p.length > 0).join("/");
}

/** Resolve a NotePlan for a clicked period. */
export function planFor(
  period: PeriodKind,
  date: Moment,
  settings: ISettings
): NotePlan {
  const bag = tokenBag(date, period, settings);
  const folderRel = settings.createHierarchy
    ? resolve(settings.folderPatterns[period], bag)
    : "";
  const folderPath = joinPath(settings.hubRoot, folderRel);
  const fileName = resolve(settings.filePatterns[period], bag);
  const fields = (settings.computedFields[period] || []).map((cf) => ({
    field: cf.field,
    value: resolve(cf.formula, bag),
    list: !!cf.list,
  }));
  return { folderPath, fileName, destPath: joinPath(folderPath, fileName), fields };
}

/**
 * Resolve a NotePlan for the day Overview note (right-click only). It lives in
 * the same Day folder and uses its own file/field config.
 */
export function overviewPlan(date: Moment, settings: ISettings): NotePlan {
  const bag = tokenBag(date, "day", settings);
  const folderRel = settings.createHierarchy
    ? resolve(settings.folderPatterns.day, bag)
    : "";
  const folderPath = joinPath(settings.hubRoot, folderRel);
  const fileName = resolve(settings.overviewFile, bag);
  const fields = settings.overviewFields.map((cf) => ({
    field: cf.field,
    value: resolve(cf.formula, bag),
    list: !!cf.list,
  }));
  return { folderPath, fileName, destPath: joinPath(folderPath, fileName), fields };
}
