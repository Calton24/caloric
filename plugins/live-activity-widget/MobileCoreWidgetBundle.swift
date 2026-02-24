/**
 * MobileCoreWidgetBundle
 *
 * Entry point for the WidgetKit extension.
 * Registers all widgets — currently just the Live Activity widget.
 */

import SwiftUI
import WidgetKit

@main
struct MobileCoreWidgetBundle: WidgetBundle {
    var body: some Widget {
        MobileCoreWidgetLiveActivity()
        FitnessLiveActivity()
        PedometerLiveActivity()
        CalorieBudgetLiveActivity()
    }
}
