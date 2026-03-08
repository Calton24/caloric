/**
 * CalorieBudgetLiveActivity
 *
 * Dynamic Island + Lock Screen widget for calorie budget tracking.
 *
 * Polish features:
 *   - Budget equation line: "Budget 2,400 = 2,000 goal + 400 earned"
 *   - Three-tier ring colors: green (<90%), amber (90–100%), red (>100%)
 *   - Over-budget: "Over by X" with red ring clamped at 1.0
 *   - Strict vs Adaptive mode (strict ignores activityBonus in budget)
 *   - Mode badge in expanded view
 *
 * Layout:
 *   Compact pill:  [fork.knife icon + remaining]  ●  [budget ring]
 *   Expanded:      Remaining on left, ring on right, equation + stats bottom
 *   Lock Screen:   Full layout with equation + mode badge
 *   Minimal:       Budget ring only
 */

import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Tier Color Logic

/// Three-tier color: green < 90%, amber 90–100%, red > 100%
private func tierColor(consumed: Int, budget: Int) -> Color {
    guard budget > 0 else { return .green }
    let ratio = Double(consumed) / Double(budget)
    if ratio > 1.0 { return .red }
    if ratio >= 0.9 { return .orange }
    return .green
}

/// Effective budget respecting mode
private func effectiveBudget(baseGoal: Int, activityBonus: Int, mode: String) -> Int {
    mode == "strict" ? baseGoal : baseGoal + activityBonus
}

struct CalorieBudgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CalorieBudgetActivityAttributes.self) { context in
            calorieBudgetLockScreenView(context: context)
        } dynamicIsland: { context in
            let isStrict = context.attributes.mode == "strict"
            let budget = effectiveBudget(
                baseGoal: context.attributes.baseGoal,
                activityBonus: context.state.activityBonus,
                mode: context.attributes.mode
            )
            let remaining = budget - context.state.consumed
            let isOver = remaining < 0
            let color = tierColor(consumed: context.state.consumed, budget: budget)

            return DynamicIsland {
                // ── Expanded ──
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 3) {
                        Label {
                            Text(isOver ? "+\(abs(remaining))" : "\(remaining)")
                                .font(.title3.bold())
                                .monospacedDigit()
                                .foregroundColor(color)
                        } icon: {
                            Image(systemName: "fork.knife")
                                .foregroundColor(color)
                        }

                        Text(isOver ? "over budget" : "remaining")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.leading, 4)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    BudgetRing(
                        consumed: context.state.consumed,
                        budget: budget,
                        size: 44
                    )
                    .padding(.trailing, 8)
                }

                DynamicIslandExpandedRegion(.center) {
                    HStack(spacing: 6) {
                        Text("Calorie Budget")
                            .font(.headline)
                        // Mode badge
                        Text(isStrict ? "STRICT" : "ADAPTIVE")
                            .font(.system(size: 8, weight: .semibold))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(
                                Capsule()
                                    .fill(isStrict ? Color.orange.opacity(0.25) : Color.green.opacity(0.25))
                            )
                            .foregroundColor(isStrict ? .orange : .green)
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 4) {
                        // Budget equation — the trust line
                        if isStrict {
                            Text("Budget \(budget) kcal")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.secondary)
                        } else {
                            Text("Budget \(budget) = \(context.attributes.baseGoal) goal + \(context.state.activityBonus) earned")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.secondary)
                        }

                        // Stats row
                        HStack {
                            HStack(spacing: 4) {
                                Image(systemName: "flame.fill")
                                    .foregroundColor(.orange)
                                    .font(.caption2)
                                Text("\(context.state.consumed) eaten")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            if !isStrict {
                                HStack(spacing: 4) {
                                    Image(systemName: "figure.walk")
                                        .foregroundColor(.green)
                                        .font(.caption2)
                                    Text("+\(context.state.activityBonus) earned")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                HStack(spacing: 3) {
                    Image(systemName: "fork.knife")
                        .foregroundColor(color)
                        .font(.caption2)
                    Text(Self.compactNumber(abs(remaining)))
                        .font(.caption2.bold())
                        .monospacedDigit()
                        .foregroundColor(color)
                }
            } compactTrailing: {
                BudgetRingCompact(
                    consumed: context.state.consumed,
                    budget: budget
                )
            } minimal: {
                BudgetRingCompact(
                    consumed: context.state.consumed,
                    budget: budget
                )
            }
        }
    }

    // ── Lock Screen / notification banner ──
    @ViewBuilder
    private func calorieBudgetLockScreenView(
        context: ActivityViewContext<CalorieBudgetActivityAttributes>
    ) -> some View {
        let isStrict = context.attributes.mode == "strict"
        let budget = effectiveBudget(
            baseGoal: context.attributes.baseGoal,
            activityBonus: context.state.activityBonus,
            mode: context.attributes.mode
        )
        let remaining = budget - context.state.consumed
        let isOver = remaining < 0
        let color = tierColor(consumed: context.state.consumed, budget: budget)

        VStack(spacing: 8) {
            // Main row
            HStack(spacing: 12) {
                // Remaining
                VStack(alignment: .leading, spacing: 3) {
                    Label {
                        Text(isOver ? "+\(abs(remaining))" : "\(remaining)")
                            .font(.title3.bold())
                            .monospacedDigit()
                            .foregroundColor(color)
                    } icon: {
                        Image(systemName: "fork.knife")
                            .foregroundColor(color)
                    }

                    Text(isOver ? "over budget" : "remaining")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Stats column
                VStack(alignment: .trailing, spacing: 3) {
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill")
                            .foregroundColor(.orange)
                            .font(.caption2)
                        Text("\(context.state.consumed) eaten")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    if !isStrict {
                        HStack(spacing: 4) {
                            Image(systemName: "figure.walk")
                                .foregroundColor(.green)
                                .font(.caption2)
                            Text("+\(context.state.activityBonus) earned")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                // Ring
                BudgetRing(
                    consumed: context.state.consumed,
                    budget: budget,
                    size: 40
                )
            }

            // Budget equation — the trust line
            HStack(spacing: 0) {
                if isStrict {
                    Text("Budget \(budget) kcal")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(.tertiaryLabel))
                } else {
                    Text("Budget \(budget) = \(context.attributes.baseGoal) goal + \(context.state.activityBonus) earned")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(.tertiaryLabel))
                }

                Spacer()

                // Mode badge
                Text(isStrict ? "STRICT" : "ADAPTIVE")
                    .font(.system(size: 8, weight: .bold, design: .rounded))
                    .tracking(0.5)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        Capsule()
                            .fill(isStrict ? Color.orange.opacity(0.15) : Color.green.opacity(0.15))
                    )
                    .foregroundColor(isStrict ? .orange : .green)
            }
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
}

// MARK: - Budget Ring (expanded / lock screen)

/// Three-tier ring: green (<90%), amber (90–100%), red (>100%).
/// Center shows remaining when under, "!" when over.
struct BudgetRing: View {
    let consumed: Int
    let budget: Int
    let size: CGFloat

    private var fraction: Double {
        guard budget > 0 else { return 0 }
        return min(Double(consumed) / Double(budget), 1.0)
    }

    private var isOver: Bool { consumed > budget }
    private var remaining: Int { max(0, budget - consumed) }

    private var color: Color {
        tierColor(consumed: consumed, budget: budget)
    }

    var body: some View {
        ZStack {
            // Background track
            Circle()
                .stroke(color.opacity(0.2), lineWidth: 4)

            // Progress arc
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(
                    color,
                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            // Center label
            if isOver {
                Text("!")
                    .font(.system(size: size * 0.28, weight: .black))
                    .foregroundColor(.red)
            } else {
                Text("\(remaining)")
                    .font(.system(size: size * 0.22, weight: .bold))
                    .monospacedDigit()
                    .foregroundColor(color)
                    .minimumScaleFactor(0.5)
            }
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Budget Ring Compact (compact pill / minimal)

/// Tiny three-tier ring for compact pill trailing slot.
struct BudgetRingCompact: View {
    let consumed: Int
    let budget: Int

    private var fraction: Double {
        guard budget > 0 else { return 0 }
        return min(Double(consumed) / Double(budget), 1.0)
    }

    private var color: Color {
        tierColor(consumed: consumed, budget: budget)
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.25), lineWidth: 2)

            Circle()
                .trim(from: 0, to: fraction)
                .stroke(
                    color,
                    style: StrokeStyle(lineWidth: 2, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            Image(systemName: "fork.knife")
                .font(.system(size: 6))
                .foregroundColor(color)
        }
        .frame(width: 14, height: 14)
        .padding(2)
    }
}
