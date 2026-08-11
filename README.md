# Capy Timer

A gamified Pomodoro timer built around a virtual capybara companion: focus/break
sessions earn coins, coins unlock companions, and a statistics dashboard tracks
history and streaks.

## Stack

- **Expo** (managed workflow) + **expo-router** (file-based routing)
- **Zustand** for live app state (timer run, plan, wallet, companions)
- **expo-sqlite** for session history — the statistics dashboard needs real
  aggregation queries, not a persisted JSON blob
- **expo-notifications** for a local "session complete" alert that fires even
  if the app is backgrounded or force-quit (see [Notifications](#notifications))
- **react-native-purchases** (RevenueCat) for the coin shop (see
  [In-app purchases](#in-app-purchases) — not usable yet, no store accounts exist)
- **react-native-reanimated** + **react-native-svg** for the hand-drawn design
  system, ported from [capy-ui](https://github.com/blu-octopus/capy-ui) (a web
  component library — the geometry and path data were ported, not imported;
  see `src/sketch/` and `components/capy/icons/`), and for the companions'
  mood-reactive animation (see [Companions](#companions))
- **Jest** + **@testing-library/react-native** for the test suite (component
  tests render through the real React reconciler, not a browser)

## Running the app

This project targets iOS and Android. **Use Expo Go for day-to-day
development** — it covers everything except real in-app purchases, which need
a native module Expo Go doesn't include (see below).

```bash
npm install
npx expo start
```

Scan the QR code with the Expo Go app on your phone (iOS: Camera app; Android:
Expo Go's own scanner). The web preview (`npx expo start --web`) exists only as
a quick internal layout check — this app is not shipped on web, and some
native-only behavior (SQLite, real device notifications, IAP) intentionally
doesn't run there.

One web-only caveat worth knowing before you trust the preview: `onLayout`
fires unreliably under react-native-web — it lands on the first load after a
cold start, then stops on later reloads. Anything that measures itself before
drawing is intermittently missing there, most visibly the hand-drawn wobble
outlines on buttons, speech bubbles, and modal frames, which come and go
between reloads. They render correctly on a device, so reload a couple of
times before concluding the browser is showing you a real bug.

### What works in Expo Go

- Timer engine, all four run states, session setup, companion unlocking
- SQLite-backed session history and the statistics dashboard
- Local notifications (scheduling, permission prompts, delivery)
- Haptics and sound effects — these are device-only, so the browser preview
  can't tell you anything about them

### What needs a custom dev build

`react-native-purchases` is a native module and is not included in Expo Go. In
Expo Go, the coin shop correctly detects this and shows "Purchases need the
full app, not this preview build" rather than crashing. To test real purchases
you need a **development build**, which EAS can produce without a local Xcode
or Android Studio install:

```bash
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

Install the resulting build on a device or simulator, then run
`npx expo start --dev-client` and connect to it instead of Expo Go.

## In-app purchases

Economy, shop vs prestige, Capy Club, and SKU ids: see
[docs/big-number-economy.md](docs/big-number-economy.md) (implementation plan).
The product ids below are the *current code* until that plan is executed.

No RevenueCat project and no App Store Connect / Google Play Console products
exist yet. Until they do, `ensurePurchasesConfigured()` in `src/purchases/`
correctly reports "not set up," and the coin shop shows that state rather than
a broken screen. To make it live:

1. Create the three coin-bundle products in **App Store Connect** and
   **Google Play Console**, matching the identifiers in
   `src/purchases/products.ts`:
   - `capycoins_1000` — 1,000 coins, $0.99
   - `capycoins_2000` — 2,000 coins, $1.99
   - `capycoins_10000` — 10,000 coins, $4.99 (shown as the featured tile)
2. Create a project in the [RevenueCat dashboard](https://app.revenuecat.com),
   attach both stores, and add all three products to a **"default" offering**.
3. Copy `.env.example` to `.env.local` and fill in the iOS and Android API
   keys RevenueCat gives you.
4. Rebuild with EAS (a plain Expo Go reload won't pick up a new native
   module's presence — you already have `react-native-purchases` installed,
   but the keys are read at runtime via env vars, so a dev-client rebuild
   picks them up without further code changes).

No code changes are needed beyond that — `getCoinOfferings()` matches the
catalogue against whatever the dashboard actually returns, so a product that
doesn't exist yet is silently omitted rather than shown as a broken tile.

The coin shop also has a **Restore Purchases** button, required by App Store
review even though these coin packs are consumables with no server-side
entitlement to restore — it's honest about that ("your balance is saved on
this device") rather than implying it'll recover a lost purchase.

## Notifications

The timer schedules a local notification for **every** upcoming phase
boundary in the run's schedule (focus → break, break → focus, and final
completion) the moment the run starts or resumes, not just one at the very
end. This works without any background task machinery: iOS and Android both
still deliver already-scheduled local notifications even if the app was
backgrounded or force-quit, because delivery is owned by the OS, not the app
process. Pausing cancels every pending notification; resuming or skipping
reschedules only the boundaries still ahead. See `src/notifications/` and
`hooks/useSessionNotifications.ts` for the full reasoning — including why
`expo-task-manager` was evaluated and deliberately not used (neither platform
lets third-party apps run JS in the background at meaningful precision, and
this design doesn't need that anyway).

## Companions

Coins unlock companion skins — `basic` (unlocked by default), `egg`,
`fighting`, and `toilet`. Swipe or use the arrows on the timer screen to
browse them; a locked buddy previews without being adopted, and its price
replaces the Session Details button until you buy it.

Every skin renders real hand-drawn art per mood — content while idle, cross
while paused, dancing when a session lands — as pairs of frames exported from
Figma and played as a two-frame flipbook (`components/capy/FrameLoop.tsx`)
that runs faster the more animated the mood. A fifth skin, `avocado`, has art
ready but isn't wired into the purchasable roster yet.

The raw per-mood `.svg` frames live in `components/capy/frames/` (see its
`README.md` for the paste-in convention if you're adding or updating art).
After changing anything there, regenerate the React Native components:

```bash
npm run frames
```

This converts every `.svg` under `components/capy/frames/` into a
`react-native-svg` TSX component under `components/capy/frames-generated/`
(regenerated wholesale — don't hand-edit files there).

The capybara also talks while the timer runs, and the line comes from where
the session actually is — how far through the phase, how many minutes are
left, which loop of how many — so the speech bubble keeps you oriented without
making you read the clock. The wording lives in `src/theme/messages.ts`.

## Setting up a session

Tap **Session Details** on the timer screen to raise a sheet with the focus
length, break length, and loop count as three wheels you flick through, all
visible at once. The timer stays on screen behind the sheet.

The wheel (`components/ui/OptionWheel.tsx`) is a hand-port of the React Bits
web component of the same name: the curve geometry is the original's, while
the parts that depended on the DOM are re-expressed with
`react-native-gesture-handler` and Reanimated. Its progressive blur is
deliberately left out — React Native has no per-view filter — and opacity plus
a slight scale taper stand in.

## Haptics and sound

Every interaction fires a haptic and a short sound together through
`src/feedback/`, including the ones you don't trigger yourself: crossing a
phase boundary and finishing a session.

The sounds are generated rather than sourced, so they're licence-free and
tweakable in code:

```bash
npm run sfx
```

`scripts/generate-sfx.mjs` writes 16-bit PCM WAVs into `assets/sfx/` — soft
sine blips with a fast attack and exponential decay, tuned to match the
hand-drawn look rather than sound like UI beeps. Feedback degrades silently:
haptics are skipped on web, and audio going missing never blocks a tap.

## Home screen widgets

Battery and clock/timer widgets, on both platforms. Neither's native module
exists in Expo Go, so **widgets can only be tested in a development build**,
same as in-app purchases:

```bash
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

### iOS

`targets/widget/CapyWidgets.swift` — a WidgetKit extension generated into the
Xcode project by `@bacons/apple-targets` on every `expo prebuild`. Before it
can build:

1. Set `ios.appleTeamId` in `app.json` (find it in Xcode under Signing &
   Capabilities, or in the Apple Developer portal once that account exists).
   Without it, `expo prebuild --platform ios` prints a warning and the
   generated project's signing will be incomplete.
2. Building locally needs full Xcode (not just the command line tools) and
   CocoaPods — this is why iOS widget work needs an EAS build here rather
   than a local one. **Running `expo prebuild --platform ios` on a machine
   without CocoaPods installed will have Expo's CLI attempt to install it
   (and its dependencies — Ruby, etc.) via Homebrew automatically.** Expect
   that, or install CocoaPods yourself first if you'd rather control it.

The battery widget reads `UIDevice.current.batteryLevel` directly — no app
bridge needed, since a WidgetKit extension is a separate process with no
access to the RN bridge. The clock widget reads a JSON snapshot from a shared
App Group (`group.com.bluoctopus.capytimer.widgets`, set in both
`app.json`'s `ios.entitlements` and `targets/widget/expo-target.config.js` —
they must match) that the app writes via `ExtensionStorage` whenever the
timer's status/phase/loop changes (`src/widgets/bridge.ts`), then drives a
live countdown with `Text(timerInterval:countsDown:)` — no polling on either
side.

**This Swift was written without Xcode available to compile-check it.**
Written carefully against WidgetKit's stable, documented APIs, but genuinely
unverified — confirm with a development build before relying on it.

### Android

`react-native-android-widget` generates the AppWidgetProvider manifest
entries, XML, and Java stubs on `expo prebuild` — verified directly: prebuild
was run and the generated `AndroidManifest.xml`, provider XML, and strings
were inspected and matched the config in `app.json` exactly. The
TypeScript/JSX side (`src/widgets/android/`) is fully type-checked and unit
tested, same confidence level as the rest of the app.

One real platform constraint, not a bug: Android widgets can't tick a live
countdown the way iOS's `Text(timerInterval:)` does — `updatePeriodMillis`
has a 30-minute OS-enforced floor. The clock widget shows a static snapshot
of remaining time, refreshed whenever the app pushes a new one (on every
real timer transition) or on that 30-minute floor — this matches how most
third-party Android widgets handle a countdown, since live per-second
ticking on a home screen widget isn't something the platform supports at all
(Android's own Clock app uses a foreground notification for that, not a
widget).

## Testing

```bash
npm test          # run once
npm run test:watch
npx tsc --noEmit   # type-check
```

The suite covers the timer engine's wall-clock math (including background
catch-up), the SQLite aggregation logic, the notification scheduling hook, and
the purchases service — including rendering the actual coin-shop screen
through `@testing-library/react-native` to verify its load → state → render
chain independent of any browser.

## Store submission checklist

- [ ] Apple Developer Program and Google Play Developer accounts
- [x] App icon, adaptive icon, splash image, and favicon in `assets/images/` —
      generated from the capybara art via `npm run icons`
      (`scripts/generate-icons.mjs`); re-run after any art tweaks
- [ ] Set up RevenueCat + store products (see [In-app purchases](#in-app-purchases))
- [ ] Set `ios.appleTeamId` in `app.json` and confirm the widget extension
      builds via an EAS development build (see [Home screen widgets](#home-screen-widgets))
- [ ] Host the privacy policy draft in [docs/privacy-policy.md](docs/privacy-policy.md)
      and paste the public URL into App Store Connect / Play Console (required
      by both stores; this app collects no personal data beyond what
      RevenueCat/the stores themselves require for purchase processing)
- [ ] `eas build --profile production` for both platforms
- [ ] `eas submit` once builds are ready, or upload manually via App Store
      Connect / Play Console
- [ ] Store listing: screenshots, description, category, age rating

## Project structure

```
app/                                expo-router screens (index = timer, session-setup, stats, iap)
components/capy/                    Ported capy-ui artwork (mascot, coin, icons) + companion mood animation
components/capy/frames/             Raw per-mood/per-frame companion SVGs, paste-in from Figma (see its README.md)
components/capy/frames-generated/   React Native components generated from frames/ via `npm run frames`
components/ui/                      Design system primitives (WobbleBorder, charts, Modal, ...)
assets/sfx/                         Generated sound effects (see `npm run sfx`)
src/store/                          Zustand store + the wall-clock timer engine
src/db/                             SQLite schema, repository, and dashboard aggregations
src/notifications/                  Per-phase-boundary local notifications
src/feedback/                       Haptics + sound effects, fired together per interaction
src/purchases/                      RevenueCat integration
src/widgets/                        Shared snapshot + native bridge for both platforms' widgets
src/sketch/                         Hand-drawn geometry engine, ported verbatim from capy-ui
src/theme/                          Design tokens, typography, chart tick math, capybara dialogue
targets/widget/                     iOS WidgetKit extension source (@bacons/apple-targets)
scripts/                            Codegen: app icons, companion frames, sound effects
```
