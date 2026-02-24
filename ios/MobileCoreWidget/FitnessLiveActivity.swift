/**
 * FitnessLiveActivity
 *
 * Dynamic Island + Lock Screen widget for fitness tracking.
 *
 * Layout:
 *   Compact pill:  [steps icon + count]  ●  [calorie ring depleting]
 *   Expanded:      Steps / Distance on left, Calorie ring on right
 *   Lock Screen:   Full row — steps, distance, calorie ring + numbers
 *   Minimal:       Calorie ring only
 *
 * The ring represents REMAINING calories (goal − used).
 * It depletes clockwise as calories are burned.
 */

import ActivityKit
import SwiftUI
import WidgetKit

struct FitnessLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FitnessActivityAttributes.self) { context in
            // ── Lock Screen / notification banner ──
            lockScreenView(context: context)
        } dynamicIsland: { context in
            let remaining = max(0, context.attributes.calorieGoal - context.state.caloriesUsed)

            return DynamicIsland {
                // ── Expanded ──
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Label {
                            Text("\(context.state.steps)")
                                .font(.title3.bold())
                                .monospacedDigit()
                        } icon: {
                            Image(systemName: "figure.walk")
                                .foregroundColor(.green)
                        }

                        Text(String(format: "%.1f km", context.state.distance))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    CalorieRing(
                        used: context.state.caloriesUsed,
                        goal: context.attributes.calorieGoal,
                        size: 44
                    )
                }

                DynamicIslandExpandedRegion(.center) {
                    Text("Fitness Tracker")
                        .font(.headline)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        HStack(spacing: 4) {
                            Image(systemName: "flame.fill")
                                .foregroundColor(.orange)
                                .font(.caption)
                            Text("\(context.state.caloriesUsed) kcal burned")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        Text("\(remaining) remaining")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            } compactLeading: {
                // ── Compact pill — left: step count ──
                HStack(spacing: 3) {
                    Image(systemName: "figure.walk")
                        .foregroundColor(.green)
                        .font(.caption2)
                    Text(Self.compactNumber(context.state.steps))
                        .font(.caption2.bold())
                        .monospacedDigit()
                }
            } compactTrailing: {
                // ── Compact pill — right: calorie ring ──
                CalorieRingCompact(
                    used: context.state.caloriesUsed,
                    goal: context.attributes.calorieGoal
                )
            } minimal: {
                // ── Minimal: calorie ring only ──
                CalorieRingCompact(
                    used: context.state.caloriesUsed,
                    goal: context.attributes.calorieGoal
                )
            }
        }
    }

    // ── Lock Screen view ──
    @ViewBuilder
    private func lockScreenView(
        context: ActivityViewContext<FitnessActivityAttributes>
    ) -> some View {
        let remaining = max(0, context.attributes.calorieGoal - context.state.caloriesUsed)

        HStack(spacing: 12) {
            // Steps + Distance
            VStack(alignment: .leading, spacing: 4) {
                Label {
                    Text("\(context.state.steps)")
                        .font(.title3.bold())
                        .monospacedDigit()
                } icon: {
                    Image(systemName: "figure.walk")
                        .foregroundColor(.green)
                }

                Text(String(format: "%.1f km", context.state.distance))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Calorie info
            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text("\(context.state.caloriesUsed) burned")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Text("\(remaining) kcal left")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            // Ring
            CalorieRing(
                used: context.state.caloriesUsed,
                goal: context.attributes.calorieGoal,
                size: 40
            )
        }
        .padding()
        .activityBackgroundTint(Color(.systemBackground).opacity(0.8))
    }

    /// Format large numbers: 12345 → "12.3k"
    static func compactNumber(_ n: Int) -> String {
        if n >= 10_000 {
            return String(format: "%.1fk", Double(n) / 1000.0)
        }
        return "\(n)"
    }
}

// MARK: - Calorie Ring (expanded / lock screen)

/// Circular ring that depletes as calories are burned.
/// Full ring = 0 burned. Empty ring = goal reached.
struct CalorieRing: View {
    let used: Int
    let goal: Int
    let size: CGFloat

    private var fraction: Double {
        guard goal > 0 else { return 0 }
        return min(Double(used) / Double(goal), 1.0)
    }

    private var remaining: Int {
        max(0, goal - used)
    }

    var body: some View {
        ZStack {
            // Background track
            Circle()
                .stroke(Color.orange.opacity(0.2), lineWidth: 4)

            // Remaining arc (depletes clockwise)
            Circle()
                .trim(from: 0, to: 1.0 - fraction)
                .stroke(
                    Color.orange,
                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            // Center label
            Text("\(remaining)")
                .font(.system(size: size * 0.26, weight: .bold))
                .monospacedDigit()
                .foregroundColor(.orange)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Calorie Ring Compact (compact pill / minimal)

/// Tiny calorie ring for the compact pill trailing slot.
struct CalorieRingCompact: View {
    let used: Int
    let goal: Int

    private var fraction: Double {
        guard goal > 0 else { return 0 }
        return min(Double(used) / Double(goal), 1.0)
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.orange.opacity(0.25), lineWidth: 2.5)

            Circle()
                .trim(from: 0, to: 1.0 - fraction)
                .stroke(
                    Color.orange,
                    style: StrokeStyle(lineWidth: 2.5, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            Image(systemName: "flame.fill")
                .font(.system(size: 8))
                .foregroundColor(.orange)
        }
        .frame(width: 18, height: 18)
    }
}
