/**
 * MobileCoreActivityAttributes
 *
 * Shared data model for Live Activities.
 * This SAME struct must exist in BOTH:
 *   1. The main app target (modules/live-activity/ios/)
 *   2. The widget extension target (this file, copied by config plugin)
 *
 * Keep them identical — mismatched types will crash ActivityKit.
 */

import ActivityKit
import Foundation

struct MobileCoreActivityAttributes: ActivityAttributes {
    /// Static data set when the activity starts (immutable for the lifetime)
    var name: String
    var icon: String?

    /// Dynamic state that can be updated while the activity is running
    struct ContentState: Codable, Hashable {
        var title: String
        var value: String
        var progress: Double?
        var subtitle: String?
        var endTime: Date?
    }
}

// MARK: - Fitness Activity (Steps + Calories Ring)

struct FitnessActivityAttributes: ActivityAttributes {
    /// Static: set once when the activity starts
    var calorieGoal: Int

    /// Dynamic: updated as the user moves
    struct ContentState: Codable, Hashable {
        var steps: Int
        var caloriesUsed: Int
        var distance: Double   // km or miles — display-only
    }
}
