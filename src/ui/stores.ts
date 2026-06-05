import type { TFile } from "obsidian";
import { writable } from "svelte/store";

import { DEFAULTS } from "src/defaults";
import type { ISettings } from "src/types";

import { getDateUIDFromFile } from "./utils";

export const settings = writable<ISettings>(DEFAULTS);

function createSelectedFileStore() {
  const store = writable<string>(null);

  return {
    setFile: (file: TFile) => {
      const id = getDateUIDFromFile(file);
      store.set(id);
    },
    ...store,
  };
}

export const activeFile = createSelectedFileStore();
