#!/usr/bin/env node
// Take the gta6-trophy-guide-01 screenshots.
//
// Serves app/ on :8125, captures each ?shot= scene listed in shots.json
// with headless Chromium, then gates every file (format, size <= 256 KiB,
// long side <= 1280, short side >= 480) and converts an oversize PNG to
// JPEG quality 82 with PIL when available.
// Usage: node take-shots.mjs   (run from this directory)
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const outDir = join(here, 'screenshots');
mkdirSync(outDir, { recursive: true });

const PORT = 8125;
const MAX_BYTES = 262144;
const MAX_LONG_SIDE = 1280;
const MIN_SHORT_SIDE = 480;
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
// NOTE: /opt/meta-chromium/chrome refuses to start in this VM
// ("Hatch WebGL domain policy is required for browser startup", exit 13);
// the Playwright-cached Chromium above works headless.

function readDimensions(path) {
  const buf = readFileSync(path);
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { format: 'PNG', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) {
        off += 1;
        continue;
      }
      const marker = buf[off + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { format: 'JPEG', width: buf.readUInt16BE(off + 7), height: buf.readUInt16BE(off + 5) };
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        off += 2;
        continue;
      }
      off += 2 + buf.readUInt16BE(off + 2);
    }
  }
  return null;
}

function pngToJpeg(path) {
  execFileSync(
    'python3',
    ['-c', 'import sys; from PIL import Image; im = Image.open(sys.argv[1]).convert("RGB"); im.save(sys.argv[1], "JPEG", quality=82)', path],
    { stdio: 'inherit' },
  );
}

async function waitForServer(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function capture(shot, out) {
  const url = `http://127.0.0.1:${PORT}/${shot.query}`;
  console.log(`shot ${shot.name} <- ${url}`);
  execFileSync(
    CHROME,
    ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      `--window-size=${shot.w},${shot.h}`, '--timeout=12000', `--screenshot=${out}`, url],
    { stdio: 'ignore', timeout: 120000 },
  );
}

function gate(shot, out) {
  if (!existsSync(out)) {
    console.error('  FAIL: no file written');
    return false;
  }
  let size = statSync(out).size;
  let info = readDimensions(out);
  if (!info) {
    console.error('  FAIL: unrecognised format');
    return false;
  }
  if (info.format === 'PNG' && size > MAX_BYTES) {
    console.log(`  oversize PNG (${size} bytes) — converting to JPEG quality 82`);
    try {
      pngToJpeg(out);
      size = statSync(out).size;
      info = readDimensions(out);
    } catch {
      console.error('  FAIL: PIL conversion unavailable');
      return false;
    }
  }
  const ok = size <= MAX_BYTES
    && Math.max(info.width, info.height) <= MAX_LONG_SIDE
    && Math.min(info.width, info.height) >= MIN_SHORT_SIDE;
  console.log(`  ${shot.name}: ${info.format} ${info.width}x${info.height}, ${size} bytes — ${ok ? 'OK' : 'FAIL'}`);
  return ok;
}

async function main() {
  if (!existsSync(CHROME)) {
    console.error('ERROR: no Chromium at ' + CHROME);
    process.exitCode = 1;
    return;
  }
  const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'ignore' });
  let failed = false;
  try {
    if (!(await waitForServer(`http://127.0.0.1:${PORT}/`))) {
      console.error('ERROR: serve.ts did not answer');
      process.exitCode = 1;
      return;
    }
    for (const shot of shots) {
      const out = join(outDir, shot.name);
      try {
        capture(shot, out);
      } catch (err) {
        console.error(`  FAIL: chromium exited ${err.status ?? err.message}`);
        failed = true;
        continue;
      }
      if (!gate(shot, out)) failed = true;
    }
  } finally {
    server.kill();
  }
  if (failed) process.exitCode = 1;
  else console.log('All screenshots OK.');
}

main();
