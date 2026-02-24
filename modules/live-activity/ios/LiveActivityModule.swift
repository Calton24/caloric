/**
 * LiveActivityModule — Native Swift Module
 *
 * Bridges iOS ActivityKit to JavaScript via Expo Modules.
 * Provides start, update, end, and query functions for Live Activities.
 *
 * The MobileCoreActivityAttributes struct is shared with the widget extension
 * (copied there by the config plugin during prebuild).
 *
 * Requires iOS 16.2+ and a device that supports Live Activities.
 */

import ExpoModulesCore
import ActivityKit

public class LiveActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("LiveActivityModule")

        // ── Query: are Live Activities supported on this device? ──
        Function("isSupported") { () -> Bool in
            if #available(iOS 16.2, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            }
            return false
        }

        // ── Start a new Live Activity ──
        // Returns the activity ID string, or nil on failure
        Function("startActivity") {
            (name: String, title: String, value: String, icon: String?, subtitle: String?, progress: Double?) -> String? in

            guard #available(iOS 16.2, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

            let attributes = MobileCoreActivityAttributes(name: name, icon: icon)
            let state = MobileCoreActivityAttributes.ContentState(
                title: title,
                value: value,
                progress: progress,
                subtitle: subtitle,
                endTime: nil
            )

            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil),
                    pushType: nil
                )
                return activity.id
            } catch {
                print("[LiveActivityModule] startActivity failed: \(error.localizedDescription)")
                return nil
            }
        }

        // ── Start with ETA (endTime) ──
        Function("startActivityWithETA") {
            (name: String, title: String, value: String, icon: String?, subtitle: String?, endTimeInterval: Double) -> String? in

            guard #available(iOS 16.2, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

            let attributes = MobileCoreActivityAttributes(name: name, icon: icon)
            let endTime = Date(timeIntervalSince1970: endTimeInterval)
            let state = MobileCoreActivityAttributes.ContentState(
                title: title,
                value: value,
                progress: nil,
                subtitle: subtitle,
                endTime: endTime
            )

            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil),
                    pushType: nil
                )
                return activity.id
            } catch {
                print("[LiveActivityModule] startActivityWithETA failed: \(error.localizedDescription)")
                return nil
            }
        }

        // ── Update an existing Live Activity ──
        Function("updateActivity") {
            (activityId: String, title: String, value: String, subtitle: String?, progress: Double?) -> Bool in

            guard #available(iOS 16.2, *) else { return false }

            let state = MobileCoreActivityAttributes.ContentState(
                title: title,
                value: value,
                progress: progress,
                subtitle: subtitle,
                endTime: nil
            )

            Task {
                for activity in Activity<MobileCoreActivityAttributes>.activities {
                    if activity.id == activityId {
                        await activity.update(
                            ActivityContent(state: state, staleDate: nil)
                        )
                        return
                    }
                }
            }

            return true
        }

        // ── Update with ETA ──
        Function("updateActivityWithETA") {
            (activityId: String, title: String, value: String, subtitle: String?, endTimeInterval: Double) -> Bool in

            guard #available(iOS 16.2, *) else { return false }

            let endTime = Date(timeIntervalSince1970: endTimeInterval)
            let state = MobileCoreActivityAttributes.ContentState(
                title: title,
                value: value,
                progress: nil,
                subtitle: subtitle,
                endTime: endTime
            )

            Task {
                for activity in Activity<MobileCoreActivityAttributes>.activities {
                    if activity.id == activityId {
                        await activity.update(
                            ActivityContent(state: state, staleDate: nil)
                        )
                        return
                    }
                }
            }

            return true
        }

        // ── End a Live Activity ──
        Function("endActivity") { (activityId: String) -> Bool in
            guard #available(iOS 16.2, *) else { return false }

            Task {
                for activity in Activity<MobileCoreActivityAttributes>.activities {
                    if activity.id == activityId {
                        await activity.end(nil, dismissalPolicy: .default)
                        return
                    }
                }
            }

            return true
        }

        // ── End all Live Activities ──
        Function("endAllActivities") { () -> Bool in
            guard #available(iOS 16.2, *) else { return false }

            Task {
                for activity in Activity<MobileCoreActivityAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .default)
                }
            }

            return true
        }

        // ── List active Live Activities ──
        Function("getActiveActivities") { () -> [[String: String]] in
            guard #available(iOS 16.2, *) else { return [] }

            var result: [[String: String]] = []
            for activity in Activity<MobileCoreActivityAttributes>.activities {
                result.append([
                    "id": activity.id,
                    "name": activity.attributes.name,
                    "title": activity.content.state.title,
                    "value": activity.content.state.value,
                ])
            }
            return result
        }

        // ════════════════════════════════════════════════
        // MARK: — Fitness Activity (Steps + Calorie Ring)
        // ════════════════════════════════════════════════

        // ── Start a Fitness Live Activity ──
        Function("startFitnessActivity") {
            (calorieGoal: Int, steps: Int, caloriesUsed: Int, distance: Double) -> String? in

            guard #available(iOS 16.2, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

            let attributes = FitnessActivityAttributes(calorieGoal: calorieGoal)
            let state = FitnessActivityAttributes.ContentState(
                steps: steps,
                caloriesUsed: caloriesUsed,
                distance: distance
            )

            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil),
                    pushType: nil
                )
                return activity.id
            } catch {
                print("[LiveActivityModule] startFitnessActivity failed: \(error.localizedDescription)")
                return nil
            }
        }

        // ── Update a Fitness Live Activity ──
        Function("updateFitnessActivity") {
            (activityId: String, steps: Int, caloriesUsed: Int, distance: Double) -> Bool in

            guard #available(iOS 16.2, *) else { return false }

            let state = FitnessActivityAttributes.ContentState(
                steps: steps,
                caloriesUsed: caloriesUsed,
                distance: distance
            )

            Task {
                for activity in Activity<FitnessActivityAttributes>.activities {
                    if activity.id == activityId {
                        await activity.update(
                            ActivityContent(state: state, staleDate: nil)
                        )
                        return
                    }
                }
            }

            return true
        }

        // ── End a Fitness Live Activity ──
        Function("endFitnessActivity") { (activityId: String) -> Bool in
            guard #available(iOS 16.2, *) else { return false }

            Task {
                for activity in Activity<FitnessActivityAttributes>.activities {
                    if activity.id == activityId {
                        await activity.end(nil, dismissalPolicy: .default)
                        return
                    }
                }
            }

            return true
        }
    }
}
