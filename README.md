[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/stellarlumens29/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/stellarlumens29/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
# 55-Trophy Platinum Roadmap — 55/55 Entries Verified, 100% Browser-Saved Progress

**Competition:** `gta6-trophy-guide-01` — Build the best GTA 6 trophy guide ($250, top 50 share).
**Title (submission):** 55-Trophy Platinum Roadmap — 55/55 Entries Verified, 100% Browser-Saved Progress

## The idea — a "Leonida platinum control room"

Not a conventional checklist. One screen that answers three questions: how
far from Platinum? What can I miss? What should I do next?

- **Dashboard:** overall % with a progress ring, earned/remaining by grade
  (Platinum 1, Gold 2, Silver 6, Bronze 46), ~200 h / 4-of-10 estimates.
- **Roadmap:** 4 steps to the Platinum (story → stranger strands & side
  finales → activities & collectibles → cleanup & the cryptic five), each
  with its own progress bar, plus a "Do next" list that puts the missable
  trophy first.
- **Missable warnings:** Positive Mental Attitude is the only trophy
  launch-week guides flag as potentially missable (Lucia's balcony
  meditation in Chapter 1, no mission replay); Strangers & Freaks has one
  time-sensitive strand (Race Against Yago, Chapter 3). The save rule for
  the whole run is on the page.
- **Filters:** by kind (Story / Missions / Activities / Collectibles /
  Misc), by grade, by search, earned-only, missable-only.
- **Spoiler mode (on by default):** the 28 hidden trophies stay concealed
  — name, description and guide — until earned.
- **Every trophy expandable:** an own-words guide, its verification status,
  and its sources. Five trophies have no confirmed unlock method at launch
  — their guides say so instead of inventing one.
- **Persistence:** progress saves in the browser (localStorage) and survives
  refresh; export to JSON, import it back, reset. Export → clear → import
  restores exactly (tested in Node and in headless Chromium, `?qa=roundtrip`).

## Verification (19 Nov 2026)

Every name, official description and PS5 grade was cross-checked against the
kit starter list and OutputLag's GTA 6 Trophy List, which states its
descriptions are the official text; counts inside the guides (250 stunts, 42
shooting-range medals, 14 Top Fun locations, 18 meditation spots, 9 activity
types, 8 garages, 9 gangs, 500 Criminal Profile actions) were cross-checked
against KeenGamer's Trophy Guide & Platinum Roadmap; the 55 count and the
Platinum were confirmed by Push Square via Exophase. All 55/55 verified.
Hidden split 27 visible / 28 hidden as reported by Exophase-derived lists
(one outlet reports 15 hidden; the 28 figure is used because OutputLag,
u7buy, egamers and Leonida Hub all report 28 — noted in the data file).

Guide status in `app/data/trophies.json`: 47 supported, 4 community-reported
(method reported by launch guides, official description only hints at it),
4 unconfirmed-method (no method invented). No Rockstar logo or artwork
anywhere; original look, system fonts only, no network requests at all.

## Checks run

- `node --check` on `app/src/state.js`, `app/src/app.js`, `take-shots.mjs`,
  `test-roundtrip.mjs` — OK.
- `node test-roundtrip.mjs` — 12/12 PASS (deterministic export, dedupe/sort/
  drop-unknown on import, 4 malformed inputs rejected, empty + full-55
  round-trips).
- `?qa=roundtrip` in headless Chromium — **QA PASS**, export → clear →
  import restored [2, 3, 28, 55] exactly.
- `node take-shots.mjs` — 4 real renders, all within the gate (≤256 KiB,
  long side ≤1280, short side ≥480), visually inspected.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` twice + `diff -r` —
  DETERMINISTIC-OK; dossier.json 732,371 bytes.
- Kit `check --kit . --repo <entry> --worktree` — 4 passed (snapshot,
  license_osi MIT, entrypoint node22, competition_open — the competition
  opened 2026-11-19T11:00:00Z), 0 failed.
- Offline: no `http` strings, no CDN, no external fonts in `app/`.
- Secrets scan: no API key / keypair material anywhere in the entry.

## Run it

```sh
node serve.ts            # http://localhost:8080
# or: node main.ts with MAKEFUN_OUTPUT_DIR=out
```

## Layout

- `main.ts` — Node 22 entrypoint: copies `app/` + `screenshots/` to
  `/output`, writes `dossier.json` via `vendor/makefun-frontend.ts` (unchanged).
- `app/index.html`, `app/style.css` — dashboard UI.
- `app/src/app.js` — rendering, filters, spoiler mode, roadmap, export/import.
- `app/src/state.js` — pure persistence/export/import logic (shared by the
  browser and the Node test).
- `app/data/trophies.json` — all 55 trophies + guides + sources + verification.
- `screenshots/` — 4 screenshots (dashboard first).
- `vendor/makefun-frontend.ts` — kit copy, unchanged (sha256
  4c8da1c8e76490b3a847670f49137d3ec23953e3c988fe6a6cb320fce5739240).
- `test-roundtrip.mjs`, `take-shots.mjs`, `shots.json` — test + screenshot tooling.
