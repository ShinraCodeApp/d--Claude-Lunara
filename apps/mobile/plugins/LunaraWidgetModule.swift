import Foundation
import WidgetKit

@objc(LunaraWidgetModule)
class LunaraWidgetModule: NSObject {

  @objc func updateWidget(_ data: NSDictionary) {
    let defaults = UserDefaults(suiteName: "group.com.shinracode.lunara")
    defaults?.set(data["phase"] as? String ?? "Fase lútea", forKey: "phase")
    defaults?.set(data["phaseEmoji"] as? String ?? "🌙",    forKey: "phaseEmoji")
    defaults?.set(data["dayOfCycle"] as? Int ?? 1,          forKey: "dayOfCycle")
    defaults?.set(data["daysUntilPeriod"] as? Int ?? -1,    forKey: "daysUntilPeriod")
    defaults?.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
