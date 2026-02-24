/**
 * PedometerLiveActivity
 *
 * Dynamic Island + Lock Screen widget for real-time pedometer tracking.
 *
 * Layout:
 *   Compact pill:  [shoe icon + steps]  ●  [progress ring]
 *   Expanded:      Steps/Distance on left, Progress ring on right,
 *                  Floors + Pace in bottom row
 *   Lock Screen:   Full row — steps, distance, floors, pace, ring
 *   Minimal:       Shoe icon or step progress ring
 *
 * The ring represents steps taken vs the daily step goal.
 * It fills clockwise as steps accumulate.
 */

import ActivityKit
import SwiftUI
import WidgetKit

struct PedometerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PedometerActivityAttributes.self) { context in
            // ── Lock Screen / notification banner ──
            pedometerLockScreenView(context: context)
        } dynamicIsland: { context in
            return DynamicIsland {
                // ── Expanded ──
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Label {
                            Text("\(context.state.steps)")
                                .font(.title3.bold())
                                .monospacedDigit()
                        } icon: {
                            Image(systemName: "shoe.2.fill")
                                .foregroundColor(.blue)
                        }

                        Text(Self.formatDistance(context.state.distance))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.leading, 4)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    StepProgressRing(
                        steps: context.state.steps,
                        goal: context.attributes.stepGoal,
                        size: 44
                    )
                    .padding(.trailing, 8)
                }

                DynamicIslandExpandedRegion(.center) {
                    Text("Pedometer")
                        .font(.headline)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.up.right")
                                .foregroundColor(.cyan)
                                .font(.caption)
                            Text("\(context.state.floorsAscended) floors")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        if context.state.pace > 0 {
                            HStack(spacing: 4) {
                                Image(systemName: "speedometer")
                                    .foregroundColor(.green)
                                    .font(.caption)
                                Text("\(Int(context.state.pace)) spm")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()

                        Text(Self.elapsedString(from: context.attributes.startTime))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                // ── Compact pill — left: step count ──
                HStack(spacing: 3) {
                    Image(systemName: "shoe.2.fill")
                        .foregroundColor(.blue)
                        .font(.caption2)
                    Text(Self.compactNumber(context.state.steps))
                        .font(.caption2.bold())
                        .monospacedDigit()
                }
            } compactTrailing: {
                // ── Compact pill — right: step progress ring ──
                StepProgressRingCompact(
                    steps: context.state.steps,
                    goal: context.attributes.stepGoal
                )
            } minimal: {
                // ── Minimal: step ring only ──
                StepProgressRingCompact(
                    steps: context.state.steps,
                    goal: context.attributes.stepGoal
                )
            }
        }
    }

    // ── Lock Screen view ──
    @ViewBuilder
    private func pedometerLockScreenView(
        context: ActivityViewContext<PedometerActivityAttributes>
    ) -> some View {
        let remaining = max(0, context.attributes.stepGoal - context.state.steps)

        HStack(spacing: 12) {
            // Steps + Distance
            VStack(alignment: .leading, spacing: 4) {
                Label {
                    Text("\(context.state.steps)")
                        .font(.title3.bold())
                        .monospacedDigit()
                } icon: {
                    Image(systemName: "shoe.2.fill")
                        .foregroundColor(.blue)
                }

                Text(Self.formatDistance(context.state.distance))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Stats column
            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.up.right")
                        .foregroundColor(.cyan)
                        .font(.caption)
                    Text("\(context.state.floorsAscended) floors")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                if context.state.pace > 0 {
                    Text("\(Int(context.state.pace)) steps/min")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                } else {
                    Text("\(remaining) to go")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            // Ring
            StepProgressRing(
                steps: context.state.steps,
                goal: context.attributes.stepGoal,
                size: 40
            )
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 20)
        .activityBackgroundTint(Color(.systemBackground).opacity(0.8))
    }

    /// Format large numbers: 12345 → "12.3k"
    static func compactNumber(_ n: Int) -> String {
        if n >= 10_000 {
            return String(format: "%.1fk", Double(n) / 1000.0)
        }
        return "\(n)"
    }

    /// Format distance in meters to human readable
    static func formatDistance(_ meters: Double) -> String {
        if meters >= 1000 {
            return String(format: "%.1f km", meters / 1000.0)
        }
        return "\(Int(meters)) m"
    }

    /// Time elapsed since start
    static func elapsedString(from start: Date) -> String {
        let seconds = Int(Date().timeIntervalSince(start))
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }
}

// MARK: - Step Progress Ring (expanded / lock screen)

/// Circular ring that fills as steps accumulate toward goal.
struct StepProgressRing: View {
    let steps: Int
    let goal: Int
    let size: CGFloat

    private var fraction: Double {
        guard goal > 0 else { return 0 }
        return min(Double(steps) / Double(goal), 1.0)
    }

    var body: some View {
        ZStack {
            // Background track
            Circle()
                .stroke(Color.blue.opacity(0.2), lineWidth: 4)

            // Progress arc (fills clockwise)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(
                    Color.blue,
                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            // Center: percentage or step count
            if goal > 0 {
                Text("\(Int(fraction * 100))%")
                    .font(.system(size: size * 0.24, weight: .bold))
                    .monospacedDigit()
                    .foregroundColor(.blue)
            }
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Step Progress Ring Compact (compact pill / minimal)

/// Tiny step ring for the compact pill trailing slot.
struct StepProgressRingCompact: View {
    let steps: Int
    let goal: Int

    private var fraction: Double {
        guard goal > 0 else { return 0 }
        return min(Double(steps) / Double(goal), 1.0)
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.blue.opacity(0.25), lineWidth: 2)

            Circle()
                .trim(from: 0, to: fraction)
                .stroke(
                    Color.blue,
                    style: StrokeStyle(lineWidth: 2, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            Image(systemName: "shoe.2.fill")
                .font(.system(size: 6))
                .foregroundColor(.blue)
        }
        .frame(width: 14, height: 14)
        .padding(2)
    }
}
