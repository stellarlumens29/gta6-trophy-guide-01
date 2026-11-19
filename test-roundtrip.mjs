// Node round-trip test for app/src/state.js.
//
// Export -> wipe -> import must restore the exact same earned list and
// spoiler flag, deterministically. Run: node test-roundtrip.mjs
import { blankState, exportState, importState, roundTripOk } from './app/src/state.js';

const validIds = Array.from({ length: 55 }, (_, i) => i + 1);
const FIXED_NOW = '2026-11-19T00:00:00.000Z';
let failures = 0;

function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`);
  if (!cond) failures += 1;
}

const sample = { ...blankState(), earned: [2, 3, 28, 55], spoiler: true };

check('roundTripOk on a sample state', roundTripOk(sample, validIds));

const first = exportState(sample, FIXED_NOW);
const second = exportState(sample, FIXED_NOW);
check('export is deterministic (same bytes twice)', first === second);

const { state: restored, dropped } = importState(first, validIds);
check('import restores earned exactly', JSON.stringify(restored.earned) === '[2,3,28,55]');
check('import restores spoiler flag', restored.spoiler === true);
check('import drops nothing valid', dropped === 0);

const messy = exportState({ ...blankState(), earned: [55, 2, 2, 99, 3], spoiler: false });
const { state: cleaned, dropped: droppedMessy } = importState(messy, validIds);
check(
  'import dedupes + sorts + drops unknown ids',
  JSON.stringify(cleaned.earned) === '[2,3,55]' && droppedMessy === 1,
);

const badInputs = [
  'not json',
  '{"app":"other-app","earned":[]}',
  '{"app":"gta6-trophy-guide-01"}',
  '[1,2,3]',
];
for (const bad of badInputs) {
  let threw = false;
  try {
    importState(bad, validIds);
  } catch {
    threw = true;
  }
  check(`import rejects ${JSON.stringify(bad.slice(0, 30))}`, threw);
}

check('empty state round-trips', roundTripOk(blankState(), validIds));
check('full 55 round-trips', roundTripOk({ ...blankState(), earned: validIds }, validIds));

if (failures) {
  console.error(`${failures} FAILURES`);
  process.exitCode = 1;
} else {
  console.log('All round-trip tests PASS.');
}
