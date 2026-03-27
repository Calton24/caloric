/**
 * CalorieTrackerLiveActivity
 *
 * Full-featured Live Activity for daily calorie & macro tracking.
 *
 * Layout:
 *   Lock Screen:
 *     Top row: Calorie ring (with carrot icon) | Cal count | Macro progress bars
 *     Bottom row: 3 CTA buttons → keyboard, mic, camera (deep links)
 *
 *   Dynamic Island Expanded:
 *     Leading: Calorie ring + count
 *     Trailing: Macro bars
 *     Bottom: 3 CTA buttons
 *
 *   Compact pill: [carrot + consumed] ● [ring]
 *   Minimal: ring only
 */

import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Brand Color

private let brandGreen = Color(red: 0.298, green: 0.733, blue: 0.459) // hue 141 primary

// MARK: - Deep Link URLs

private let textURL = URL(string: "caloric://tracking/manual")!
private let voiceURL = URL(string: "caloric://tracking/voice")!
private let cameraURL = URL(string: "caloric://tracking/camera")!

// MARK: - App Icon View

/// Renders the app's pear icon from the widget's asset catalog
private struct AppIconView: View {
    let size: CGFloat

    var body: some View {
        Image("CaloricIcon")
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.2, style: .continuous))
    }
}

// MARK: - Widget

struct CalorieTrackerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CalorieTrackerActivityAttributes.self) { context in
            // Lock Screen / Notification Banner
            TrackerLockScreenView(
                attrs: context.attributes,
                state: context.state
            )
        } dynamicIsland: { context in
            let attrs = context.attributes
            let state = context.state
            let progress = attrs.calorieGoal > 0
                ? min(Double(state.caloriesConsumed) / Double(attrs.calorieGoal), 1.0)
                : 0.0

            return DynamicIsland {
                // ── Expanded ──
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        TrackerRing(progress: progress, size: 44)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(state.caloriesConsumed)")
                                .font(.title3.bold())
                                .monospacedDigit()
                                .foregroundColor(.white)
                            Text("of \(attrs.calorieGoal) kcal")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.leading, 2)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        MacroBarCompact(
                            label: "P",
                            current: state.proteinConsumed,
                            goal: attrs.proteinGoal,
                            color: .blue
                        )
                        MacroBarCompact(
                            label: "C",
                            current: state.carbsConsumed,
                            goal: attrs.carbsGoal,
                            color: .orange
                        )
                        MacroBarCompact(
                            label: "F",
                            current: state.fatConsumed,
                            goal: attrs.fatGoal,
                            color: .red
                        )
                    }
                    .padding(.trailing, 4)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 8) {
                        Link(destination: textURL) {
                            CTAButton(systemImage: "keyboard")
                        }
                        Link(destination: voiceURL) {
                            CTAButton(systemImage: "mic.fill")
                        }
                        Link(destination: cameraURL) {
                            CTAButton(systemImage: "camera.fill")
                        }
                    }
                    .padding(.top, 4)
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    AppIconView(size: 16)
                    Text("\(state.caloriesConsumed)")
                        .font(.caption2.bold())
                        .monospacedDigit()
                        .foregroundColor(.white)
                }
            } compactTrailing: {
                TrackerRingCompact(progress: progress)
            } minimal: {
                TrackerRingCompact(progress: progress)
            }
        }
    }
}

// MARK: - Lock Screen View

private struct TrackerLockScreenView: View {
    let attrs: CalorieTrackerActivityAttributes
    let state: CalorieTrackerActivityAttributes.ContentState

    private var progress: Double {
        guard attrs.calorieGoal > 0 else { return 0 }
        return min(Double(state.caloriesConsumed) / Double(attrs.calorieGoal), 1.0)
    }

    private var ringColor: Color {
        let ratio = attrs.calorieGoal > 0
            ? Double(state.caloriesConsumed) / Double(attrs.calorieGoal)
            : 0
        if ratio > 1.0 { return .red }
        if ratio >= 0.9 { return .orange }
        return brandGreen
    }

    var body: some View {
        VStack(spacing: 12) {
            // Top section: Ring + Calories + Macros
            HStack(spacing: 14) {
                // Calorie ring with carrot
                ZStack {
                    // Ring track
                    Circle()
                        .stroke(ringColor.opacity(0.25), lineWidth: 5)

                    // Ring progress
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(
                            ringColor,
                            style: StrokeStyle(lineWidth: 5, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))

                    // App icon
                    AppIconView(size: 28)
                }
                .frame(width: 64, height: 64)

                // Calorie count
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(state.caloriesConsumed)")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundColor(.white)
                    Text("of \(formatNumber(attrs.calorieGoal)) kcal")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Macro progress bars
                VStack(alignment: .trailing, spacing: 6) {
                    MacroProgressRow(
                        icon: "fish.fill",
                        current: state.proteinConsumed,
                        goal: attrs.proteinGoal,
                        color: .blue
                    )
                    MacroProgressRow(
                        icon: "leaf.fill",
                        current: state.carbsConsumed,
                        goal: attrs.carbsGoal,
                        color: .orange
                    )
                    MacroProgressRow(
                        icon: "oval.fill",
                        current: state.fatConsumed,
                        goal: attrs.fatGoal,
                        color: .red
                    )
                }
            }

            // CTA buttons row
            HStack(spacing: 10) {
                Link(destination: textURL) {
                    CTAButtonLarge(systemImage: "keyboard")
                }
                Link(destination: voiceURL) {
                    CTAButtonLarge(systemImage: "mic.fill")
                }
                Link(destination: cameraURL) {
                    CTAButtonLarge(systemImage: "camera.fill")
                }
            }
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
        .activityBackgroundTint(Color.black.opacity(0.75))
    }

    private func formatNumber(_ n: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: n)) ?? "\(n)"
    }
}

// MARK: - Macro Progress Row (Lock Screen)

private struct MacroProgressRow: View {
    let icon: String
    let current: Int
    let goal: Int
    let color: Color

    private var fraction: Double {
        guard goal > 0 else { return 0 }
        return min(Double(current) / Double(goal), 1.0)
    }

    var body: some View {
        HStack(spacing: 6) {
            Text("\(current)g")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundColor(.white)

            // Macro icon
            Image(systemName: icon)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(color)
                .frame(width: 14, height: 14)

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    // Track
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.white.opacity(0.15))
                        .frame(height: 4)

                    // Fill
                    RoundedRectangle(cornerRadius: 2)
                        .fill(color)
                        .frame(width: max(geo.size.width * fraction, 2), height: 4)
                }
                .frame(height: 4)
                .offset(y: (geo.size.height - 4) / 2)
            }
            .frame(width: 60, height: 16)
        }
    }
}

// MARK: - Macro Bar Compact (Dynamic Island)

private struct MacroBarCompact: View {
    let label: String
    let current: Int
    let goal: Int
    let color: Color

    private var fraction: Double {
        guard goal > 0 else { return 0 }
        return min(Double(current) / Double(goal), 1.0)
    }

    var body: some View {
        HStack(spacing: 4) {
            Text("\(current)g")
                .font(.system(size: 10, weight: .semibold))
                .monospacedDigit()
                .foregroundColor(.white)
                .frame(width: 28, alignment: .trailing)

            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(Color.white.opacity(0.15))
                    .frame(width: 32, height: 3)

                RoundedRectangle(cornerRadius: 1.5)
                    .fill(color)
                    .frame(width: max(32 * fraction, 1), height: 3)
            }
        }
    }
}

// MARK: - CTA Buttons

private struct CTAButton: View {
    let systemImage: String

    var body: some View {
        Image(systemName: systemImage)
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 36)
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color.white.opacity(0.15))
            )
    }
}

private struct CTAButtonLarge: View {
    let systemImage: String

    var body: some View {
        Image(systemName: systemImage)
            .font(.system(size: 20, weight: .semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(
                RoundedRectangle(cornerRadius: 22)
                    .fill(Color.white.opacity(0.12))
            )
    }
}

// MARK: - Tracker Ring (expanded / lock screen)

private struct TrackerRing: View {
    let progress: Double
    let size: CGFloat

    private var color: Color {
        if progress > 1.0 { return .red }
        if progress >= 0.9 { return .orange }
        return brandGreen
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.25), lineWidth: 4)

            Circle()
                .trim(from: 0, to: min(progress, 1.0))
                .stroke(
                    color,
                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            AppIconView(size: size * 0.45)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Tracker Ring Compact (compact pill / minimal)

private struct TrackerRingCompact: View {
    let progress: Double

    private var color: Color {
        if progress > 1.0 { return .red }
        if progress >= 0.9 { return .orange }
        return brandGreen
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.25), lineWidth: 2)

            Circle()
                .trim(from: 0, to: min(progress, 1.0))
                .stroke(
                    color,
                    style: StrokeStyle(lineWidth: 2, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
        }
        .frame(width: 14, height: 14)
    }
}
