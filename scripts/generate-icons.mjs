#!/usr/bin/env node
/**
 * Generates the app icon, Android adaptive icon, splash icon, and web
 * favicon from the capybara face art already shipped for the Android
 * widget (src/widgets/android/capy-face.ts), instead of leaving the
 * Expo template's default graphics in place.
 *
 * The widget file exports CAPY_FACE_SVG as a plain string (real lowercase
 * SVG markup, not JSX), so it's extracted with a regex rather than
 * imported — this script runs under plain Node, outside the RN/TS
 * toolchain, via `npm run icons`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const faceSource = readFileSync(
  path.join(root, 'src/widgets/android/capy-face.ts'),
  'utf8',
);
const match = faceSource.match(/export const CAPY_FACE_SVG = ("(?:[^"\\]|\\.)*");/s);
if (!match) throw new Error('Could not find CAPY_FACE_SVG in capy-face.ts');
const faceSvg = JSON.parse(match[1]);

const viewBoxMatch = faceSvg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
if (!viewBoxMatch) throw new Error('CAPY_FACE_SVG has no viewBox to read');
const [faceWidth, faceHeight] = [Number(viewBoxMatch[1]), Number(viewBoxMatch[2])];

// Strip the outer <svg ...> wrapper, keeping just the drawn shapes, so they
// can be re-embedded at any size via a nested <svg> viewport below.
const faceInner = faceSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const CREAM = '#FFF8EF';
const CANVAS = 1024;

function compose({ background, scale }) {
  const faceRenderWidth = CANVAS * scale;
  const faceRenderHeight = (faceRenderWidth * faceHeight) / faceWidth;
  const x = (CANVAS - faceRenderWidth) / 2;
  const y = (CANVAS - faceRenderHeight) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
${background ? `<rect width="${CANVAS}" height="${CANVAS}" fill="${background}"/>` : ''}
<svg x="${x}" y="${y}" width="${faceRenderWidth}" height="${faceRenderHeight}" viewBox="0 0 ${faceWidth} ${faceHeight}">
${faceInner}
</svg>
</svg>`;
}

function render(svg, outPath, size = CANVAS) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(outPath, png);
  console.log(`wrote ${path.relative(root, outPath)} (${png.length} bytes)`);
}

const imagesDir = path.join(root, 'assets/images');

// icon.png: opaque background — this is what shows on the home screen.
render(
  compose({ background: CREAM, scale: 0.68 }),
  path.join(imagesDir, 'icon.png'),
);

// adaptive-icon.png: transparent, kept inside Android's ~66% safe zone so
// the OS mask never clips the face.
render(
  compose({ background: null, scale: 0.55 }),
  path.join(imagesDir, 'adaptive-icon.png'),
);

// splash-icon.png: transparent, composited over app.json's splash
// backgroundColor (#ffffff) by expo-splash-screen at launch.
render(
  compose({ background: null, scale: 0.68 }),
  path.join(imagesDir, 'splash-icon.png'),
);

// favicon.png: small, opaque like the app icon.
render(
  compose({ background: CREAM, scale: 0.68 }),
  path.join(imagesDir, 'favicon.png'),
  48,
);
