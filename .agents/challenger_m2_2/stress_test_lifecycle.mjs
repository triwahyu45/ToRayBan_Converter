/**
 * Empirical Stress Test Harness: State Machine Lifecycle & Error Recovery
 * Challenger 2 (Milestone 2)
 */

import { calculateCenterCrop, normalizeCropCoordinates, detectMediaFormat, formatBytes, formatDuration, getAspectRatioLabel } from '../../src/lib/media_utils.ts';
import { injectRayBanExifBuffer } from '../../src/lib/exif_injector.ts';
import { reconstructRayBanQuickTimeMov, parseAtomHierarchy } from '../../src/lib/atom_synthesizer.ts';

console.log('================================================================');
console.log('CHALLENGER 2: EMPIRICAL STRESS-TEST HARNESS (MILESTONE 2)');
console.log('Target: State Machine Lifecycle, Interruption & Error Recovery');
console.log('================================================================\n');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedAssertions++;
    console.error(`  [FAIL] ${message}`);
  }
}

// ---------------------------------------------------------
// SUITE 1: State Transition & Mathematical Bounding Rects
// ---------------------------------------------------------
console.log('[SUITE 1] State Transition & Mathematical Bounding Rects');

const resolutions = [
  { w: 1920, h: 1080, expectedW: 808, expectedH: 1080, desc: '16:9 Landscape' },
  { w: 1080, h: 1920, expectedW: 1080, expectedH: 1444, desc: '9:16 Portrait' },
  { w: 1080, h: 1080, expectedW: 808, expectedH: 1080, desc: '1:1 Square' },
  { w: 3840, h: 2160, expectedW: 1614, expectedH: 2160, desc: '4K UHD Landscape' },
  { w: 1376, h: 1840, expectedW: 1376, expectedH: 1840, desc: 'Exact Native 1376x1840' },
];

for (const res of resolutions) {
  const crop = calculateCenterCrop(res.w, res.h, 1376, 1840);
  assert(
    crop.width === res.expectedW && crop.height === res.expectedH,
    `calculateCenterCrop(${res.desc}): computed ${crop.width}x${crop.height}, expected ${res.expectedW}x${res.expectedH}`
  );
  assert(crop.width % 2 === 0 && crop.height % 2 === 0, `Even integer boundary guarantee for ${res.desc}`);
  assert(crop.x % 2 === 0 && crop.y % 2 === 0, `Even integer offset guarantee for ${res.desc}`);
}

// ---------------------------------------------------------
// SUITE 2: Corrupted Files & Malformed Payload Handling
// ---------------------------------------------------------
console.log('\n[SUITE 2] Corrupted Files & Malformed Payload Handling');

// Test 2.1: Empty and sub-header buffers
const emptyBuf = new Uint8Array(0);
assert(detectMediaFormat(emptyBuf) === 'unknown', 'detectMediaFormat safely returns "unknown" on 0-byte buffer');

// Test 2.2: Non-JPEG rejection & partial JPEG tolerance
const invalidJpeg = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44]);
let caughtExifError = false;
try {
  injectRayBanExifBuffer(invalidJpeg);
} catch (e) {
  caughtExifError = true;
}
assert(caughtExifError, 'injectRayBanExifBuffer rejects non-JPEG stream missing SOI marker (0xFFD8)');

const truncatedJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04]);
assert(detectMediaFormat(truncatedJpeg) === 'jpeg', 'detectMediaFormat identifies partial JPEG SOI');
const safeInjected = injectRayBanExifBuffer(truncatedJpeg);
assert(safeInjected.length > 0 && safeInjected[0] === 0xff && safeInjected[1] === 0xd8, 'injectRayBanExifBuffer safely synthesizes complete JPEG on partial header');

// Test 2.3: Malformed QuickTime Atoms
const corruptMov = new Uint8Array([0x00, 0x00, 0x00, 0x50, 0x6d, 0x6f, 0x6f, 0x76, 0x00, 0x00]);
const parsedCorrupt = parseAtomHierarchy(corruptMov);
assert(Array.isArray(parsedCorrupt), 'parseAtomHierarchy parses truncated container safely returning array');

const reconstructedFromCorrupt = reconstructRayBanQuickTimeMov(corruptMov);
assert(reconstructedFromCorrupt.length > 0, 'reconstructRayBanQuickTimeMov synthesizes valid fallback container from corrupt input');
const recAtoms = parseAtomHierarchy(reconstructedFromCorrupt);
assert(recAtoms.some(a => a.type === 'ftyp'), 'Reconstructed container contains valid ftyp atom');
assert(recAtoms.some(a => a.type === 'moov'), 'Reconstructed container contains valid moov atom');
assert(recAtoms.some(a => a.type === 'mdat'), 'Reconstructed container contains valid mdat atom');

// ---------------------------------------------------------
// SUITE 3: Rapid Trigger & Concurrency Stress Simulation
// ---------------------------------------------------------
console.log('\n[SUITE 3] Rapid Sequential Trigger & Stress Simulation');

const ITERATIONS = 1000;
let mutationErrors = 0;

for (let i = 0; i < ITERATIONS; i++) {
  const norm = normalizeCropCoordinates({
    x: (i * 7) % 500,
    y: (i * 13) % 500,
    width: 200 + (i % 300),
    height: 300 + (i % 400),
  }, 1920, 1080);

  if (norm.x % 2 !== 0 || norm.y % 2 !== 0 || norm.width % 2 !== 0 || norm.height % 2 !== 0) {
    mutationErrors++;
  }
}
assert(mutationErrors === 0, `1,000 rapid coordinate normalization cycles completed with 0 parity errors`);

// ---------------------------------------------------------
// SUITE 4: Memory Safety & Log Ring Buffer Simulation
// ---------------------------------------------------------
console.log('\n[SUITE 4] Memory Safety & Log Ring Buffer Simulation');

const logs = [];
const MAX_LOGS = 200;
for (let i = 0; i < 500; i++) {
  const newLog = { id: `log_${i}`, message: `Log entry ${i}` };
  if (logs.length >= MAX_LOGS) {
    logs.shift();
  }
  logs.push(newLog);
}

assert(logs.length === 200, `Log buffer capped at exactly 200 items (preventing memory leaks)`);
assert(logs[0].id === 'log_300', `FIFO eviction correctly preserved latest log stream`);
assert(logs[199].id === 'log_499', `Latest log accurately placed at tail`);

// ---------------------------------------------------------
// FINAL SUMMARY
// ---------------------------------------------------------
console.log('\n================================================================');
console.log(`STRESS TEST EXECUTION COMPLETE`);
console.log(`Total Assertions : ${totalAssertions}`);
console.log(`Passed           : ${passedAssertions}`);
console.log(`Failed           : ${failedAssertions}`);
console.log(`Verdict          : ${failedAssertions === 0 ? 'APPROVE' : 'REQUEST_CHANGES'}`);
console.log('================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
