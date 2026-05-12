# Debugging native crashes (iOS)

JavaScript exceptions and `Sentry.captureException` appear in Sentry. Process termination from native code, memory pressure, watchdog kills, or `EXC_BAD_ACCESS` / `SIGABRT` often does **not** produce a JS-visible error. Capture device logs while reproducing.

## Physical device

1. Open **Xcode** → **Window** → **Devices and Simulators**.
2. Select the device → **Open Console**.
3. Filter by any of:

`caloric` · `Caloric` · `com.calton.caloric` · `EXC` · `SIGABRT` · `RCTFatal` · `Reanimated` · `ActivityKit` · `RNSScreen` · `Jetsam` · `watchdog`

## iOS Simulator (terminal)

With a booted simulator:

```bash
xcrun simctl spawn booted log stream --style compact --predicate 'process CONTAINS "caloric" OR eventMessage CONTAINS "com.calton.caloric" OR eventMessage CONTAINS "EXC" OR eventMessage CONTAINS "SIGABRT" OR eventMessage CONTAINS "RCTFatal" OR eventMessage CONTAINS "Reanimated" OR eventMessage CONTAINS "ActivityKit"'
```

Look for the first native fault line (e.g. `Terminating app due to uncaught exception`, `EXC_BAD_ACCESS`, `JetsamEvent`) — that line matters more than Metro output alone.

## Sentry environment

Events may be tagged with the same `environment` as `EXPO_PUBLIC_APP_ENV` / `extra.APP_ENV`. In the S issues UI, clear environment filters or search for breadcrumbs / messages such as `[SentryDevPing]` or `[FoodLogDebug]`.
