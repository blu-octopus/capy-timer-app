# Capy animation frames — paste-in pathway

Scaffold for the frame-based animation rework: each mood gets 2 hand-drawn SVG frames instead
of Reanimated motion applied to one static drawing (the current approach in `CapyMascot.tsx`),
and the app smart-animates (crossfade/morph) between them.

## Layering, bottom to top

1. **`body/`** — the single shared capybara body (no head), reused underneath every skin.
2. **`variations/<skin>/`** — the costume overlay for one companion (avocado shell, egg
   shell, toilet bowl, fighting gear). The `basic` skin has no overlay — it's just body + head.
3. **`head/`** — the shared head. Whether it renders on top of a given variation, or is
   replaced/hidden by it (e.g. a bowl that fully encloses the capy), is a per-skin decision
   made once that variation's frames exist — not encoded in this scaffold.

## States and frames

Named to match the Figma layer panel so paste-in is copy-paste with no renaming — but **not
every layer has every state, and not every state has 2 frames.** Only add what a given layer
or skin actually animates:

- `body/` — all three states, 2 frames each: `idle-1/2`, `mad-1/2`, `dance-1/2`.
- `head/` — one frame per state, no `dance` (the body's motion carries the dance animation;
  the head pose only swaps between `idle.svg` and `mad.svg`).
- `variations/<skin>/` — whatever that skin needs. Most currently have the full `idle-1/2`,
  `mad-1/2`, `dance-1/2` set; `toilet/` currently only has `idle-1.svg`/`idle-2.svg` — it
  doesn't get a mad or dance costume state.

When adding frames for a layer/skin, match its existing file pattern (single vs. `-1`/`-2`)
rather than defaulting back to the full 6-file template.

## How to paste

Open the target file and replace the placeholder comment with the raw `<svg>...</svg>` markup
exported from Figma — paste it as-is, lowercase attributes and all. No JSX conversion needed
here; run `npm run frames` afterward (`scripts/generate-capy-frames.mjs`) to convert every
`.svg` under this directory into a `react-native-svg` TSX component under
`components/capy/frames-generated/` (mirrored directory structure, one component per file).
Don't hand-edit anything under `frames-generated/` — it's regenerated wholesale, not merged.

## Name your layers in Figma — they become the animation rig

Figma writes each layer's name into the export as `<g id="...">`, and the generator keeps
those groups intact (it disables the SVGO passes that would otherwise flatten them —
`scripts/capy-frames.svgo.config.json`). Every named group becomes an addressable part on the
generated component:

```tsx
const headProps = useAnimatedProps<GProps>(() => ({ translateY: bob.value }));
<SvgIdle2 parts={{ head: headProps }} />
```

So a layer named `head` in Figma is animatable by that exact name, with no code generation
step to re-run and nothing to register. Note it's `animatedProps`, built with
`useAnimatedProps<GProps>` — *not* `useAnimatedStyle`: react-native-svg's `G` takes
`opacity`/`translateX`/`translateY`/`rotation`/`scale` as plain props and has no `style`.

Two things follow from this:

- **Name the parts you might want to move** (`head`, `lower body`, `left ear`, `arm`…). A few
  older paste-ins — `body/idle-1.svg`, `head/*.svg`, `variations/fighting/idle-1.svg` — came
  across with no ids at all and can't be rigged until they're re-copied from Figma the way
  `idle-2` was.
- **Keep joint overlaps as their own shapes.** If a part will move independently, draw the
  seam where it meets its neighbour as a small shape unioned into *both* silhouettes, rather
  than booleaning the whole limb into one continuous outline. A part that shares an outline
  with the body can't be pulled away from it without tearing a visible gap; an overlapping
  joint keeps the fuzzy stroke reading as continuous while the part moves.

## Adding a new variation

Add a folder under `variations/` with whichever state files that skin needs (see above —
not every skin needs all six). Nothing else needs to change until the wiring step. (`avocado`
is scaffolded here as a new companion — it isn't in the `CapySkin` union in `CapyMascot.tsx`
yet; that gets added when its frames are wired in.)
