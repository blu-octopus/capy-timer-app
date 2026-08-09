# Capy Timer

A gamified Pomodoro timer built with Expo (SDK 54, React Native new architecture) around a
virtual capybara pet. Focus sessions earn coins; coins unlock companion skins.

## Commands

```bash
npm start              # expo start (dev client / Expo Go)
npm run ios            # expo start --ios
npm run android        # expo start --android
npm test               # jest
npx tsc --noEmit        # typecheck (strict mode, no dedicated script)
npx expo-doctor         # advisory config/dependency health check
npm run icons           # regenerate app icon/splash/favicon from capy-face.ts
```

Every change in this repo is gated on `npx tsc --noEmit && npx jest` passing before commit.

## Architecture

**State** — `src/store/index.ts` is a single Zustand store (`useAppStore`) persisted to
AsyncStorage. It holds the run state, the session plan, the coin wallet, unlocked companions,
and a SQLite-backed cache of categories. The persisted `partialize` includes the *entire* run
slice — every run field is an absolute timestamp or duration, so rehydrating it after a cold
start is safe by construction (see "Timer engine" below).

**Timer engine** — `src/store/types.ts` builds a `PhaseSegment[]` schedule up front
(`buildSchedule`) and resolves "where should we be right now" as a pure function of elapsed
wall-clock time (`resolvePosition`), anchored to `anchorTs` (run start, shifted forward by
total paused time). `hooks/useRunTicker.ts` polls at 250ms only to *sample* the clock — it
never accumulates ticks — so backgrounding, throttling, or the JS thread dying and waking up
later can't drift the countdown; one tick after resume lands in the exact right phase.

Crash/kill recovery: `reconcileAfterRestart` runs once after the persisted store rehydrates
(`onRehydrateStorage`). A run that finished while the app was dead gets settled (coins
awarded, history row written); a still-live or paused run resumes untouched. Each run carries
a `runId` minted at `startRun`, and `insertSession` is `INSERT OR IGNORE`, so replaying the
history write after a rehydrate is a no-op — coins can never double-pay.

**Local database** — `src/db/`: `client.ts` opens the expo-sqlite handle and applies
`schema.ts`'s `CREATE_TABLES` DDL (idempotent, no migration runner needed). `repository.ts` is
hand-written SQL — see "PRD deviations" for why there's no query builder. `stats.ts` has the
pure aggregation functions (`summarize`, `hourBuckets`, `focusByCategory`, `streakMatrix`,
`timeframeRange`) that the dashboard renders from.

**Notifications** — `src/notifications/index.ts` schedules one local notification per future
phase boundary in the run's schedule (focus→break, break→prep→focus, final completion), timed
from the anchor so triggers are exact. `hooks/useSessionNotifications.ts` re-syncs on
`[status, phase, loopIndex]`: pause cancels everything pending, resume/skip reschedules only
the boundaries still ahead.

**Purchases** — `src/purchases/` wraps `react-native-purchases` (RevenueCat) behind
`ensurePurchasesConfigured()`, which detects "not available" by catching the synchronous throw
`Purchases.configure()` produces when the native module isn't linked (Expo Go, web, or no API
key set) — there's no separate capability check. The shop, and its Restore Purchases button,
render a graceful unavailable state until real RevenueCat keys are configured (see "Manual
follow-ups").

**Widgets** — `src/widgets/bridge.ts` + `snapshot.ts` push an absolute `phaseEndAt` timestamp
into shared storage (iOS App Group via `@bacons/apple-targets`'s `ExtensionStorage`; Android
AsyncStorage) whenever the run state changes (`hooks/useWidgetSync.ts`, mounted at the root
layout). `targets/widget/CapyWidgets.swift` is the iOS WidgetKit extension; `src/widgets/android/`
is the JS-rendered Android AppWidget via `react-native-android-widget`. The iOS Swift has never
been compiled (no Xcode in this environment) — verify it with an EAS dev build before shipping.

**Screens** (`app/`, expo-router) — `index.tsx` is one screen with idle/running/paused/ended
states rather than four separate routes; `session-setup.tsx` holds the avatar carousel,
category picker, and duration pickers as one modal; `stats.tsx` is the dashboard; `iap.tsx` is
the coin shop modal.

**Capy art** — companion skins (`components/capy/`) are inline `react-native-svg`, not image
files. `basic` is still the single pre-baked `CapyMascotIcon`, ported from a Figma export, with
mood expressed purely as motion (see below). `egg`, `fighting`, `toilet` and `avocado` (not yet
a purchasable companion — see "Manual follow-ups") instead render real per-mood art: each is a
set of hand-drawn frames exported from Figma (`components/capy/frames/`, raw `.svg`, one file
per skin/state/frame — see its `README.md` for the paste-in convention), converted to
`react-native-svg` TSX via `@svgr/cli` into `components/capy/frames-generated/` (generated, not
hand-edited — rerun the conversion instead of touching these files directly), and looped
through a 2-frame opacity crossfade
(`components/capy/CrossfadeFrames.tsx`) driven by mood. Not every skin has art for every state
(`toilet` is idle-only); `CapyMascot.tsx`'s `pickFrames` falls back to idle when a mood's frames
don't exist for that skin.

## Testing strategy

`jest.setup.js` mocks `expo-sqlite`'s `openDatabaseAsync` to always reject — that's the
"database unavailable, fall back to in-memory" path every other test implicitly exercises.
`__tests__/db.repository.test.ts` overrides that mock file-locally (Jest scopes mocks per
file) with a `better-sqlite3`-backed adapter, so the DDL and the actual SQL in `repository.ts`
get real coverage without touching the reject-mock everywhere else.

The timer engine tests (`__tests__/timer.test.ts`) drive the store with explicit `now`
timestamps rather than real timers or `jest.advanceTimersByTime` — the whole point of the
anchor/schedule design is that "what happened while backgrounded" is a pure function of
elapsed time, so tests assert that directly.

## PRD deviations (and why)

The original PRD named specific libraries for a few concerns; this app uses lighter
equivalents that were judged more compatible with Expo SDK 54 / new architecture, smaller, and
already covered by tests:

- **Animations**: Reanimated + hand-drawn SVG state changes, not Lottie. There are no Lottie
  asset files; capy mood is expressed as motion on a single drawing for the `basic` skin, and
  as a Reanimated-driven crossfade between hand-drawn frame pairs for the others
  (`components/capy/CapyMascot.tsx`, `CrossfadeFrames.tsx`).
- **Charts**: hand-rolled `react-native-svg` (`components/ui/BarChart.tsx`, `PieChart.tsx`,
  etc.), ported from the `/capy-ui` design system's web components, not `victory-native` or
  `react-native-chart-kit`.
- **Local database**: raw SQL over `expo-sqlite`, not Drizzle or WatermelonDB. `drizzle-orm`
  was tried initially for its inferred row types only (no queries ever ran through it) and was
  removed — `src/db/schema.ts` is now plain TypeScript interfaces matching the same shapes,
  with no runtime cost.
- **Background tasks**: no `expo-task-manager`. The timestamp-anchored timer design means
  there's nothing that needs to run *while backgrounded* — catching up happens on the next
  tick after resume — so the extra native module and its complexity were skipped. Local
  notifications (`expo-notifications`) still fire on schedule via OS-level triggers.
- **Custom date range** (stats "Custom" tab): a ~150-line hand-rolled month-calendar modal
  (`components/ui/DateRangePicker.tsx`, `src/utils/calendar.ts`), not a new date-picker
  dependency.

## Manual follow-ups (need your accounts, not automatable)

- **EAS build**: `app.json` has no `ios.appleTeamId` and no `extra.eas.projectId` — run
  `eas init` and add your Apple Team ID before `eas build`.
- **RevenueCat**: `.env.example` documents `EXPO_PUBLIC_REVENUECAT_IOS_KEY` /
  `_ANDROID_KEY`. Until a real project and store products (`capycoins_1000/2000/10000`, see
  `src/purchases/products.ts`) exist, the shop renders its "not set up yet" state — this is
  the correct behavior today, not a bug.
- **Basic skin still motion-only**: `egg`/`fighting`/`toilet`/`avocado` render real per-mood
  Figma frames (see "Capy art" above); `basic` doesn't yet, because wiring its headless `body`
  frames to the separate `head` frames needs a precise relative offset that doesn't exist in
  Figma today (the other skins' frames are exported as one already-composed image; `body` was
  exported standalone). Needs either a combined body+head export or explicit offset numbers
  before it can be wired the same way.
- **Avocado isn't purchasable yet**: `CapyMascot` can render the `avocado` skin, but it isn't in
  `DEFAULT_COMPANIONS` (`src/store/index.ts`) — that needs a name/price decision.
- **Frame shadows lost their blur**: the SVG→TSX conversion (`@svgr/cli`) drops `<filter>`
  elements, so shadow/highlight blur on the new frame art was stripped rather than shipped
  broken (dangling filter references were removed). Shadows render as solid, hard-edged shapes
  instead of soft ones. `react-native-svg` does support `Filter`/`FeGaussianBlur` natively if
  this is worth re-adding by hand later.
- **Widget verification**: the iOS WidgetKit Swift (`targets/widget/CapyWidgets.swift`) has
  never been compiled in this environment. Verify both widgets with an EAS dev build on a real
  device before shipping.
- **App icon aesthetics**: `npm run icons` generated `assets/images/{icon,adaptive-icon,
  splash-icon,favicon}.png` from the existing capy-face art. Take a look and re-run the script
  after any art tweaks — it's fully regenerable, not a one-off manual export.
