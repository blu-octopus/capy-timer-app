#!/usr/bin/env node
/**
 * Converts the raw, paste-in SVG frames under components/capy/frames/ into
 * react-native-svg TSX components under components/capy/frames-generated/
 * (mirroring the same directory structure), via @svgr/cli.
 *
 * Two post-processing passes fix things SVGR's react-native template can't
 * handle on its own:
 * - `xmlns` isn't a valid prop on this project's react-native-svg `Svg`
 *   type, so it's stripped.
 * - SVGR drops `<filter>`/`<feGaussianBlur>` elements entirely (even though
 *   react-native-svg itself supports them natively) but leaves the
 *   `filter="url(#...)"` references that pointed at them, which would
 *   otherwise dangle. They're stripped too — this loses shadow/highlight
 *   blur softness (shadows render as hard-edged shapes) until someone
 *   hand-adds the Filter/FeGaussianBlur components back from the source
 *   .svg's <defs>.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const framesDir = path.join(root, 'components/capy/frames');
const outDir = path.join(root, 'components/capy/frames-generated');

const svgrBin = path.join(root, 'node_modules/.bin/svgr');

// Every leaf directory under frames/ that directly contains .svg files
// (body, head, variations/<skin>) gets its own mirrored output directory.
function findLeafSvgDirs(dir, relative = '') {
  const entries = readdirSync(dir, { withFileTypes: true });
  const hasSvg = entries.some((e) => e.isFile() && e.name.endsWith('.svg'));
  const subdirs = entries.filter((e) => e.isDirectory());
  const leaves = hasSvg ? [relative || '.'] : [];
  for (const sub of subdirs) {
    leaves.push(...findLeafSvgDirs(path.join(dir, sub.name), path.join(relative, sub.name)));
  }
  return leaves;
}

const leafDirs = findLeafSvgDirs(framesDir);

for (const rel of leafDirs) {
  const inputDir = path.join(framesDir, rel);
  const outputDir = path.join(outDir, rel);
  execFileSync(
    svgrBin,
    ['--native', '--typescript', '--no-dimensions', '--filename-case', 'pascal', '-d', outputDir, inputDir],
    { stdio: 'inherit' },
  );
}

function postProcess(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      postProcess(full);
      continue;
    }
    if (!entry.name.endsWith('.tsx')) continue;
    let text = readFileSync(full, 'utf8');
    text = text.replace(/\s*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
    text = text.replace(/\s*filter="url\([^)]*\)"/g, '');
    writeFileSync(full, text);
  }
}

postProcess(outDir);

console.log(`Regenerated ${leafDirs.length} frame director${leafDirs.length === 1 ? 'y' : 'ies'} into ${path.relative(root, outDir)}`);
