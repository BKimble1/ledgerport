import { LIMITS } from "../config";
import type { Transaction } from "./types";

export type DupStatus = "exact-file" | "history" | "possible";

/** Normalized, privacy-preserving fingerprint source for one transaction. */
export function fingerprint(t: Transaction, accountId: string): string {
  const desc = t.description.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 48);
  return `${accountId.trim().slice(-4)}|${t.date}|${t.cents}|${desc}|${t.checkNumber}`;
}

/** Non-reversible 64-bit-ish hash so stored history never contains readable data. */
export function hashFingerprint(fp: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < fp.length; i++) {
    const ch = fp.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}

/**
 * Flag duplicates inside one file.
 * exact-file: identical date+amount+description+check# (2nd occurrence onward)
 * possible:   identical date+amount but different description
 */
export function markInFileDuplicates(txns: Transaction[], accountId: string): void {
  const seenExact = new Map<string, number>();
  const seenAmountDate = new Map<string, number>();
  for (const t of txns) {
    const exact = fingerprint(t, accountId);
    const loose = `${t.date}|${t.cents}`;
    if (seenExact.has(exact)) {
      t.dupStatus = "exact-file";
      if (!t.excluded) {
        t.excluded = true;
        t.excludeReason = "Exact duplicate of another row in this file";
      }
    } else {
      seenExact.set(exact, 1);
      if (seenAmountDate.has(loose)) t.dupStatus = t.dupStatus ?? "possible";
      seenAmountDate.set(loose, 1);
    }
  }
}

/* ---------- local export history (the duplicate-import firewall) ---------- */

const HKEY = "ledgerport.exporthistory.v1";

interface HistoryStore {
  enabled: boolean;
  hashes: string[];
}

function readHistory(): HistoryStore {
  try {
    const raw = localStorage.getItem(HKEY);
    if (!raw) return { enabled: true, hashes: [] };
    const p = JSON.parse(raw);
    return { enabled: p.enabled !== false, hashes: Array.isArray(p.hashes) ? p.hashes : [] };
  } catch {
    return { enabled: true, hashes: [] };
  }
}

export function historyEnabled(): boolean {
  return readHistory().enabled;
}

export function setHistoryEnabled(enabled: boolean): void {
  const h = readHistory();
  try {
    localStorage.setItem(HKEY, JSON.stringify({ ...h, enabled }));
  } catch { /* storage blocked — firewall simply inactive */ }
}

export function clearHistory(): void {
  try {
    const h = readHistory();
    localStorage.setItem(HKEY, JSON.stringify({ enabled: h.enabled, hashes: [] }));
  } catch { /* ignore */ }
}

export function historyCount(): number {
  return readHistory().hashes.length;
}

/** Flag transactions previously exported from this browser (excluded by default). */
export function markHistoryDuplicates(txns: Transaction[], accountId: string): number {
  const h = readHistory();
  if (!h.enabled || h.hashes.length === 0) return 0;
  const set = new Set(h.hashes);
  let flagged = 0;
  for (const t of txns) {
    if (t.dupStatus === "exact-file") continue;
    if (set.has(hashFingerprint(fingerprint(t, accountId)))) {
      t.dupStatus = "history";
      if (!t.excluded) {
        t.excluded = true;
        t.excludeReason = "Already exported from this browser in a previous conversion";
      }
      flagged++;
    }
  }
  return flagged;
}

/** After a successful export, remember included transactions' hashed fingerprints. */
export function recordExport(txns: Transaction[], accountId: string): void {
  const h = readHistory();
  if (!h.enabled) return;
  const set = new Set(h.hashes);
  for (const t of txns) set.add(hashFingerprint(fingerprint(t, accountId)));
  const arr = [...set];
  try {
    localStorage.setItem(
      HKEY,
      JSON.stringify({ enabled: h.enabled, hashes: arr.slice(-LIMITS.dupHistoryMax) })
    );
  } catch { /* storage full — history simply stops growing */ }
}
