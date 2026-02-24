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
import CoreMotion

public class LiveActivityModule: Module {
    // Pedometer instance (persists while tracking)
    private var pedometer: CMPedometer?
    private var pedometerActivityId: String?
    private var pedometerStartTime: Date?

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
        Function("endAllActivities") { [weak self] () -> Bool in
            guard #available(iOS 16.2, *) else { return false }

            // Stop pedometer hardware updates too
            self?.stopPedometerUpdates()
            self?.pedometerActivityId = nil
            self?.pedometerStartTime = nil

            Task {
                for activity in Activity<MobileCoreActivityAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .default)
                }
                for activity in Activity<FitnessActivityAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .default)
                }
                for activity in Activity<PedometerActivityAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .default)
                }
                for activity in Activity<CalorieBudgetActivityAttributes>.activities {
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
                    "type": "status",
                    "name": activity.attributes.name,
                    "title": activity.content.state.title,
                    "value": activity.content.state.value,
                    "activityState": Self.stateString(activity.activityState),
                ])
            }
            for activity in Activity<FitnessActivityAttributes>.activities {
                result.append([
                    "id": activity.id,
                    "type": "fitness",
                    "name": "FitnessActivity",
                    "title": "Fitness Tracker",
                    "value": "\(activity.content.state.steps) steps",
                    "activityState": Self.stateString(activity.activityState),
                ])
            }
            for activity in Activity<PedometerActivityAttributes>.activities {
                result.append([
                    "id": activity.id,
                    "type": "pedometer",
                    "name": "PedometerActivity",
                    "title": "Pedometer",
                    "value": "\(activity.content.state.steps) steps",
                    "activityState": Self.stateString(activity.activityState),
                ])
            }
            for activity in Activity<CalorieBudgetActivityAttributes>.activities {
                let budget = activity.attributes.baseGoal + activity.content.state.activityBonus
                result.append([
                    "id": activity.id,
                    "type": "calorieBudget",
                    "name": "CalorieBudgetActivity",
                    "title": "Calorie Budget",
                    "value": "\(activity.content.state.consumed)/\(budget) cal",
                    "activityState": Self.stateString(activity.activityState),
                ])
            }
            return result
        }

        // ── Get count of all active activities ──
        Function("getActiveCount") { () -> Int in
            guard #available(iOS 16.2, *) else { return 0 }
            return Activity<MobileCoreActivityAttributes>.activities.count
                 + Activity<FitnessActivityAttributes>.activities.count
                 + Activity<PedometerActivityAttributes>.activities.count
                 + Activity<CalorieBudgetActivityAttributes>.activities.count
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

        // ── End all Fitness Live Activities ──
        Function("endAllFitnessActivities") { () -> Bool in
            guard #available(iOS 16.2, *) else { return false }

            Task {
                for activity in Activity<FitnessActivityAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .default)
                }
            }

            return true
        }

        // ── List active Fitness Activities ──
        Function("getActiveFitnessActivities") { () -> [[String: Any]] in
            guard #available(iOS 16.2, *) else { return [] }

            var result: [[String: Any]] = []
            for activity in Activity<FitnessActivityAttributes>.activities {
                result.append([
                    "id": activity.id,
                    "calorieGoal": activity.attributes.calorieGoal,
                    "steps": activity.content.state.steps,
                    "caloriesUsed": activity.content.state.caloriesUsed,
                    "distance": activity.content.state.distance,
                    "activityState": Self.stateString(activity.activityState),
                ])
            }
            return result
        }

        // ════════════════════════════════════════════════
        // MARK: — Pedometer Activity (Real-time Step Tracking)
        // ════════════════════════════════════════════════

        // ── Check if pedometer is available ──
        Function("isPedometerAvailable") { () -> Bool in
            return CMPedometer.isStepCountingAvailable()
        }

        // ── Start a Pedometer Live Activity + begin CMPedometer updates ──
        Function("startPedometerActivity") { [weak self] (stepGoal: Int) -> String? in
            guard let self = self else { return nil }
            guard #available(iOS 16.2, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }
            guard CMPedometer.isStepCountingAvailable() else { return nil }

            // End any existing pedometer tracking first
            self.stopPedometerUpdates()

            let now = Date()
            let attributes = PedometerActivityAttributes(stepGoal: stepGoal, startTime: now)
            let state = PedometerActivityAttributes.ContentState(
                steps: 0,
                distance: 0,
                floorsAscended: 0,
                pace: 0
            )

            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil),
                    pushType: nil
                )

                self.pedometerActivityId = activity.id
                self.pedometerStartTime = now

                // Start real pedometer updates
                let pedometer = CMPedometer()
                self.pedometer = pedometer

                pedometer.startUpdates(from: now) { [weak self] data, error in
                    guard let self = self, let data = data, error == nil else { return }

                    let steps = data.numberOfSteps.intValue
                    let distance = data.distance?.doubleValue ?? 0
                    let floors = data.floorsAscended?.intValue ?? 0

                    // Calculate pace (steps per minute)
                    let elapsed = Date().timeIntervalSince(now)
                    let pace = elapsed > 10 ? Double(steps) / (elapsed / 60.0) : 0

                    let newState = PedometerActivityAttributes.ContentState(
                        steps: steps,
                        distance: distance,
                        floorsAscended: floors,
                        pace: round(pace)
                    )

                    Task {
                        for act in Activity<PedometerActivityAttributes>.activities {
                            if act.id == self.pedometerActivityId {
                                await act.update(
                                    ActivityContent(state: newState, staleDate: nil)
                                )
                                break
                            }
                        }
                    }
                }

                return activity.id
            } catch {
                print("[LiveActivityModule] startPedometerActivity failed: \(error.localizedDescription)")
                return nil
            }
        }

        // ── Get current pedometer data snapshot ──
        Function("getPedometerData") { [weak self] () -> [String: Any] in
            guard let self = self else { return [:] }
            guard let activityId = self.pedometerActivityId else { return [:] }
            guard #available(iOS 16.2, *) else { return [:] }

            for activity in Activity<PedometerActivityAttributes>.activities {
                if activity.id == activityId {
                    let state = activity.content.state
                    return [
                        "activityId": activityId,
                        "steps": state.steps,
                        "distance": state.distance,
                        "floorsAscended": state.floorsAscended,
                        "pace": state.pace,
                        "stepGoal": activity.attributes.stepGoal,
                        "elapsedSeconds": Int(Date().timeIntervalSince(activity.attributes.startTime)),
                    ]
                }
            }
            return [:]
        }

        // ── End pedometer tracking + Live Activity ──
        Function("endPedometerActivity") { [weak self] () -> Bool in
            guard let self = self else { return false }
            guard #available(iOS 16.2, *) else { return false }

            self.stopPedometerUpdates()

            guard let activityId = self.pedometerActivityId else { return false }

            Task {
                for activity in Activity<PedometerActivityAttributes>.activities {
                    if activity.id == activityId {
                        await activity.end(nil, dismissalPolicy: .default)
                        break
                    }
                }
            }

            self.pedometerActivityId = nil
            self.pedometerStartTime = nil
            return true
        }

        // ── End all Pedometer Live Activities ──
        Function("endAllPedometerActivities") { [weak self] () -> Bool in
            guard let self = self else { return false }
            guard #available(iOS 16.2, *) else { return false }

            self.stopPedometerUpdates()
            self.pedometerActivityId = nil
            self.pedometerStartTime = nil

            Task {
                for activity in Activity<PedometerActivityAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .default)
                }
            }

            return true
        }

        // ── List active Pedometer Activities ──
        Function("getActivePedometerActivities") { () -> [[String: Any]] in
            guard #available(iOS 16.2, *) else { return [] }

            var result: [[String: Any]] = []
            for activity in Activity<PedometerActivityAttributes>.activities {
                result.append([
                    "id": activity.id,
                    "stepGoal": activity.attributes.stepGoal,
                    "steps": activity.content.state.steps,
                    "distance": activity.content.state.distance,
                    "floorsAscended": activity.content.state.floorsAscended,
                    "pace": activity.content.state.pace,
                    "activityState": Self.stateString(activity.activityState),
                ])
            }
            return result
        }

        // ── Check if pedometer is currently tracking ──
        Function("isPedometerTracking") { [weak self] () -> Bool in
            return self?.pedometer != nil && self?.pedometerActivityId != nil
        }

        // ════════════════════════════════════════════════
        // MARK: — Calorie Budget Activity
        // ════════════════════════════════════════════════

        // ── Start a Calorie Budget Live Activity ──
        Function("startCalorieBudgetActivity") {
            (baseGoal: Int, consumed: Int, activityBonus: Int, mode: String) -> String? in

            guard #available(iOS 16.2, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

            let resolvedMode = (mode == "strict" || mode == "adaptive") ? mode : "adaptive"
            let attributes = CalorieBudgetActivityAttributes(baseGoal: baseGoal, mode: resolvedMode)
            let state = CalorieBudgetActivityAttributes.ContentState(
                consumed: consumed,
                activityBonus: activityBonus
            )

            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil),
                    pushType: nil
                )
                return activity.id
            } catch {
                print("[LiveActivityModule] startCalorieBudgetActivity failed: \(error.localizedDescription)")
                return nil
            }
        }

        // ── Update a Calorie Budget Live Activity ──
        Function("updateCalorieBudgetActivity") {
            (activityId: String, consumed: Int, activityBonus: Int) -> Bool in

            guard #available(iOS 16.2, *) else { return false }

            let state = CalorieBudgetActivityAttributes.ContentState(
                consumed: consumed,
                activityBonus: activityBonus
            )

            Task {
                for activity in Activity<CalorieBudgetActivityAttributes>.activities {
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

        // ── End a Calorie Budget Live Activity ──
        Function("endCalorieBudgetActivity") { (activityId: String) -> Bool in
            guard #available(iOS 16.2, *) else { return false }

            Task {
                for activity in Activity<CalorieBudgetActivityAttributes>.activities {
                    if activity.id == activityId {
                        await activity.end(nil, dismissalPolicy: .default)
                        return
                    }
                }
            }

            return true
        }

        // ── End all Calorie Budget Live Activities ──
        Function("endAllCalorieBudgetActivities") { () -> Bool in
            guard #available(iOS 16.2, *) else { return false }

            Task {
                for activity in Activity<CalorieBudgetActivityAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .default)
                }
            }

            return true
        }

        // ── List active Calorie Budget Activities ──
        Function("getActiveCalorieBudgetActivities") { () -> [[String: Any]] in
            guard #available(iOS 16.2, *) else { return [] }

            var result: [[String: Any]] = []
            for activity in Activity<CalorieBudgetActivityAttributes>.activities {
                result.append([
                    "id": activity.id,
                    "baseGoal": activity.attributes.baseGoal,
                    "mode": activity.attributes.mode,
                    "consumed": activity.content.state.consumed,
                    "activityBonus": activity.content.state.activityBonus,
                    "activityState": Self.stateString(activity.activityState),
                ])
            }
            return result
        }
    }

    // ── Helper: stop pedometer hardware updates ──
    private func stopPedometerUpdates() {
        pedometer?.stopUpdates()
        pedometer = nil
    }

    // ── Helper: Activity state to human-readable string ──
    @available(iOS 16.2, *)
    private static func stateString(_ state: ActivityState) -> String {
        switch state {
        case .active:     return "active"
        case .ended:      return "ended"
        case .dismissed:  return "dismissed"
        case .stale:      return "stale"
        default:          return "unknown"
        }
    }
}
