/**
 * @bacons/apple-targets config for the WidgetKit extension. Everything in
 * this directory is linked into a real Xcode target by `expo prebuild`; the
 * generated `ios/` project is never hand-edited or committed (see
 * .gitignore) — it's Continuous Native Generation, regenerated fresh from
 * this file plus app.json every time.
 *
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'widget',
  name: 'CapyWidgets',
  displayName: 'Capy Timer',
  icon: '../../assets/images/icon.png',
  frameworks: ['SwiftUI', 'WidgetKit'],
  images: {
    capyFace: './assets/capy-face.png',
  },
  entitlements: {
    // Mirrors the main app's App Group (app.json ios.entitlements) so both
    // sides read/write the same UserDefaults suite — see src/widgets/config.ts.
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
  deploymentTarget: '17.0',
});
