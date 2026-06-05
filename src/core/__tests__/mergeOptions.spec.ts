import { DEFAULTS } from "src/defaults";

import { mergeSettings } from "../mergeOptions";

describe("mergeSettings (data.json upgrade / prune)", () => {
  test("prunes stale/unknown keys, keeps known ones", () => {
    const saved = {
      hubRoot: "MyVault/Cal",
      showHubCues: false,
      wordsPerDot: 250, // stale (old plugin)
      weeklyNoteFormat: "", // stale
      weeklyNoteFolder: "", // stale
    } as Record<string, unknown>;
    const merged = mergeSettings(saved) as unknown as Record<string, unknown>;
    expect(merged.hubRoot).toBe("MyVault/Cal");
    expect(merged.showHubCues).toBe(false);
    expect("wordsPerDot" in merged).toBe(false);
    expect("weeklyNoteFormat" in merged).toBe(false);
    expect("weeklyNoteFolder" in merged).toBe(false);
  });

  test("deep-merges object settings so new sub-keys get defaults", () => {
    const saved = {
      // an older data.json: hubTemplates without the new `overview` key
      hubTemplates: {
        day: "T/Day.md",
        week: "T/Week.md",
        month: "T/Month.md",
        year: "T/Year.md",
      },
      formats: { day: "MMM_DD_YYYY" }, // partial
    } as Record<string, unknown>;
    const merged = mergeSettings(saved);
    expect(merged.hubTemplates.day).toBe("T/Day.md");
    expect(merged.hubTemplates.overview).toBe(DEFAULTS.hubTemplates.overview);
    expect(merged.formats.day).toBe("MMM_DD_YYYY");
    expect(merged.formats.month).toBe(DEFAULTS.formats.month);
  });

  test("null/empty saved -> pure defaults", () => {
    expect(mergeSettings(null)).toEqual(DEFAULTS);
    expect(mergeSettings(undefined)).toEqual(DEFAULTS);
  });
});
