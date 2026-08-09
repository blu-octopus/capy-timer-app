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
 *
 * `tap`/`tick`/`phase`/`complete` render through the plain sine-partial engine
 * below (`partial`/`render`). `denied`/`unlock` render through a second,
 * layered engine further down — filtered noise, pitch glide, and a shimmer
 * tail — added after reading through cuelume (github.com/Danilaa1/cuelume), a
 * web-only Web Audio library that can't run in this app at all (it's built on
 * `window.AudioContext` and DOM `data-*` attributes, neither of which exist
 * on Hermes/React Native). What *is* portable is its synthesis vocabulary:
 * additive tone layers, filtered-noise layers for percussive texture, and a
 * feedback-delay shimmer for a soft tail — reimplemented here as offline
 * sample-buffer math (there's no live audio graph to render through, only a
 * WAV file to write once) rather than copied. The two new sounds below are
 * original recipes tuned to this app's wooden/cozy voice, not ports of
 * cuelume's own (more clinical, mechanical) palette.
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

/** Scales `samples` in place so its loudest sample sits at `peak`. */
function normalizeToPeak(samples, peak) {
  let max = 0;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  const scale = max > 0 ? peak / max : 0;
  for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  return samples;
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

  return normalizeToPeak(samples, peak);
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

// ---------------------------------------------------------------------------
// Layered engine — tone/noise layers, pitch glide, and a shimmer tail.
//
// The partial/render engine above sums whole-duration sine partials; that's
// enough for a clean chime but can't make a percussive "knock" texture (no
// noise) or a sweep (no glide). This engine renders one layer at a time into
// its own offset slice of the output buffer, which is what makes glide and
// independently-timed noise/tone layers possible.
// ---------------------------------------------------------------------------

const ENVELOPE_FLOOR = 0.0001;

/**
 * Exponential attack-then-decay envelope, matching Web Audio's
 * `exponentialRampToValueAtTime` shape: a ramp can't start *at* zero (that's
 * a divide-by-zero for an exponential curve), so it ramps from a near-silent
 * floor up to `peak` and back down to it, not to true zero.
 */
function envelopeGain(t, { attack, decay, peak }) {
  if (t < 0) return 0;
  if (t < attack) return ENVELOPE_FLOOR * Math.pow(peak / ENVELOPE_FLOOR, t / attack);
  const d = t - attack;
  if (d > decay) return 0;
  return peak * Math.pow(ENVELOPE_FLOOR / peak, d / decay);
}

/**
 * RBJ Audio EQ Cookbook biquad coefficients (lowpass, or constant-0dB-peak
 * bandpass), normalized by a0. The standard formulas Web Audio's
 * `BiquadFilterNode` itself implements — reused here because there's no
 * simpler filter that still sounds like a filter rather than a muffled sine.
 */
function biquadCoeffs(type, freq, q, sampleRate) {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cosw0 = Math.cos(w0);

  const [b0, b1, b2] =
    type === 'lowpass' ? [(1 - cosw0) / 2, 1 - cosw0, (1 - cosw0) / 2] : [alpha, 0, -alpha];
  const a0 = 1 + alpha;

  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cosw0) / a0, a2: (1 - alpha) / a0 };
}

/** Direct Form I biquad, applied in place. */
function applyBiquad(samples, coeffs) {
  const { b0, b1, b2, a1, a2 } = coeffs;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    samples[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return samples;
}

/** A layer's own local duration, before it's placed at `offset` in the mix. */
function layerFrames(layer, sampleRate) {
  return Math.round((layer.attack + layer.decay) * sampleRate);
}

/**
 * One sine partial with an exponential attack/decay envelope, optionally
 * gliding in pitch. The glide itself is exponential too (matching
 * `exponentialRampToValueAtTime` on frequency), computed per sample via
 * phase accumulation — the phase has to be the *integral* of the
 * instantaneous frequency, not `sin(2*pi*freq(t)*t)`, or the sweep comes out
 * with the wrong shape and an audible discontinuity at every sample.
 */
function renderToneLayer(layer, sampleRate) {
  const frames = layerFrames(layer, sampleRate);
  const out = new Float64Array(frames);
  const glideTime = layer.glideTime ?? layer.attack + layer.decay;

  let phase = 0;
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    const freq =
      layer.glideTo === undefined
        ? layer.frequency
        : layer.frequency * Math.pow(layer.glideTo / layer.frequency, Math.min(t, glideTime) / glideTime);
    phase += (2 * Math.PI * freq) / sampleRate;
    out[i] = Math.sin(phase) * envelopeGain(t, layer);
  }
  return out;
}

/** Filtered white noise, enveloped the same way a tone layer is. */
function renderNoiseLayer(layer, sampleRate) {
  const frames = layerFrames(layer, sampleRate);
  const noise = new Float64Array(frames);
  for (let i = 0; i < frames; i++) noise[i] = Math.random() * 2 - 1;

  applyBiquad(noise, biquadCoeffs(layer.filterType, layer.filterFrequency, layer.filterQ ?? 1, sampleRate));

  const out = new Float64Array(frames);
  for (let i = 0; i < frames; i++) out[i] = noise[i] * envelopeGain(i / sampleRate, layer);
  return out;
}

/**
 * A soft echo tail: repeated, progressively lowpassed and quieter copies of
 * the dry mix, spaced `delay` apart. Approximates a feedback delay line
 * (each repeat is the previous one re-filtered and re-attenuated by
 * `feedback`, rather than a true per-sample recursive loop) — close enough
 * for a decorative "dust" tail, and far simpler than modeling the loop
 * exactly.
 */
function applyShimmer(dry, shimmer, sampleRate) {
  const delayFrames = Math.round(shimmer.delay * sampleRate);
  const coeffs = biquadCoeffs('lowpass', shimmer.lowpass, Math.SQRT1_2, sampleRate);

  let tap = dry;
  let gain = shimmer.wet;
  let repeats = 1;
  // Enough repeats for the tail to actually decay to nothing, capped so a
  // feedback close to 1 can't loop forever.
  while (gain > 0.0005 && repeats < 40) {
    gain *= shimmer.feedback;
    repeats++;
  }

  const out = new Float64Array(dry.length + delayFrames * repeats);
  out.set(dry, 0);

  gain = shimmer.wet;
  for (let rep = 1; rep <= repeats; rep++) {
    tap = applyBiquad(tap.slice(), coeffs);
    const at = delayFrames * rep;
    for (let i = 0; i < tap.length; i++) out[at + i] += tap[i] * gain;
    gain *= shimmer.feedback;
  }

  return out;
}

/**
 * Renders a recipe of tone/noise layers (each independently timed via its
 * own `offset`) into one normalized buffer, with an optional shimmer tail.
 */
function renderLayered({ layers, shimmer, peak = 0.75 }) {
  const durationSec = Math.max(...layers.map((l) => (l.offset ?? 0) + l.attack + l.decay)) + 0.05;
  let mix = new Float64Array(Math.round(durationSec * SAMPLE_RATE));

  for (const layer of layers) {
    const rendered = layer.kind === 'noise' ? renderNoiseLayer(layer, SAMPLE_RATE) : renderToneLayer(layer, SAMPLE_RATE);
    const startFrame = Math.round((layer.offset ?? 0) * SAMPLE_RATE);
    for (let i = 0; i < rendered.length && startFrame + i < mix.length; i++) {
      mix[startFrame + i] += rendered[i];
    }
  }

  if (shimmer) mix = applyShimmer(mix, shimmer, SAMPLE_RATE);

  return normalizeToPeak(mix, peak);
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
  // Blocked action (not enough coins): a dull knock and a soft downward dip —
  // "not yet", not an alarm. No shimmer; a refusal shouldn't sparkle.
  denied: {
    peak: 0.55,
    layers: [
      { kind: 'noise', filterType: 'bandpass', filterFrequency: 520, filterQ: 1.3, attack: 0.002, decay: 0.05, peak: 0.35 },
      { kind: 'tone', frequency: 493.88, glideTo: 369.99, glideTime: 0.16, offset: 0.03, attack: 0.01, decay: 0.2, peak: 0.18 }, // B4 -> F#4
    ],
  },
  // Companion unlocked: a bright tick, an upward glide, and a resolving high
  // note with a soft shimmer tail — smaller than `complete` (finishing a
  // whole session is still the bigger win) but with more sparkle, since
  // spending coins on a new buddy is its own little celebration.
  unlock: {
    peak: 0.65,
    layers: [
      { kind: 'noise', filterType: 'bandpass', filterFrequency: 3600, filterQ: 1.8, attack: 0.001, decay: 0.018, peak: 0.1 },
      { kind: 'tone', frequency: 440, glideTo: 880, glideTime: 0.1, offset: 0.008, attack: 0.006, decay: 0.16, peak: 0.16 }, // A4 -> A5
      { kind: 'tone', frequency: 1318.51, offset: 0.11, attack: 0.006, decay: 0.22, peak: 0.14 }, // E6
    ],
    shimmer: { delay: 0.09, feedback: 0.22, wet: 0.14, lowpass: 4200 },
  },
};

mkdirSync(outDir, { recursive: true });

for (const [name, spec] of Object.entries(SOUNDS)) {
  const samples = spec.layers ? renderLayered(spec) : render(spec);
  const wav = toWav(samples);
  const file = path.join(outDir, `${name}.wav`);
  writeFileSync(file, wav);
  const durationSec = (samples.length / SAMPLE_RATE).toFixed(2);
  console.log(`${name.padEnd(9)} ${durationSec.padStart(5)}s  ${(wav.length / 1024).toFixed(1)} KB`);
}

console.log(`\nWrote ${Object.keys(SOUNDS).length} sound effects to ${path.relative(process.cwd(), outDir)}`);
