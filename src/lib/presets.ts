import type { AccountSettings, ColumnMapping } from "./types";

const KEY = "ledgerport.presets.v1";

export interface Preset {
  name: string;
  mapping: ColumnMapping;
  account: AccountSettings;
  savedAt: string;
}

type PresetStore = Record<string, Preset>;

/** Stable signature for a CSV layout: normalized header names joined. */
export function headerSignature(headers: string[]): string {
  return headers.map((h) => String(h ?? "").trim().toLowerCase()).join("|");
}

/** Older saved mappings predate some fields — fill safe defaults. */
function normalizeMapping(m: ColumnMapping): ColumnMapping {
  return { ...m, balance: m.balance ?? -1 };
}

function readStore(): PresetStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    for (const [sig, p] of Object.entries(parsed as PresetStore)) {
      if (!p || typeof p !== "object" || !p.mapping) {
        delete (parsed as PresetStore)[sig];
        continue;
      }
      p.name = p.name || sig.split("|").slice(0, 3).join(" · ").slice(0, 40) || "Saved layout";
      p.mapping = normalizeMapping(p.mapping);
    }
    return parsed as PresetStore;
  } catch {
    return {};
  }
}

function writeStore(store: PresetStore): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function loadPreset(headers: string[]): Preset | null {
  return readStore()[headerSignature(headers)] ?? null;
}

export function savePreset(
  headers: string[],
  mapping: ColumnMapping,
  account: AccountSettings,
  name?: string
): boolean {
  const store = readStore();
  const sig = headerSignature(headers);
  const existing = store[sig];
  store[sig] = {
    name: name || existing?.name || headers.filter((h) => h.trim()).slice(0, 3).join(" · ").slice(0, 40) || "Saved layout",
    mapping,
    account,
    savedAt: new Date().toISOString(),
  };
  return writeStore(store);
}

export function listPresets(): Array<{ signature: string } & Preset> {
  return Object.entries(readStore())
    .map(([signature, p]) => ({ signature, ...p }))
    .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function renamePreset(signature: string, name: string): boolean {
  const store = readStore();
  if (!store[signature]) return false;
  store[signature].name = name.trim().slice(0, 60) || store[signature].name;
  return writeStore(store);
}

export function deletePreset(signature: string): boolean {
  const store = readStore();
  if (!store[signature]) return false;
  delete store[signature];
  return writeStore(store);
}

export function clearPresets(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* blocked storage — nothing to clear */
  }
}

/** Export mapping profiles as JSON (contains layout + settings, never transactions). */
export function exportPresets(): string {
  return JSON.stringify({ ledgerportPresets: 1, presets: readStore() }, null, 2);
}

/** Import previously exported profiles. Returns number imported, or -1 on invalid input. */
export function importPresets(json: string): number {
  try {
    const parsed = JSON.parse(json);
    const incoming: PresetStore = parsed?.ledgerportPresets ? parsed.presets : parsed;
    if (typeof incoming !== "object" || incoming === null) return -1;
    const store = readStore();
    let count = 0;
    for (const [sig, p] of Object.entries(incoming)) {
      if (p && typeof p === "object" && p.mapping && p.account) {
        store[sig] = {
          name: String(p.name ?? "Imported layout").slice(0, 60),
          mapping: normalizeMapping(p.mapping),
          account: p.account,
          savedAt: p.savedAt ?? new Date().toISOString(),
        };
        count++;
      }
    }
    return writeStore(store) ? count : -1;
  } catch {
    return -1;
  }
}
