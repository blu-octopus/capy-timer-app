#!/usr/bin/env node
/**
 * Converts the raw, paste-in SVG frames under components/capy/frames/ into
 * react-native-svg TSX components under components/capy/frames-generated/
 * (mirroring the same directory structure), via @svgr/cli.
 *
 * Figma's export names every layer (capy > head / lower body / shadow, and
 * further down into individual parts) as a `<g id="...">`. SVGR's default
 * SVGO pass throws that away — `collapseGroups` folds groups into their
 * parent, `cleanupIds` strips/renames whatever ids survive, and `mergePaths`
 * fuses same-styled sibling paths together — which is fine for an icon but
 * not for character art meant to be rigged: nothing would be left to target
 * for a per-part animation (or a future stretch/union deformation) later.
 * capy-frames.svgo.config.json disables just those three plugins so each
 * named part comes through the generated TSX as its own addressable `<G
 * id="...">`, unchanged visually from letting SVGO run free.
 *
 * Three further post-processing passes fix things SVGR's react-native
 * template can't handle on its own, or add to it:
 * - `xmlns` isn't a valid prop on this project's react-native-svg `Svg`
 *   type, so it's stripped.
 * - SVGR drops `<filter>`/`<feGaussianBlur>` elements entirely (even though
 *   react-native-svg itself supports them natively) but leaves the
 *   `filter="url(#...)"` references that pointed at them, which would
 *   otherwise dangle. They're stripped too — this loses shadow/highlight
 *   blur softness (shadows render as hard-edged shapes) until someone
 *   hand-adds the Filter/FeGaussianBlur components back from the source
 *   .svg's <defs>.
 * - Every `<G id="...">` is rewritten to a Reanimated `AnimatedG`, and the
 *   generated component gains an optional `parts` prop keyed by that same
 *   id — `<SvgIdle2 parts={{ head: headAnimatedProps }} />`, each value built
 *   with `useAnimatedProps<GProps>` (react-native-svg's G takes
 *   opacity/translateX/translateY/rotation/scale/... as plain props, not a
 *   `style`, so `animatedProps` is the correct hook here, not
 *   `useAnimatedStyle`) — so any named group a future frame is drawn with is
 *   animatable (per-part transforms, not just a whole-illustration
 *   crossfade) without ever touching this generated file or this script
 *   again. Groups without an id (or files with none — a handful of the
 *   older paste-ins predate consistent Figma layer naming;
 *   re-copying them from Figma the same way idle-2 was would add it) still
 *   become AnimatedG for consistency, they just can't be targeted by name.
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
// SVGR's --svgo-config resolves a .json path via `require(path.join(cwd,
// arg))` — handing it an already-absolute path double-joins into a bogus
// nested path, so this has to stay relative to cwd (this script only ever
// runs via `npm run frames` from the repo root).
const svgoConfig = path.relative(process.cwd(), path.join(here, 'capy-frames.svgo.config.json'));

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
    [
      '--native',
      '--typescript',
      '--no-dimensions',
      '--filename-case',
      'pascal',
      '--svgo-config',
      svgoConfig,
      '-d',
      outputDir,
      inputDir,
    ],
    { stdio: 'inherit' },
  );
}

// Every generated file ends in the same two lines, regardless of which
// props/groups it has: SVGR's fixed --native --typescript template always
// closes the import block with the SvgProps type import, then opens the
// component as `(props: SvgProps) => (` on the next line — a reliable anchor
// for splicing in the parts-prop plumbing without a full JSX parse.
const SVG_PROPS_IMPORT = 'import type { SvgProps } from "react-native-svg";';
const COMPONENT_HEADER = /const (Svg\w+) = \(props: SvgProps\) => \(/;

function addPartAnimationSupport(text) {
  if (!text.includes('<G') || !COMPONENT_HEADER.test(text)) return text;

  // react-native-svg's G doesn't declare a `style` prop (SVG primitives take
  // opacity/translateX/translateY/rotation/scale/... directly, per GProps),
  // so groups animate through Reanimated's `animatedProps`, not `style` —
  // build each entry with `useAnimatedProps<GProps>(() => ({ ... }))`.
  // GProps joins the existing SvgProps type import rather than getting a
  // line of its own — a second `from "react-native-svg"` would trip
  // import/no-duplicates in every generated file.
  text = text.replace(
    SVG_PROPS_IMPORT,
    `import type { SvgProps, GProps } from "react-native-svg";\nimport Animated from "react-native-reanimated";`,
  );

  text = text.replace(
    COMPONENT_HEADER,
    (_match, name) =>
      `const AnimatedG = Animated.createAnimatedComponent(G);\n\n` +
      `type ${name}Props = SvgProps & {\n` +
      `  /** Per-part animated props, keyed by the Figma layer name each group in this frame was exported with. Build each value with useAnimatedProps<GProps>. */\n` +
      `  parts?: Partial<Record<string, Partial<GProps>>>;\n` +
      `};\n` +
      `const ${name} = ({ parts, ...svgProps }: ${name}Props) => (`,
  );
  text = text.replace('{...props}', '{...svgProps}');

  // Named groups get their animatedProps wired to the matching `parts`
  // entry; unnamed ones (and their shared closing tag) still move to
  // AnimatedG so every group in the tree is uniformly one kind of element.
  text = text.replace(
    /<G id="([^"]+)"/g,
    (_match, id) => `<AnimatedG id="${id}" animatedProps={parts?.["${id}"]}`,
  );
  text = text.replace(/<G(?=[\s>/])/g, '<AnimatedG');
  text = text.replace(/<\/G>/g, '</AnimatedG>');

  return text;
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
    text = addPartAnimationSupport(text);
    writeFileSync(full, text);
  }
}

postProcess(outDir);

console.log(`Regenerated ${leafDirs.length} frame director${leafDirs.length === 1 ? 'y' : 'ies'} into ${path.relative(root, outDir)}`);
