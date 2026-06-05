import { existsSync, readFileSync } from "fs";

import { fillSeedIdentity } from "../seed";

describe("fillSeedIdentity (synthetic)", () => {
  const SEED = `---
name:
description:
related_notes:
  - "[[_MOC_Templates]]"
---

## Important
- [ ] x
`;

  test("sets name and the parent link in one pass", () => {
    const out = fillSeedIdentity(SEED, "_HUB_Day_Apr29_2026", "[[_HUB_Week_18_2026]]");
    expect(out).toContain("name: _HUB_Day_Apr29_2026");
    expect(out).toContain('  - "[[_HUB_Week_18_2026]]"');
    expect(out).not.toContain("_MOC_Templates");
    expect(out).toContain("## Important\n- [ ] x"); // body untouched
  });

  test("week name keeps the human range", () => {
    const out = fillSeedIdentity(SEED, "_HUB_Week_Apr27-May03_2026", "[[_HUB_Month_Apr_2026]]");
    expect(out).toContain("name: _HUB_Week_Apr27-May03_2026");
    expect(out).toContain('  - "[[_HUB_Month_Apr_2026]]"');
  });

  test("missing fields are left as-is (no throw)", () => {
    const out = fillSeedIdentity("just a body, no frontmatter", "n", "p");
    expect(out).toBe("just a body, no frontmatter");
  });
});

// Exercise the ACTUAL static seed templates in the vault (skips elsewhere).
const STATIC_DIR =
  "/home/cam/Applications/obsidian_rysabh_github/4_Archives/z___TEMPLATES/Obsidian_Templates/Static";
const present = existsSync(`${STATIC_DIR}/ST_HUB_Day.md`);
(present ? describe : describe.skip)("fillSeedIdentity (real ST_ templates)", () => {
  const files = [
    "ST_HUB_Day.md",
    "ST_HUB_Week.md",
    "ST_HUB_Month.md",
    "ST_HUB_Year.md",
    "ST_Overview_Day.md",
  ];
  test.each(files)("%s gets name + parent populated", (file) => {
    const seed = readFileSync(`${STATIC_DIR}/${file}`, "utf8");
    const out = fillSeedIdentity(seed, "_HUB_TEST_NAME", "[[_HUB_TEST_PARENT]]");
    expect(out).toContain("name: _HUB_TEST_NAME");
    expect(out).toContain('"[[_HUB_TEST_PARENT]]"');
  });
});
