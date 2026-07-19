import type { AccountSettings, ColumnMapping } from "./types";

const KEY = "ledgerport.presets.v1";

interface Preset {
  mapping: ColumnMapping;
  account: AccountSettings;
  savedAt: string;
}

type PresetStore = Record<string, Preset>;

/** Stable signature for a CSV layout: normalized header names joined. */
export function headerSignature(headers: string[]): string {
  return headers.map((h) => String(h ?? "").trim().toLowerCase()).join("|");
}

function readStore(): PresetStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function loadPreset(headers: string[]): Preset | null {
  return readStore()[headerSignature(headers)] ?? null;
}

export function savePreset(headers: string[], mapping: ColumnMapping, account: AccountSettings): boolean {
  try {
    const store = readStore();
    store[headerSignature(headers)] = { mapping, account, savedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(store));
    return true;
  } catch {
    return false; // storage full or blocked — non-fatal
  }
}

export function clearPresets(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* blocked storage — nothing to clear */
  }
}
