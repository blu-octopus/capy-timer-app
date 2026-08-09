#!/usr/bin/env node
/**
 * Synthesizes the app's sound effects as 16-bit PCM WAV files into assets/sfx/.
 *
 * These are generated rather than sourced so they stay regenerable and
 * licence-free, the same convention as the app icons (generate-icons.mjs) and
 * the capy frame components (generate-capy-frames.mjs).
 *
 * The palette is deliberately soft: sine partials with a fast attack and an
 * exponential decay, no harsh transients or square waves. That matches the
 * hand-drawn, cozy brand — a click should read as a wooden tap, not a UI beep.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SAMPLE_RATE = 44100;
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/sfx');

/**
 * One sine partial. `decay` is the exponential time constant in seconds — the
 * lower it is, the more percussive the hit.
 */
function partial({ freq, decay, gain = 1, detune = 0 }) {
  return (t) => Math.sin(2 * Math.PI * (freq + detune) * t) * gain * Math.exp(-t / decay);
}

/** Sums partials, applies a short attack ramp, and normalizes to `peak`. */
function render({ durationSec, partials, attackSec = 0.004, peak = 0.75 }) {
  const frames = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float64Array(frames);

  for (let i = 0; i < frames; i++) {
    const t = i / SAMPLE_RATE;
    let value = 0;
    for (const p of partials) value += p(t);
    // Attack ramp keeps the onset from clicking; decay is already in the partials.
    samples[i] = value * Math.min(1, t / attackSec);
  }

  let max = 0;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  const scale = max > 0 ? peak / max : 0;
  for (let i = 0; i < frames; i++) samples[i] *= scale;

  return samples;
}

/** Wraps mono float samples in a 16-bit PCM RIFF container. */
function toWav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM header size
  buffer.writeUInt16LE(1, 20); // format: PCM
  buffer.writeUInt16LE(1, 22); // channels: mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

// Pitches sit in a pentatonic-ish set so overlapping sounds never clash.
const SOUNDS = {
  // Generic press: one low wooden knock, very short.
  tap: {
    durationSec: 0.09,
    peak: 0.5,
    partials: [partial({ freq: 420, decay: 0.02 }), partial({ freq: 840, decay: 0.012, gain: 0.3 })],
  },
  // Wheel detent / option change: lighter and higher than tap so rapid
  // scrolling reads as texture rather than a series of button presses.
  tick: {
    durationSec: 0.05,
    peak: 0.32,
    partials: [partial({ freq: 1180, decay: 0.008 }), partial({ freq: 1760, decay: 0.005, gain: 0.25 })],
  },
  // Phase boundary (focus->break etc): a soft two-note rise.
  phase: {
    durationSec: 0.42,
    peak: 0.6,
    partials: [
      partial({ freq: 587.33, decay: 0.13 }), // D5
      partial({ freq: 880, decay: 0.18, gain: 0.7 }), // A5
      partial({ freq: 1174.66, decay: 0.1, gain: 0.28 }), // D6 shimmer
    ],
  },
  // Session complete: a fuller major triad that rings a little longer.
  complete: {
    durationSec: 0.9,
    peak: 0.7,
    partials: [
      partial({ freq: 523.25, decay: 0.35 }), // C5
      partial({ freq: 659.25, decay: 0.4, gain: 0.8 }), // E5
      partial({ freq: 783.99, decay: 0.45, gain: 0.7 }), // G5
      partial({ freq: 1046.5, decay: 0.3, gain: 0.35 }), // C6
      // Slight detune against C6 gives a gentle chorus shimmer.
      partial({ freq: 1046.5, decay: 0.3, gain: 0.2, detune: 1.5 }),
    ],
  },
};

mkdirSync(outDir, { recursive: true });

for (const [name, spec] of Object.entries(SOUNDS)) {
  const wav = toWav(render(spec));
  const file = path.join(outDir, `${name}.wav`);
  writeFileSync(file, wav);
  console.log(`${name.padEnd(9)} ${String(spec.durationSec).padStart(5)}s  ${(wav.length / 1024).toFixed(1)} KB`);
}

console.log(`\nWrote ${Object.keys(SOUNDS).length} sound effects to ${path.relative(process.cwd(), outDir)}`);
