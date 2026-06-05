/**
 * noteService.ts — WRITER + façade (the only I/O in the engine).
 *
 * Public API used by the UI:
 *   - createOrOpenHub      (left-click a day/week/month/year)
 *   - createOrOpenOverview (right-click → day Overview)
 *   - hubExists            (binary "hub exists" cue)
 *
 * Behaviour: open the note if it exists; else (optionally behind a confirm modal)
 * create it and open it. Create = copy the template (if templating is on) →
 * replace the computed fields → make folders (if the hierarchy toggle is on) →
 * create + open. Any failure (e.g. a template path that does not exist) surfaces
 * a Notice instead of failing silently.
 */
import type { Moment } from "moment";
import { App, Notice, TFile } from "obsidian";

import type { ISettings, PeriodKind } from "src/types";
import { createConfirmationDialog } from "src/ui/modal";

import { applyFields } from "./fields";
import { NotePlan, overviewPlan, planFor } from "./plan";

// Generic, prefix-agnostic labels for the confirm dialog ("New Day note", …).
// (The note's actual name comes from the user's own patterns, shown in the body.)
const PERIOD_LABEL: Record<PeriodKind, string> = {
  day: "Day note",
  week: "Week note",
  month: "Month note",
  year: "Year note",
};

/** Create each missing folder in `folderPath`, segment by segment. */
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

/** The existing note for this plan, if any (canonical path only). */
function findExisting(app: App, destPath: string): TFile | null {
  const f = app.vault.getAbstractFileByPath(`${destPath}.md`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return f && (f as any).extension === "md" ? (f as TFile) : null;
}

/**
 * Create the note from the plan and open it. Never throws to the caller: a
 * missing template or any I/O error shows a Notice (fixes the silent-fail).
 */
async function buildAndOpen(
  app: App,
  plan: NotePlan,
  templatePath: string,
  inNewSplit: boolean,
  cb?: (file: TFile) => void
): Promise<void> {
  try {
    let content = "";
    if (templatePath) {
      const templateFile = app.vault.getAbstractFileByPath(templatePath);
      if (!templateFile) {
        new Notice(
          `Calendar: seed template not found — "${templatePath}". ` +
            `Fix the path (or turn off templates) in Calendar settings.`
        );
        return;
      }
      const seed = await app.vault.read(templateFile as TFile);
      content = applyFields(seed, plan.fields);
    }

    if (plan.folderPath) {
      await ensureFolder(app, plan.folderPath);
    }
    const created = await app.vault.create(`${plan.destPath}.md`, content);
    await openFile(app, created, inNewSplit);
    cb?.(created);
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = (err as any)?.message ?? String(err);
    new Notice(`Calendar: couldn't create "${plan.fileName}" — ${msg}`);
    console.error("[Calendar] create failed", err);
  }
}

/** Shared open-or-create flow (with the optional confirm modal). */
async function openOrCreate(
  app: App,
  settings: ISettings,
  plan: NotePlan,
  templatePath: string,
  modalTitle: string,
  inNewSplit: boolean,
  cb?: (file: TFile) => void
): Promise<void> {
  const existing = findExisting(app, plan.destPath);
  if (existing) {
    await openFile(app, existing, inNewSplit);
    cb?.(existing);
    return;
  }

  const doCreate = () =>
    buildAndOpen(app, plan, templatePath, inNewSplit, cb);

  if (settings.shouldConfirmBeforeCreate) {
    createConfirmationDialog({
      cta: "Create",
      onAccept: doCreate,
      title: modalTitle,
      text: `Create "${plan.fileName}"${
        plan.folderPath ? ` in ${plan.folderPath}` : ""
      }?`,
    });
  } else {
    await doCreate();
  }
}

/** Resolve the template path for a period (empty when templating is off). */
function hubTemplate(period: PeriodKind, settings: ISettings): string {
  return settings.useTemplates ? settings.hubTemplates[period] : "";
}

/** THE click behaviour: create-or-open the period's HUB note. */
export async function createOrOpenHub(
  app: App,
  settings: ISettings,
  period: PeriodKind,
  date: Moment,
  inNewSplit: boolean,
  cb?: (file: TFile) => void
): Promise<void> {
  const plan = planFor(period, date, settings);
  await openOrCreate(
    app,
    settings,
    plan,
    hubTemplate(period, settings),
    `New ${PERIOD_LABEL[period]}`,
    inNewSplit,
    cb
  );
}

/** Create-or-open the day Overview note (right-click only). */
export async function createOrOpenOverview(
  app: App,
  settings: ISettings,
  date: Moment,
  inNewSplit: boolean,
  cb?: (file: TFile) => void
): Promise<void> {
  const plan = overviewPlan(date, settings);
  const templatePath = settings.useTemplates ? settings.hubTemplates.overview : "";
  await openOrCreate(
    app,
    settings,
    plan,
    templatePath,
    "New Day Overview",
    inNewSplit,
    cb
  );
}

/** Does a HUB note exist for this period/date? (binary visual cue.) */
export function hubExists(
  app: App,
  settings: ISettings,
  period: PeriodKind,
  date: Moment
): boolean {
  const plan = planFor(period, date, settings);
  return !!findExisting(app, plan.destPath);
}
