// Progress state for the Leonida Platinum Roadmap.
//
// This module has no DOM in it on purpose: the browser UI and the Node
// round-trip test both import it, so the export/import rules live in exactly
// one place. A saved state looks like:
//   { app, version, exportedAt, earned: [trophy ids, ascending], spoiler }
export const APP_ID = 'gta6-trophy-guide-01';
export const STORAGE_KEY = 'gta6-platinum-roadmap-v1';
const FORMAT_VERSION = 1;

/** A fresh, empty progress state. */
export function blankState() {
  return { app: APP_ID, version: FORMAT_VERSION, exportedAt: null, earned: [], spoiler: true };
}

/** Normalise an earned list: numbers only, deduped, ascending. */
export function sortEarned(earned) {
  const nums = [...new Set(earned)].map(Number).filter((n) => Number.isInteger(n));
  nums.sort((a, b) => a - b);
  return nums;
}

function asState(earned, spoiler, exportedAt) {
  return { app: APP_ID, version: FORMAT_VERSION, exportedAt: exportedAt ?? null, earned: sortEarned(earned), spoiler: spoiler !== false };
}

/** Serialise a state for export. Because earned is always sorted, two
 *  exports of the same progress come out byte-identical. */
export function exportState(state, now = new Date().toISOString()) {
  const payload = asState(state.earned, state.spoiler, now);
  return JSON.stringify(payload, null, 2) + '\n';
}

/** Parse an exported file back into a state. Ids that are not real trophies
 *  are dropped (and counted); anything malformed throws a plain message the
 *  UI can show as-is. */
export function importState(text, validIds) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('That file is not a progress export (expected an object).');
  }
  if (parsed.app !== APP_ID) throw new Error('That export is from a different app.');
  if (!Array.isArray(parsed.earned)) throw new Error('That export has no earned list.');
  const known = new Set(validIds);
  const kept = parsed.earned.filter((id) => known.has(Number(id)));
  return { state: asState(kept, parsed.spoiler, parsed.exportedAt), dropped: parsed.earned.length - sortEarned(kept).length };
}

/** Read a state out of storage (localStorage in the browser). Anything
 *  unreadable or from another app falls back to a blank state. */
export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.app !== APP_ID || !Array.isArray(parsed.earned)) return blankState();
    return asState(parsed.earned, parsed.spoiler, parsed.exportedAt);
  } catch {
    return blankState();
  }
}

/** Write a state into storage. */
export function saveState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(asState(state.earned, state.spoiler, state.exportedAt)));
}

/** Self-test: export -> wipe -> import must restore the exact same state. */
export function roundTripOk(state, validIds) {
  const text = exportState(state, '2026-11-19T00:00:00.000Z');
  const { state: back } = importState(text, validIds);
  const sameEarned = JSON.stringify(back.earned) === JSON.stringify(sortEarned(state.earned));
  return sameEarned && back.spoiler === !!state.spoiler;
}
