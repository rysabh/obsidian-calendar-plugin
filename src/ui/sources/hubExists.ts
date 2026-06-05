import type { Moment } from "moment";
import type { ICalendarSource, IDayMetadata } from "src/vendor/calendar-ui";
import { get } from "svelte/store";

import { hubExists } from "src/core/noteService";

import { settings } from "../stores";

/** Class added to a cell whose HUB note exists; styled in the vendored UI. */
const HAS_NOTE = "has-note";

/**
 * Binary "HUB exists" visual cue (R5/Q14): a day or week cell is highlighted iff
 * its `_HUB_*` note exists at the path computed by the shared logic (periods.ts).
 * Replaces the upstream word-count dots. Cheap — a synchronous metadata lookup
 * per cell, no disk read.
 */
export const hubExistsSource: ICalendarSource = {
  getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => {
    const s = get(settings);
    if (s.showHubCues && hubExists(window.app, s, "day", date)) {
      return { classes: [HAS_NOTE] };
    }
    return {};
  },

  getWeeklyMetadata: async (date: Moment): Promise<IDayMetadata> => {
    const s = get(settings);
    if (s.showHubCues && hubExists(window.app, s, "week", date)) {
      return { classes: [HAS_NOTE] };
    }
    return {};
  },
};
