// CapyWidgets — iOS WidgetKit extension: battery + focus-timer widgets.
//
// UNVERIFIED: written without Xcode available to compile-check it. Written
// carefully against WidgetKit's documented, stable APIs (TimelineProvider,
// StaticConfiguration, Text(timerInterval:)), following the patterns
// @bacons/apple-targets' own README documents for App Group data sharing.
// Confirm with an EAS development build before shipping.
//
// The battery widget needs no bridge to the app at all — UIDevice's battery
// API is native and available directly inside the extension. The clock
// widget reads a JSON snapshot the app writes into the shared App Group via
// ExtensionStorage (see src/widgets/bridge.ts) whenever the run's status,
// phase, or loop changes; Text(timerInterval:) then ticks the countdown
// live, driven by the OS, with no polling on either side.

import SwiftUI
import WidgetKit

private let appGroup = "group.com.bluoctopus.capytimer.widgets"
private let brown = Color(red: 0.510, green: 0.239, blue: 0.0) // #823D00
private let cream = Color(red: 1.0, green: 0.973, blue: 0.937) // #FFF8EF
private let grey = Color(red: 0.420, green: 0.420, blue: 0.420) // #6B6B6B

// MARK: - Battery widget

struct BatteryEntry: TimelineEntry {
  let date: Date
  let percent: Int?
}

struct BatteryProvider: TimelineProvider {
  func placeholder(in context: Context) -> BatteryEntry {
    BatteryEntry(date: Date(), percent: 76)
  }

  func getSnapshot(in context: Context, completion: @escaping (BatteryEntry) -> Void) {
    completion(currentEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<BatteryEntry>) -> Void) {
    let entry = currentEntry()
    let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
    completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
  }

  private func currentEntry() -> BatteryEntry {
    UIDevice.current.isBatteryMonitoringEnabled = true
    let level = UIDevice.current.batteryLevel
    // -1 means the device doesn't report a level (simulators, mainly).
    return BatteryEntry(date: Date(), percent: level >= 0 ? Int((level * 100).rounded()) : nil)
  }
}

struct BatteryWidgetView: View {
  var entry: BatteryEntry

  var body: some View {
    VStack(spacing: 4) {
      Image("capyFace")
        .resizable()
        .scaledToFit()
        .frame(width: 56, height: 58)
      Text(entry.percent != nil ? "\(entry.percent!)%" : "—")
        .font(.system(size: 18, weight: .bold))
        .foregroundColor(brown)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(cream)
  }
}

struct BatteryWidget: Widget {
  let kind = "BatteryWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: BatteryProvider()) { entry in
      BatteryWidgetView(entry: entry)
        .widgetURL(URL(string: "capytimer://"))
    }
    .configurationDisplayName("Capy Battery")
    .description("Capybara face and battery level.")
    .supportedFamilies([.systemSmall])
  }
}

// MARK: - Clock / timer widget

/// Mirrors WidgetSnapshot in src/widgets/snapshot.ts — field names and
/// shape must match exactly, since this decodes the JSON the app writes.
private struct WidgetSnapshot: Decodable {
  let status: String
  let phase: String?
  let phaseLabel: String
  let phaseEndAt: Double? // epoch ms
}

struct ClockEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
}

struct ClockProvider: TimelineProvider {
  func placeholder(in context: Context) -> ClockEntry {
    ClockEntry(date: Date(), snapshot: WidgetSnapshot(status: "idle", phase: nil, phaseLabel: "Ready to focus", phaseEndAt: nil))
  }

  func getSnapshot(in context: Context, completion: @escaping (ClockEntry) -> Void) {
    completion(currentEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ClockEntry>) -> Void) {
    // The app calls ExtensionStorage.reloadWidget() on every real state
    // change, which is what actually drives updates; .atEnd plus that
    // explicit reload keeps this from ever needing to poll.
    completion(Timeline(entries: [currentEntry()], policy: .atEnd))
  }

  private func currentEntry() -> ClockEntry {
    guard
      let defaults = UserDefaults(suiteName: appGroup),
      let json = defaults.string(forKey: "snapshot"),
      let data = json.data(using: .utf8),
      let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    else {
      return ClockEntry(date: Date(), snapshot: nil)
    }
    return ClockEntry(date: Date(), snapshot: snapshot)
  }
}

struct ClockWidgetView: View {
  var entry: ClockEntry

  private var countdownRange: ClosedRange<Date>? {
    guard
      entry.snapshot?.status == "running",
      let endMs = entry.snapshot?.phaseEndAt
    else { return nil }

    let end = Date(timeIntervalSince1970: endMs / 1000)
    let now = Date()
    // A stale snapshot (app ended the phase but hasn't pushed the next one
    // yet) could put `end` in the past — Text(timerInterval:) requires
    // start <= end, so fall back to the label-only view rather than risk it.
    guard end > now else { return nil }
    return now...end
  }

  var body: some View {
    VStack(spacing: 4) {
      Image("capyFace")
        .resizable()
        .scaledToFit()
        .frame(width: 44, height: 46)
      Text(entry.snapshot?.phaseLabel ?? "Ready to focus")
        .font(.system(size: 11))
        .foregroundColor(grey)
      if let range = countdownRange {
        Text(timerInterval: range, countsDown: true)
          .font(.system(size: 20, weight: .bold))
          .foregroundColor(brown)
          .monospacedDigit()
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(cream)
  }
}

struct ClockWidget: Widget {
  let kind = "ClockWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: ClockProvider()) { entry in
      ClockWidgetView(entry: entry)
        .widgetURL(URL(string: "capytimer://"))
    }
    .configurationDisplayName("Capy Timer")
    .description("Current focus/break phase and time remaining.")
    .supportedFamilies([.systemSmall])
  }
}

// MARK: - Bundle

@main
struct CapyWidgetsBundle: WidgetBundle {
  var body: some Widget {
    BatteryWidget()
    ClockWidget()
  }
}
