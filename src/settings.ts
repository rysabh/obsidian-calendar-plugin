import { App, PluginSettingTab, Setting } from "obsidian";

import { parseFields, serializeFields } from "src/core/fields";
import { DEFAULTS } from "src/defaults";
import type {
  DateFormats,
  HubTemplates,
  ISettings,
  PeriodKind,
} from "src/types";
import type { ILocaleOverride, IWeekStartOption } from "src/vendor/calendar-ui";

import type CalendarPlugin from "./main";

// Re-export the canonical schema + defaults so existing imports keep working.
export type { ISettings } from "src/types";
export const defaultSettings = DEFAULTS;

export function appHasPeriodicNotesPluginLoaded(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodicNotes = (<any>window.app).plugins.getPlugin("periodic-notes");
  return periodicNotes && periodicNotes.settings?.weekly?.enabled;
}

const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const PERIODS: PeriodKind[] = ["day", "week", "month", "year"];

export class CalendarSettingsTab extends PluginSettingTab {
  private plugin: CalendarPlugin;

  constructor(app: App, plugin: CalendarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private get opts(): ISettings {
    return this.plugin.options;
  }

  display(): void {
    this.containerEl.empty();

    // --- Calendar grid ---
    this.containerEl.createEl("h3", { text: "Calendar" });
    this.addWeekStartSetting();
    this.addShowWeeklyNoteSetting();
    this.addLocaleOverrideSetting();

    // --- Time hierarchy: output & behaviour ---
    this.containerEl.createEl("h3", { text: "Time hierarchy — output" });
    this.containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Left-click a day or week number, or the month/year in the header, to " +
        "create (or open) the matching note. Names and folders are computed from " +
        "the settings below — see the worked example in the docs.",
    });
    this.addText(
      "Output root folder",
      "Top folder for all notes. Blank = vault root.",
      () => this.opts.hubRoot,
      (v) => ({ hubRoot: v }),
      DEFAULTS.hubRoot,
      true // allow empty -> vault root
    );
    this.addToggle(
      "Create folder hierarchy",
      "On: nest notes in Year/Month/Week/Day folders. Off: put every note " +
        "directly in the output root.",
      () => this.opts.createHierarchy,
      (v) => ({ createHierarchy: v })
    );
    this.addToggle(
      "Confirm before creating a note",
      "Show a confirmation before creating a new note.",
      () => this.opts.shouldConfirmBeforeCreate,
      (v) => ({ shouldConfirmBeforeCreate: v })
    );
    this.addToggle(
      "Highlight days/weeks with a note",
      "Mark a calendar cell when its note already exists.",
      () => this.opts.showHubCues,
      (v) => ({ showHubCues: v })
    );

    // --- Naming basics ---
    this.containerEl.createEl("h3", { text: "Time hierarchy — naming" });
    this.addText(
      "Name prefix",
      'Exact text in front of every name. Blank gives e.g. "Day_Jun04_2026".',
      () => this.opts.prefix,
      (v) => ({ prefix: v }),
      DEFAULTS.prefix,
      true // allow empty
    );
    this.addFormat("Day date format", "day", "Jun04_2026");
    this.addFormat("Month date format", "month", "Jun_2026");
    this.addFormat("Year date format", "year", "2026");
    this.addToggle(
      "Use ISO week numbers",
      "On: ISO weeks (Monday, 01–53). Off: locale week numbers.",
      () => this.opts.useIsoWeeks,
      (v) => ({ useIsoWeeks: v })
    );
    this.addFormat("Week id format", "weekId", "23_2026");

    // --- Templates (optional) ---
    this.containerEl.createEl("h3", { text: "Templates (optional)" });
    this.containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Off: new notes are created empty (just the computed name). On: each new " +
        "note is seeded from the template file for its period; the computed " +
        "fields below are then filled in.",
    });
    this.addToggle(
      "Use templates",
      "Seed new notes from a template file.",
      () => this.opts.useTemplates,
      (v) => ({ useTemplates: v })
    );
    this.addTemplatePath("Day template", "day");
    this.addTemplatePath("Week template", "week");
    this.addTemplatePath("Month template", "month");
    this.addTemplatePath("Year template", "year");
    this.addTemplatePath("Day Overview template", "overview");

    // --- Advanced (collapsible) ---
    const adv = this.containerEl.createEl("details");
    adv.createEl("summary", {
      text: "Advanced — naming patterns & computed fields",
    });
    adv.createEl("p", {
      cls: "setting-item-description",
      text:
        "Patterns below are built from these tokens. The date tokens are " +
        "rendered using the formats in the “Time hierarchy — naming” section " +
        "above — change those to switch e.g. 2026 vs 26, or Jun vs June:",
    });
    const legend = adv.createEl("ul", { cls: "setting-item-description" });
    const tokens: Array<[string, string]> = [
      ["{prefix}", 'the “Name prefix” above (e.g. "_HUB_", or blank)'],
      ["{Kind}", "the period word: Day / Week / Month / Year"],
      ["{year}", "the year, formatted by “Year date format” (e.g. 2026)"],
      ["{month}", "the month, formatted by “Month date format” (e.g. Jun_2026)"],
      ["{day}", "the day, formatted by “Day date format” (e.g. Jun04_2026)"],
      ["{weekId}", "the week, formatted by “Week id format” (e.g. 23_2026)"],
      ["{weekRange}", "the week’s date range (e.g. Jun01-07_2026)"],
      ["{date:FORMAT}", "any moment.js format, e.g. {date:dddd} → Thursday"],
    ];
    tokens.forEach(([token, meaning]) => {
      const li = legend.createEl("li");
      li.createEl("code", { text: token });
      li.appendText(` — ${meaning}`);
    });
    adv.createEl("p", {
      cls: "setting-item-description",
      text: "Folder patterns are used only when “Create folder hierarchy” is on.",
    });
    PERIODS.forEach((p) => {
      this.addPattern(adv, `${cap(p)} folder pattern`, "folderPatterns", p);
      this.addPattern(adv, `${cap(p)} file pattern`, "filePatterns", p);
      this.addComputedFields(adv, p);
    });

    // --- Reset ---
    new Setting(this.containerEl).addButton((b) =>
      b
        .setButtonText("Reset all settings to defaults")
        .setWarning()
        .onClick(async () => {
          await this.plugin.writeOptions(() => ({ ...DEFAULTS }));
          this.display();
        })
    );
  }

  // ---- generic field helpers ------------------------------------------------

  private addText(
    name: string,
    desc: string,
    get: () => string,
    set: (v: string) => Partial<ISettings>,
    placeholder = "",
    allowEmpty = false
  ): void {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(desc)
      .addText((t) => {
        t.setPlaceholder(placeholder);
        t.setValue(get());
        t.onChange((v) => {
          this.plugin.writeOptions(() =>
            set(allowEmpty ? v : v || placeholder)
          );
        });
      });
  }

  private addToggle(
    name: string,
    desc: string,
    get: () => boolean,
    set: (v: boolean) => Partial<ISettings>
  ): void {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(desc)
      .addToggle((toggle) => {
        toggle.setValue(get());
        toggle.onChange((v) => this.plugin.writeOptions(() => set(v)));
      });
  }

  private addFormat(name: string, key: keyof DateFormats, example: string): void {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(`moment.js format. Default "${DEFAULTS.formats[key]}" → ${example}.`)
      .addText((t) => {
        t.setPlaceholder(DEFAULTS.formats[key]);
        t.setValue(this.opts.formats[key]);
        t.onChange((v) => {
          this.plugin.writeOptions((old) => ({
            formats: { ...old.formats, [key]: v || DEFAULTS.formats[key] },
          }));
        });
      });
  }

  private addTemplatePath(name: string, key: keyof HubTemplates): void {
    const setting = new Setting(this.containerEl).setName(name);
    const status = setting.descEl.createSpan();
    const refresh = (value: string): void => {
      if (!value) {
        status.setText("No template set.");
        status.style.color = "";
        return;
      }
      const exists = !!this.app.vault.getAbstractFileByPath(value);
      status.setText(exists ? "✓ found" : "✗ not found");
      status.style.color = exists
        ? "var(--text-success)"
        : "var(--text-error)";
    };
    setting.addText((t) => {
      t.setPlaceholder("path/to/Template.md");
      t.setValue(this.opts.hubTemplates[key]);
      refresh(this.opts.hubTemplates[key]);
      t.onChange((v) => {
        this.plugin.writeOptions((old) => ({
          hubTemplates: { ...old.hubTemplates, [key]: v },
        }));
        refresh(v);
      });
    });
  }

  // ---- advanced helpers -----------------------------------------------------

  private addPattern(
    container: HTMLElement,
    name: string,
    bucket: "folderPatterns" | "filePatterns",
    period: PeriodKind
  ): void {
    new Setting(container).setName(name).addText((t) => {
      t.setPlaceholder(DEFAULTS[bucket][period]);
      t.setValue(this.opts[bucket][period]);
      t.onChange((v) => {
        this.plugin.writeOptions((old) => ({
          [bucket]: { ...old[bucket], [period]: v || DEFAULTS[bucket][period] },
        }));
      });
    });
  }

  private addComputedFields(
    container: HTMLElement,
    period: PeriodKind
  ): void {
    new Setting(container)
      .setName(`${cap(period)} computed fields`)
      .setDesc('One per line: "field = formula" (use "field[] =" for list fields).')
      .addTextArea((t) => {
        t.setValue(serializeFields(this.opts.computedFields[period]));
        t.onChange((v) => {
          this.plugin.writeOptions((old) => ({
            computedFields: {
              ...old.computedFields,
              [period]: parseFields(v),
            },
          }));
        });
      });
  }

  // ---- calendar-grid settings (unchanged) -----------------------------------

  addWeekStartSetting(): void {
    const { moment } = window;
    const localizedWeekdays = moment.weekdays();
    const localeWeekStartNum = window._bundledLocaleWeekSpec.dow;
    const localeWeekStart = moment.weekdays()[localeWeekStartNum];

    new Setting(this.containerEl)
      .setName("Start week on")
      .setDesc(
        "Which day the calendar grid starts on. (Hub weeks use ISO/Monday " +
          "unless you turn ISO weeks off below.)"
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("locale", `Locale default (${localeWeekStart})`);
        localizedWeekdays.forEach((day, i) => {
          dropdown.addOption(weekdays[i], day);
        });
        dropdown.setValue(this.opts.weekStart);
        dropdown.onChange((value) => {
          this.plugin.writeOptions(() => ({
            weekStart: value as IWeekStartOption,
          }));
        });
      });
  }

  addShowWeeklyNoteSetting(): void {
    new Setting(this.containerEl)
      .setName("Show week number")
      .setDesc("Add a column with the (clickable) week number.")
      .addToggle((toggle) => {
        toggle.setValue(this.opts.showWeeklyNote);
        toggle.onChange((value) => {
          this.plugin.writeOptions(() => ({ showWeeklyNote: value }));
        });
      });
  }

  addLocaleOverrideSetting(): void {
    const { moment } = window;
    const sysLocale = navigator.language?.toLowerCase();

    new Setting(this.containerEl)
      .setName("Override locale")
      .setDesc("Use a locale different from the system default.")
      .addDropdown((dropdown) => {
        dropdown.addOption("system-default", `Same as system (${sysLocale})`);
        moment.locales().forEach((locale) => {
          dropdown.addOption(locale, locale);
        });
        dropdown.setValue(this.opts.localeOverride);
        dropdown.onChange((value) => {
          this.plugin.writeOptions(() => ({
            localeOverride: value as ILocaleOverride,
          }));
        });
      });
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
