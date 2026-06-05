/**
 * anchors.ts — DATE MATH (pure). The first stage of the computation engine.
 *
 * Turns a clicked date + period into the token VALUES used everywhere else
 * (folder paths, file names, frontmatter fields). This is the only place that
 * knows the ISO + START-month rules, so the dangerous date math lives in exactly
 * one spot and cannot be misconfigured from settings.
 *
 * START-month rule: a week AND all of its days are placed under the calendar
 * Year/Month of the week's START (its Monday). So Fri 2026-05-01 nests under
 * Month_Apr_2026 because its ISO week started Mon 2026-04-27.
 */
import type { Moment } from "moment";

import type { ISettings, PeriodKind } from "src/types";

/** A resolved token bag for one date+period, plus the date for {date:FORMAT}. */
export interface Bag {
  values: Record<string, string>;
  date: Moment;
}

/** The start-of-week date (Monday for ISO; locale week start otherwise). */
export function startOfWeek(date: Moment, useIso: boolean): Moment {
  if (useIso) {
    const start = date.clone().isoWeekday(1); // Monday of this ISO week
    if (start.isAfter(date, "day")) {
      start.subtract(7, "days");
    }
    return start;
  }
  return date.clone().startOf("week"); // honours the configured locale week start
}

/**
 * Human-readable week range for the `{weekRange}` token (and the week's `name:`).
 *   - same calendar month -> "MMMDD-DD_YYYY"     (e.g. "Mar23-29_2026")
 *   - cross month         -> "MMMDD-MMMDD_YYYY"  (e.g. "Apr27-May03_2026")
 * Year = the END day's year (Dec29 2025 -> Jan04 2026 -> "..._2026").
 */
export function weekRange(start: Moment): string {
  const end = start.clone().add(6, "days"); // Mon -> Sun inclusive
  if (start.format("YYYYMM") === end.format("YYYYMM")) {
    return `${start.format("MMMDD")}-${end.format("DD")}_${end.format("YYYY")}`;
  }
  return `${start.format("MMMDD")}-${end.format("MMMDD")}_${end.format("YYYY")}`;
}

function capitalize(period: PeriodKind): string {
  return period.charAt(0).toUpperCase() + period.slice(1);
}

/**
 * Compute the token bag for `date` as a given `period`.
 *
 * Placement anchor: week/day take year+month from the week START; month/year
 * take them from the date itself. (So a month-click on 2026-05-01 targets
 * Month_May_2026, while a day-click that day nests under Month_Apr_2026.)
 */
export function tokenBag(
  date: Moment,
  period: PeriodKind,
  settings: ISettings
): Bag {
  const start = startOfWeek(date, settings.useIsoWeeks);
  const place = period === "week" || period === "day" ? start : date;
  const f = settings.formats;
  return {
    date,
    values: {
      prefix: settings.prefix,
      Kind: capitalize(period),
      year: place.format(f.year),
      month: place.format(f.month),
      day: date.format(f.day),
      weekId: start.format(f.weekId),
      weekRange: weekRange(start),
    },
  };
}
