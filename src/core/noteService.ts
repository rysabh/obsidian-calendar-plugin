import type { Moment } from "moment";
import type { App, TFile } from "obsidian";

import type { ISettings } from "src/settings";
import { createConfirmationDialog } from "src/ui/modal";

import {
  PeriodKind,
  PeriodPaths,
  pathsFor,
  overviewPaths,
  weekRange,
  startOfIsoWeek,
} from "./periods";
import { fillSeedIdentity } from "./seed";

/** Human label for each period, used in the confirmation modal. */
const PERIOD_LABEL: Record<PeriodKind, string> = {
  day: "Day HUB",
  week: "Week HUB",
  month: "Month HUB",
  year: "Year HUB",
};

/** Resolve the configured STATIC seed template path for a period. */
function templatePathFor(period: PeriodKind, settings: ISettings): string {
  return settings.hubTemplates[period];
}

/** `${root}` as the path config the period functions expect. */
function pathConfig(settings: ISettings) {
  return { root: settings.hubRoot };
}

/**
 * Create each missing folder in `folderPath`, segment by segment.
 * (Uses the vault adapter so it works regardless of metadata-cache readiness.)
 */
async function ensureFolder(app: App, folderPath: string): Promise<void> {
  const parts = folderPath.split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur = cur ? `${cur}/${part}` : part;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(await (app.vault.adapter as any).exists(cur))) {
      await app.vault.createFolder(cur);
    }
  }
}

/** Open an existing file in the (optionally split) unpinned leaf. */
async function openFile(
  app: App,
  file: TFile,
  inNewSplit: boolean
): Promise<void> {
  const { workspace } = app;
  const leaf = inNewSplit
    ? workspace.splitActiveLeaf()
    : workspace.getUnpinnedLeaf();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mode = (app.vault as any).getConfig?.("defaultViewMode");
  await leaf.openFile(file, { active: true, mode });
}

/**
 * For a WEEK click, an existing hub may live under the LEGACY range-named folder
 * (e.g. `Week_Apr27-May03_2026`) rather than the new ISO name. Probe the
 * range-named variant at the same START-month location so we OPEN it instead of
 * creating a duplicate ISO folder (honors C4). Returns the legacy file or null.
 */
function findLegacyWeekNote(
  app: App,
  date: Moment,
  settings: ISettings
): TFile | null {
  const start = startOfIsoWeek(date);
  const y = start.format("YYYY");
  const monthStamp = start.format("MMM_YYYY");
  const range = weekRange(start);
  const legacyPath = `${settings.hubRoot}/Year_${y}/Month_${monthStamp}/Week_${range}/_HUB_Week_${range}.md`;
  const f = app.vault.getAbstractFileByPath(legacyPath);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return f && (f as any).extension === "md" ? (f as TFile) : null;
}

/**
 * Locate an already-existing HUB note for a clicked period, if any.
 * Checks the canonical ISO/START-month path first, then (week only) the legacy
 * range-named path.
 */
function findExistingNote(
  app: App,
  period: PeriodKind,
  date: Moment,
  paths: PeriodPaths,
  settings: ISettings
): TFile | null {
  const canonical = app.vault.getAbstractFileByPath(`${paths.destPath}.md`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (canonical && (canonical as any).extension === "md") {
    return canonical as TFile;
  }
  if (period === "week") {
    return findLegacyWeekNote(app, date, settings);
  }
  return null;
}

/**
 * Create the note from its STATIC seed template, then open it. The static
 * template supplies the body verbatim (no computation in it); the only dynamic
 * bits — the note's `name` and its parent `related_notes` link — are filled in
 * here via the frontmatter API. Shared by the HUB and Overview create paths so
 * the create/seed/open sequence exists in exactly one place.
 */
async function buildAndOpen(
  app: App,
  paths: PeriodPaths,
  templatePath: string,
  inNewSplit: boolean,
  cb?: (file: TFile) => void
): Promise<void> {
  const templateFile = app.vault.getAbstractFileByPath(templatePath);
  if (!templateFile) {
    throw new Error(
      `[Calendar] Static template not found: "${templatePath}". Set the ` +
        `correct path in the Calendar plugin settings.`
    );
  }
  const seed = await app.vault.read(templateFile as TFile);
  // Fill the only dynamic bits (name + parent link) and write the whole note in
  // one pass. For weeks `name` keeps the human range (paths.nameField); the file
  // itself uses the ISO name.
  const content = fillSeedIdentity(seed, paths.nameField, paths.parentLink);

  await ensureFolder(app, paths.folderPath);
  const created = await app.vault.create(`${paths.destPath}.md`, content);

  await openFile(app, created, inNewSplit);
  cb?.(created);
}

/**
 * Open the existing note if found, else (optionally behind the confirm modal)
 * create it from its static seed and open it. The one place the click behavior
 * (create-if-missing-else-open; never throw, never duplicate) lives.
 */
async function openOrCreate(
  app: App,
  settings: ISettings,
  existing: TFile | null,
  paths: PeriodPaths,
  templatePath: string,
  modalTitle: string,
  inNewSplit: boolean,
  cb?: (file: TFile) => void
): Promise<void> {
  if (existing) {
    await openFile(app, existing, inNewSplit);
    cb?.(existing);
    return;
  }

  const doCreate = () =>
    buildAndOpen(app, paths, templatePath, inNewSplit, cb);

  if (settings.shouldConfirmBeforeCreate) {
    createConfirmationDialog({
      cta: "Create",
      onAccept: doCreate,
      title: modalTitle,
      text: `"${paths.fileName}" does not exist yet. Create it at ${paths.folderPath}?`,
    });
  } else {
    await doCreate();
  }
}

/**
 * THE click behavior: create-or-open the period's HUB note (day/week/month/year).
 * Never throws on an existing file; never creates a time-suffixed duplicate.
 */
export async function createOrOpenHub(
  app: App,
  settings: ISettings,
  period: PeriodKind,
  date: Moment,
  inNewSplit: boolean,
  cb?: (file: TFile) => void
): Promise<void> {
  const paths = pathsFor(period, date, pathConfig(settings));
  const existing = findExistingNote(app, period, date, paths, settings);
  await openOrCreate(
    app,
    settings,
    existing,
    paths,
    templatePathFor(period, settings),
    `New ${PERIOD_LABEL[period]}`,
    inNewSplit,
    cb
  );
}

/**
 * Create-or-open the day Overview note (right-click only). Lives beside the Day
 * HUB; never created by a left-click.
 */
export async function createOrOpenOverview(
  app: App,
  settings: ISettings,
  date: Moment,
  inNewSplit: boolean,
  cb?: (file: TFile) => void
): Promise<void> {
  const paths = overviewPaths(date, pathConfig(settings));
  const existingAf = app.vault.getAbstractFileByPath(`${paths.destPath}.md`);
  const existing =
    existingAf &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (existingAf as any).extension === "md"
      ? (existingAf as TFile)
      : null;
  await openOrCreate(
    app,
    settings,
    existing,
    paths,
    settings.overviewTemplate,
    "New Day Overview",
    inNewSplit,
    cb
  );
}

/**
 * Does a HUB note exist for this period/date? Used by the visual-cue source
 * (binary "hub exists" highlight). Synchronous metadata lookup — no disk read.
 */
export function hubExists(
  app: App,
  settings: ISettings,
  period: PeriodKind,
  date: Moment
): boolean {
  const paths = pathsFor(period, date, pathConfig(settings));
  if (app.vault.getAbstractFileByPath(`${paths.destPath}.md`)) {
    return true;
  }
  if (period === "week" && findLegacyWeekNote(app, date, settings)) {
    return true;
  }
  return false;
}
