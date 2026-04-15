/**
 * CaloricWidgetBundle
 *
 * Entry point for the WidgetKit extension.
 * Registers all widgets — currently just the Live Activity widget.
 */

import SwiftUI
import WidgetKit

@main
struct CaloricWidgetBundle: WidgetBundle {
    var body: some Widget {
        CaloricWidgetLiveActivity()
        FitnessLiveActivity()
        PedometerLiveActivity()
        CalorieBudgetLiveActivity()
        CalorieTrackerLiveActivity()
    }
}
