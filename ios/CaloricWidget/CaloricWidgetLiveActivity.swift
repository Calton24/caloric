/**
 * CaloricWidgetLiveActivity
 *
 * SwiftUI views for the Dynamic Island and Lock Screen Live Activity.
 * Uses CaloricActivityAttributes for the data model.
 *
 * Sections:
 *   - Lock Screen / notification banner (ActivityConfiguration content)
 *   - Dynamic Island expanded (leading, trailing, center, bottom)
 *   - Dynamic Island compact (leading + trailing pill)
 *   - Dynamic Island minimal (single element when another activity has priority)
 */

import ActivityKit
import SwiftUI
import WidgetKit

struct CaloricWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CaloricActivityAttributes.self) { context in
            // ── Lock Screen / notification banner ──
            lockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // ── Expanded Dynamic Island ──
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: iconName(for: context.attributes.icon))
                        .font(.title2)
                        .foregroundColor(.blue)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    if let progress = context.state.progress {
                        ProgressView(value: progress)
                            .progressViewStyle(.circular)
                            .tint(.blue)
                    } else if let endTime = context.state.endTime {
                        Text(endTime, style: .timer)
                            .font(.title3)
                            .monospacedDigit()
                    }
                }

                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.title)
                        .font(.headline)
                        .lineLimit(1)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(context.state.value)
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        Spacer()

                        if let subtitle = context.state.subtitle {
                            Text(subtitle)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            } compactLeading: {
                // ── Compact pill — left side ──
                Image(systemName: iconName(for: context.attributes.icon))
                    .foregroundColor(.blue)
            } compactTrailing: {
                // ── Compact pill — right side ──
                if let progress = context.state.progress {
                    ProgressView(value: progress)
                        .progressViewStyle(.circular)
                        .tint(.blue)
                } else {
                    Text(context.state.value)
                        .font(.caption2)
                        .monospacedDigit()
                        .lineLimit(1)
                }
            } minimal: {
                // ── Minimal (when another activity has priority) ──
                Image(systemName: iconName(for: context.attributes.icon))
                    .foregroundColor(.blue)
            }
        }
    }

    // ── Lock Screen view ──
    @ViewBuilder
    private func lockScreenView(
        context: ActivityViewContext<CaloricActivityAttributes>
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: iconName(for: context.attributes.icon))
                .font(.title2)
                .foregroundColor(.blue)

            VStack(alignment: .leading, spacing: 2) {
                Text(context.state.title)
                    .font(.headline)

                HStack {
                    Text(context.state.value)
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    if let subtitle = context.state.subtitle {
                        Text("·")
                            .foregroundColor(.secondary)
                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()

            if let progress = context.state.progress {
                ProgressView(value: progress)
                    .progressViewStyle(.circular)
                    .tint(.blue)
                    .frame(width: 32, height: 32)
            } else if let endTime = context.state.endTime {
                Text(endTime, style: .timer)
                    .font(.title3)
                    .monospacedDigit()
            }
        }
        .padding()
        .activityBackgroundTint(Color(.systemBackground).opacity(0.8))
    }

    // ── Icon helper ──
    private func iconName(for icon: String?) -> String {
        guard let icon = icon, !icon.isEmpty else {
            return "bolt.fill"
        }
        return icon
    }
}
