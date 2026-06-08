/**
 * Config plugin que agrega la WidgetExtension de Lunara al proyecto Xcode.
 * El widget iOS muestra fase del ciclo, día y próximo período en la pantalla de inicio.
 */
const { withXcodeProject, withDangerousMod, withInfoPlist } = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')

const WIDGET_SWIFT = `import WidgetKit
import SwiftUI

// ─── Data model ──────────────────────────────────────────────────────────────

struct LunaraWidgetEntry: TimelineEntry {
    let date: Date
    let phase: String
    let phaseEmoji: String
    let dayOfCycle: Int
    let daysUntilPeriod: Int
}

// ─── Data provider ───────────────────────────────────────────────────────────

struct LunaraWidgetProvider: TimelineProvider {

    func placeholder(in context: Context) -> LunaraWidgetEntry {
        LunaraWidgetEntry(date: Date(), phase: "Fase lútea", phaseEmoji: "🌙", dayOfCycle: 14, daysUntilPeriod: 14)
    }

    func getSnapshot(in context: Context, completion: @escaping (LunaraWidgetEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LunaraWidgetEntry>) -> Void) {
        let entry = readEntry()
        // Refresh every 2 hours
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 2, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func readEntry() -> LunaraWidgetEntry {
        let defaults = UserDefaults(suiteName: "group.com.shinracode.lunara")
        return LunaraWidgetEntry(
            date: Date(),
            phase: defaults?.string(forKey: "phase") ?? "Fase lútea",
            phaseEmoji: defaults?.string(forKey: "phaseEmoji") ?? "🌙",
            dayOfCycle: defaults?.integer(forKey: "dayOfCycle") ?? 1,
            daysUntilPeriod: defaults?.integer(forKey: "daysUntilPeriod") ?? -1
        )
    }
}

// ─── Views ────────────────────────────────────────────────────────────────────

struct LunaraWidgetEntryView: View {
    var entry: LunaraWidgetEntry
    @Environment(\\.widgetFamily) var family

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.05, green: 0.004, blue: 0.094),
                    Color(red: 0.176, green: 0.004, blue: 0.271)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 4) {
                // App label
                HStack {
                    Text("🌙 Lunara")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(Color(red: 0.769, green: 0.714, blue: 0.988))
                    Spacer()
                }

                Spacer()

                // Phase emoji
                Text(entry.phaseEmoji)
                    .font(.system(size: family == .systemSmall ? 28 : 36))

                // Phase name
                Text(entry.phase)
                    .font(.system(size: family == .systemSmall ? 11 : 14, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                // Day of cycle
                Text("Día \\(entry.dayOfCycle)")
                    .font(.system(size: 10))
                    .foregroundColor(Color(red: 0.659, green: 0.333, blue: 0.969))

                Spacer()

                // Next period
                Text(entry.daysUntilPeriod > 0
                     ? "Próximo período: \\(entry.daysUntilPeriod)d"
                     : "Período activo 🩸")
                    .font(.system(size: 9))
                    .foregroundColor(.gray)
            }
            .padding(10)
        }
        .widgetURL(URL(string: "lunara://home"))
    }
}

// ─── Widget declaration ───────────────────────────────────────────────────────

@main
struct LunaraWidget: Widget {
    let kind: String = "LunaraWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LunaraWidgetProvider()) { entry in
            LunaraWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Lunara")
        .description("Tu ciclo siempre a mano")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
`

const WIDGET_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>
`

module.exports = function withiOSWidget(config) {
  // 1. Add App Group entitlement (shared UserDefaults between app and widget)
  config = withInfoPlist(config, (cfg) => {
    if (!cfg.modResults['com.apple.security.application-groups']) {
      cfg.modResults['com.apple.security.application-groups'] = ['group.com.shinracode.lunara']
    }
    return cfg
  })

  // 2. Write Swift widget files
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosRoot = path.join(cfg.modRequest.projectRoot, 'ios')
      const widgetDir = path.join(iosRoot, 'LunaraWidget')

      fs.mkdirSync(widgetDir, { recursive: true })
      fs.writeFileSync(path.join(widgetDir, 'LunaraWidget.swift'), WIDGET_SWIFT)
      fs.writeFileSync(path.join(widgetDir, 'Info.plist'), WIDGET_INFO_PLIST)

      return cfg
    },
  ])

  // 3. Add widget extension target to Xcode project
  config = withXcodeProject(config, (cfg) => {
    const proj = cfg.modResults
    const extName = 'LunaraWidget'
    const bundleId = 'com.shinracode.lunara.widget'

    // Skip if already added
    if (proj.pbxGroupByName(extName)) return cfg

    const targetUuid = proj.generateUuid()
    const groupUuid = proj.generateUuid()
    const swiftFileUuid = proj.generateUuid()
    const plistFileUuid = proj.generateUuid()

    proj.addTarget(extName, 'app_extension', extName, bundleId)

    return cfg
  })

  return config
}
