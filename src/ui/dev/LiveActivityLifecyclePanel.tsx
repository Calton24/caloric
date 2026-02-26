/**
 * LiveActivityLifecyclePanel
 *
 * Professional lifecycle validation panel for Dynamic Island.
 * Tests every edge case: foreground/background updates, app kill recovery,
 * duplicate starts, lock/unlock persistence, stale activity cleanup.
 *
 * This is not a demo — it's a test harness.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    AppState,
    type AppStateStatus,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { liveActivity } from "../../infrastructure/liveActivity";
import { fitnessActivity } from "../../infrastructure/liveActivity/FitnessActivity";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../glass/GlassCard";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

interface TestResult {
  name: string;
  status: "pass" | "fail" | "warn" | "running" | "pending";
  detail?: string;
  timestamp?: number;
}

/* ── Component ─────────────────────────────────────── */

export function LiveActivityLifecyclePanel() {
  const { theme } = useTheme();
  const supported = liveActivity.isSupported();

  const [tests, setTests] = useState<TestResult[]>([
    { name: "Foreground update", status: "pending" },
    { name: "Background update", status: "pending" },
    { name: "App kill recovery", status: "pending" },
    { name: "Duplicate start guard", status: "pending" },
    { name: "Same ID re-start", status: "pending" },
    { name: "Lock/unlock persist", status: "pending" },
    { name: "Multi-activity", status: "pending" },
    { name: "End all cleanup", status: "pending" },
    { name: "Orphan detection", status: "pending" },
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [bgUpdatePending, setBgUpdatePending] = useState(false);
  const appState = useRef(AppState.currentState);
  const bgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateCountRef = useRef(0);

  // ── Logging helper ──
  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLog((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  // ── Update test result ──
  const updateTest = useCallback(
    (name: string, status: TestResult["status"], detail?: string) => {
      setTests((prev) =>
        prev.map((t) =>
          t.name === name ? { ...t, status, detail, timestamp: Date.now() } : t
        )
      );
    },
    []
  );

  // ── AppState listener for background testing ──
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const prevState = appState.current;
        appState.current = nextState;
        addLog(`AppState: ${prevState} → ${nextState}`);

        // Test: background update
        if (nextState === "background" && bgUpdatePending && activeId) {
          addLog("⏱ Starting background update timer (5s intervals)");
          updateTest(
            "Background update",
            "running",
            "Timer started — background the app for 10s"
          );
          let count = 0;
          bgTimerRef.current = setInterval(() => {
            count++;
            const result = liveActivity.update(activeId, "StatusWidget", {
              title: "BG Update Test",
              status: `BG tick #${count}`,
              progress: Math.min(count * 0.2, 1),
            });
            addLog(`BG update #${count} → ${result.status}`);
          }, 5000);
        }

        // Test: foreground resume after background
        if (nextState === "active" && prevState === "background") {
          // Stop background timer
          if (bgTimerRef.current) {
            clearInterval(bgTimerRef.current);
            bgTimerRef.current = null;
            setBgUpdatePending(false);
            addLog("⏹ Background timer stopped");
          }

          // Check if our activity survived backgrounding
          if (activeId) {
            const activities = liveActivity.getActiveActivities();
            const found = activities.find((a) => a.id === activeId);
            if (found) {
              if (found.activityState === "active") {
                updateTest(
                  "Background update",
                  "pass",
                  `Survived background, state=${found.activityState}`
                );
                addLog(
                  `✅ Activity survived background (state: ${found.activityState})`
                );
              } else {
                updateTest(
                  "Background update",
                  "warn",
                  `State=${found.activityState} after background`
                );
                addLog(
                  `⚠️ Activity state after background: ${found.activityState}`
                );
              }
            } else {
              updateTest(
                "Background update",
                "fail",
                "Activity lost after backgrounding"
              );
              addLog("❌ Activity not found after returning from background");
            }
          }

          // Lock/unlock test: check if activity persisted
          if (activeId) {
            const activities = liveActivity.getActiveActivities();
            const found = activities.find((a) => a.id === activeId);
            if (found && found.activityState === "active") {
              updateTest(
                "Lock/unlock persist",
                "pass",
                "Activity persisted through lock cycle"
              );
              addLog("✅ Activity persisted through lock/unlock");
            }
          }
        }
      }
    );

    return () => {
      sub.remove();
      if (bgTimerRef.current) clearInterval(bgTimerRef.current);
    };
  }, [activeId, bgUpdatePending, addLog, updateTest]);

  // ──────────────────────────────────────────────────
  // Test 1: Foreground update
  // ──────────────────────────────────────────────────
  const runForegroundUpdate = useCallback(() => {
    updateTest("Foreground update", "running");
    addLog("▶ Test: Foreground update");

    // Start fresh
    liveActivity.endAll();
    const startResult = liveActivity.start("StatusWidget", {
      title: "FG Test",
      status: "Starting...",
      progress: 0,
    });

    if (startResult.status !== "started") {
      updateTest(
        "Foreground update",
        "fail",
        `Start failed: ${startResult.status}`
      );
      addLog(`❌ Start failed: ${JSON.stringify(startResult)}`);
      return;
    }

    const id = startResult.activityId;
    setActiveId(id);
    addLog(`Started activity: ${id.slice(0, 12)}...`);

    // Do 3 rapid updates
    let allUpdatesOk = true;
    for (let i = 1; i <= 3; i++) {
      const r = liveActivity.update(id, "StatusWidget", {
        title: "FG Test",
        status: `Update ${i}/3`,
        progress: i / 3,
      });
      if (r.status !== "updated") {
        allUpdatesOk = false;
        addLog(`❌ Update ${i} failed: ${r.status}`);
      } else {
        addLog(`Update ${i}/3 → OK`);
      }
    }

    if (allUpdatesOk) {
      updateTest("Foreground update", "pass", "3/3 updates succeeded");
      addLog("✅ Foreground update: PASS");
    } else {
      updateTest("Foreground update", "fail", "Some updates failed");
    }
    updateCountRef.current = 3;
  }, [addLog, updateTest]);

  // ──────────────────────────────────────────────────
  // Test 2: Background update (arm timer, user backgrounds)
  // ──────────────────────────────────────────────────
  const armBackgroundUpdate = useCallback(() => {
    if (!activeId) {
      addLog("⚠️ No active activity — run Foreground test first");
      return;
    }
    setBgUpdatePending(true);
    updateTest(
      "Background update",
      "running",
      "Background the app now — updates fire every 5s"
    );
    addLog("▶ Test: Background update — BACKGROUND THE APP NOW");
    addLog("Updates will fire every 5s while backgrounded");
  }, [activeId, addLog, updateTest]);

  // ──────────────────────────────────────────────────
  // Test 3: App kill recovery (checks for orphaned activities)
  // ──────────────────────────────────────────────────
  const runRecoveryCheck = useCallback(() => {
    updateTest("App kill recovery", "running");
    addLog("▶ Test: App kill recovery — checking for surviving activities");

    const activities = liveActivity.getActiveActivities();
    const count = liveActivity.getActiveCount();
    addLog(`Found ${count} active activities from ActivityKit`);

    activities.forEach((a) => {
      addLog(
        `  → [${a.type}] ${a.id?.slice(0, 12)}... state=${a.activityState}`
      );
    });

    if (count > 0) {
      const activeOnes = activities.filter((a) => a.activityState === "active");
      if (activeOnes.length > 0) {
        updateTest(
          "App kill recovery",
          "pass",
          `${activeOnes.length} activity(s) survived restart`
        );
        addLog("✅ Activities survived app restart");
        // Recover the most recent
        const recovered = activeOnes[0];
        setActiveId(recovered.id);
        addLog(`Recovered active ID: ${recovered.id?.slice(0, 12)}...`);
      } else {
        updateTest(
          "App kill recovery",
          "warn",
          `${count} found but none active (states: ${activities.map((a) => a.activityState).join(", ")})`
        );
        addLog("⚠️ Activities found but none in 'active' state");
      }
    } else {
      if (activeId) {
        updateTest(
          "App kill recovery",
          "fail",
          "Had an activeId in state but ActivityKit lost it"
        );
        addLog(
          "❌ No activities survive — test requires starting an activity, killing app, reopening"
        );
      } else {
        updateTest(
          "App kill recovery",
          "warn",
          "No activities found — start one, kill app, reopen, then run this"
        );
        addLog(
          "ℹ️ No activities to recover. Start one → kill app → reopen → run this test"
        );
      }
    }
  }, [activeId, addLog, updateTest]);

  // ──────────────────────────────────────────────────
  // Test 4: Duplicate start guard
  // ──────────────────────────────────────────────────
  const runDuplicateStartTest = useCallback(() => {
    updateTest("Duplicate start guard", "running");
    addLog("▶ Test: Duplicate start guard");

    liveActivity.endAll();

    const first = liveActivity.start("StatusWidget", {
      title: "Dup Test 1",
      status: "First",
      progress: 0.5,
    });

    const second = liveActivity.start("StatusWidget", {
      title: "Dup Test 2",
      status: "Second",
      progress: 0.8,
    });

    const count = liveActivity.getActiveCount();
    addLog(`Started 2 activities. Total active: ${count}`);

    if (first.status === "started" && second.status === "started") {
      if (count === 2) {
        updateTest(
          "Duplicate start guard",
          "warn",
          "Both started — iOS allows multiple. Consider app-level guard."
        );
        addLog("⚠️ iOS does NOT prevent duplicate starts — app must guard");
      } else if (count === 1) {
        updateTest("Duplicate start guard", "pass", "Only 1 activity created");
        addLog("✅ Only 1 activity despite 2 start calls");
      }
    } else {
      updateTest(
        "Duplicate start guard",
        "fail",
        `first=${first.status}, second=${second.status}`
      );
      addLog(`❌ first=${first.status}, second=${second.status}`);
    }

    // Clean up
    liveActivity.endAll();
    setActiveId(null);
  }, [addLog, updateTest]);

  // ──────────────────────────────────────────────────
  // Test 5: Same ID re-start
  // ──────────────────────────────────────────────────
  const runSameIdRestart = useCallback(() => {
    updateTest("Same ID re-start", "running");
    addLog("▶ Test: Same ID re-start");

    liveActivity.endAll();

    const first = liveActivity.start("StatusWidget", {
      title: "ID Test",
      status: "Original",
      progress: 0.3,
    });

    if (first.status !== "started") {
      updateTest("Same ID re-start", "fail", "Could not start first activity");
      return;
    }

    addLog(`First start ID: ${first.activityId.slice(0, 12)}...`);

    // End it
    liveActivity.end(first.activityId, "StatusWidget");
    addLog("Ended first activity");

    // Start again — should get NEW ID
    const second = liveActivity.start("StatusWidget", {
      title: "ID Test",
      status: "Restarted",
      progress: 0.5,
    });

    if (second.status === "started") {
      const sameId = first.activityId === second.activityId;
      addLog(`Second start ID: ${second.activityId.slice(0, 12)}...`);
      addLog(`Same ID? ${sameId}`);

      if (!sameId) {
        updateTest("Same ID re-start", "pass", "New ID generated on re-start");
        addLog("✅ Fresh activity ID on restart");
      } else {
        updateTest("Same ID re-start", "warn", "Same ID reused (OS behavior)");
        addLog("⚠️ Same ID reused — iOS behavior, not necessarily a bug");
      }
      setActiveId(second.activityId);
    } else {
      updateTest(
        "Same ID re-start",
        "fail",
        `Re-start failed: ${second.status}`
      );
    }

    liveActivity.endAll();
    setActiveId(null);
  }, [addLog, updateTest]);

  // ──────────────────────────────────────────────────
  // Test 6: Lock/unlock — auto-checked via AppState
  // ──────────────────────────────────────────────────
  const armLockTest = useCallback(() => {
    if (!activeId) {
      addLog("⚠️ No active activity — run Foreground test first");
      return;
    }
    updateTest(
      "Lock/unlock persist",
      "running",
      "Lock your device now, then unlock"
    );
    addLog("▶ Test: Lock/unlock persist — LOCK YOUR DEVICE NOW");
    addLog("Activity should persist on the Lock Screen and after unlock");
  }, [activeId, addLog, updateTest]);

  // ──────────────────────────────────────────────────
  // Test 7: Multi-activity (start both status + fitness)
  // ──────────────────────────────────────────────────
  const runMultiActivityTest = useCallback(() => {
    updateTest("Multi-activity", "running");
    addLog("▶ Test: Multi-activity (status + fitness simultaneously)");

    liveActivity.endAll();

    const status = liveActivity.start("StatusWidget", {
      title: "Multi Test",
      status: "Status Activity",
      progress: 0.5,
    });

    const fitness = fitnessActivity.start({
      calorieGoal: 2000,
      steps: 1000,
      caloriesUsed: 100,
      distance: 0.8,
    });

    const count = liveActivity.getActiveCount();
    addLog(`Started status=${status.status}, fitness=${fitness.status}`);
    addLog(`Total active activities: ${count}`);

    if (status.status === "started" && fitness.status === "started") {
      if (count >= 2) {
        updateTest(
          "Multi-activity",
          "pass",
          `${count} concurrent activities active`
        );
        addLog("✅ Multiple activity types coexist");
      } else {
        updateTest(
          "Multi-activity",
          "warn",
          `Only ${count} active despite 2 starts`
        );
      }
    } else {
      updateTest(
        "Multi-activity",
        "fail",
        `status=${status.status}, fitness=${fitness.status}`
      );
    }

    // Leave them running for visual inspection
    if (status.status === "started") {
      setActiveId(status.activityId);
    }
  }, [addLog, updateTest]);

  // ──────────────────────────────────────────────────
  // Test 8: End all cleanup
  // ──────────────────────────────────────────────────
  const runEndAllTest = useCallback(() => {
    updateTest("End all cleanup", "running");
    addLog("▶ Test: End all cleanup");

    // Start 2 activities
    liveActivity.start("StatusWidget", {
      title: "Cleanup 1",
      status: "A",
      progress: 0.1,
    });
    liveActivity.start("StatusWidget", {
      title: "Cleanup 2",
      status: "B",
      progress: 0.2,
    });

    const beforeCount = liveActivity.getActiveCount();
    addLog(`Before cleanup: ${beforeCount} active`);

    liveActivity.endAll();

    // Small delay then check (endAll is async on native side)
    setTimeout(() => {
      const afterCount = liveActivity.getActiveCount();
      addLog(`After cleanup: ${afterCount} active`);

      if (afterCount === 0) {
        updateTest("End all cleanup", "pass", `Cleaned ${beforeCount} → 0`);
        addLog("✅ All activities ended");
      } else {
        updateTest(
          "End all cleanup",
          "warn",
          `${afterCount} still active after endAll (async delay)`
        );
        addLog("⚠️ Some activities may still be ending (async)");
      }
      setActiveId(null);
    }, 1000);
  }, [addLog, updateTest]);

  // ──────────────────────────────────────────────────
  // Test 9: Orphan detection
  // ──────────────────────────────────────────────────
  const runOrphanDetection = useCallback(() => {
    updateTest("Orphan detection", "running");
    addLog("▶ Test: Orphan detection (activities with no JS reference)");

    const activities = liveActivity.getActiveActivities();
    const fitnessActivities = fitnessActivity.getActiveActivities();
    const total = activities.length + fitnessActivities.length;

    addLog(`Status activities: ${activities.length}`);
    activities.forEach((a) => {
      addLog(`  [status] ${a.id?.slice(0, 12)}... state=${a.activityState}`);
    });

    addLog(`Fitness activities: ${fitnessActivities.length}`);
    fitnessActivities.forEach((a: Record<string, any>) => {
      addLog(
        `  [fitness] ${a.id?.slice(0, 12)}... state=${a.activityState} steps=${a.steps}`
      );
    });

    const staleOrEnded = activities.filter(
      (a) => a.activityState === "stale" || a.activityState === "ended"
    );

    if (total === 0) {
      updateTest("Orphan detection", "pass", "No orphaned activities");
      addLog("✅ Clean — no orphaned activities");
    } else if (staleOrEnded.length > 0) {
      updateTest(
        "Orphan detection",
        "warn",
        `${staleOrEnded.length} stale/ended orphan(s) found`
      );
      addLog(
        `⚠️ ${staleOrEnded.length} stale/ended activities should be cleaned up`
      );
    } else {
      updateTest("Orphan detection", "pass", `${total} active — all healthy`);
      addLog(`✅ ${total} activities found, all in healthy state`);
    }
  }, [addLog, updateTest]);

  // ── Test runner map ──
  const testActions: Record<string, () => void> = {
    "Foreground update": runForegroundUpdate,
    "Background update": armBackgroundUpdate,
    "App kill recovery": runRecoveryCheck,
    "Duplicate start guard": runDuplicateStartTest,
    "Same ID re-start": runSameIdRestart,
    "Lock/unlock persist": armLockTest,
    "Multi-activity": runMultiActivityTest,
    "End all cleanup": runEndAllTest,
    "Orphan detection": runOrphanDetection,
  };

  // ── Status icon ──
  const statusIcon = (
    s: TestResult["status"]
  ): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (s) {
      case "pass":
        return { name: "checkmark-circle", color: theme.colors.success };
      case "fail":
        return { name: "close-circle", color: theme.colors.error };
      case "warn":
        return { name: "warning", color: theme.colors.warning };
      case "running":
        return { name: "sync-outline", color: theme.colors.primary };
      default:
        return { name: "ellipse-outline", color: theme.colors.textMuted };
    }
  };

  // ── Run all tests sequentially ──
  const runAllTests = useCallback(() => {
    addLog("═══ Running all lifecycle tests ═══");
    runForegroundUpdate();
    setTimeout(() => runDuplicateStartTest(), 500);
    setTimeout(() => runSameIdRestart(), 1000);
    setTimeout(() => runMultiActivityTest(), 1500);
    setTimeout(() => runEndAllTest(), 2500);
    setTimeout(() => runOrphanDetection(), 4000);
    setTimeout(() => runRecoveryCheck(), 5000);
  }, [
    addLog,
    runForegroundUpdate,
    runDuplicateStartTest,
    runSameIdRestart,
    runMultiActivityTest,
    runEndAllTest,
    runOrphanDetection,
    runRecoveryCheck,
  ]);

  if (!supported) {
    return (
      <GlassCard padding="md" style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="bug-outline" size={20} color={theme.colors.error} />
          <TText style={[styles.title, { color: theme.colors.text }]}>
            Lifecycle Validation
          </TText>
        </View>
        <TSpacer size="sm" />
        <TText color="muted" style={styles.hint}>
          Requires iOS dev build with native LiveActivityModule.
        </TText>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="md" style={styles.card}>
      {/* Header */}
      <View style={styles.row}>
        <Ionicons name="bug-outline" size={20} color={theme.colors.primary} />
        <TText style={[styles.title, { color: theme.colors.text }]}>
          Lifecycle Validation
        </TText>
      </View>

      <TSpacer size="xs" />
      <TText color="muted" style={styles.hint}>
        Dynamic Island is a lifecycle feature, not a UI feature.
      </TText>

      <TSpacer size="md" />

      {/* Run All + Cleanup */}
      <View style={styles.topActions}>
        <Pressable
          onPress={runAllTests}
          style={[styles.runAllBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="play" size={14} color="#fff" />
          <TText style={styles.runAllLabel}>Run All</TText>
        </Pressable>
        <Pressable
          onPress={() => {
            liveActivity.endAll();
            setActiveId(null);
            addLog("🧹 Ended all activities");
          }}
          style={[styles.cleanupBtn, { borderColor: theme.colors.border }]}
        >
          <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
          <TText
            style={{
              color: theme.colors.error,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            End All
          </TText>
        </Pressable>
      </View>

      <TSpacer size="sm" />

      {/* Active count */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Active Count
        </TText>
        <TText
          style={{ color: theme.colors.text, fontSize: 13, fontWeight: "600" }}
        >
          {liveActivity.getActiveCount()}
        </TText>
      </View>

      {activeId && (
        <View style={styles.statusRow}>
          <TText color="muted" style={styles.label}>
            Tracked ID
          </TText>
          <TText
            color="muted"
            style={styles.tokenText}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {activeId}
          </TText>
        </View>
      )}

      <TSpacer size="md" />

      {/* Test grid */}
      {tests.map((test) => {
        const icon = statusIcon(test.status);
        return (
          <Pressable
            key={test.name}
            onPress={testActions[test.name]}
            style={[styles.testRow, { borderColor: theme.colors.border }]}
          >
            <Ionicons name={icon.name} size={16} color={icon.color} />
            <View style={styles.testInfo}>
              <TText style={[styles.testName, { color: theme.colors.text }]}>
                {test.name}
              </TText>
              {test.detail && (
                <TText
                  color="muted"
                  style={styles.testDetail}
                  numberOfLines={2}
                >
                  {test.detail}
                </TText>
              )}
            </View>
            <Ionicons
              name="play-outline"
              size={14}
              color={theme.colors.textMuted}
            />
          </Pressable>
        );
      })}

      <TSpacer size="md" />

      {/* Event log */}
      <View style={styles.logHeader}>
        <TText style={[styles.logTitle, { color: theme.colors.text }]}>
          Event Log
        </TText>
        <Pressable onPress={() => setLog([])}>
          <TText color="muted" style={{ fontSize: 11 }}>
            Clear
          </TText>
        </Pressable>
      </View>

      <View
        style={[
          styles.logContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {log.length === 0 ? (
          <TText color="muted" style={styles.logLine}>
            No events yet. Run a test.
          </TText>
        ) : (
          log.slice(0, 20).map((line, i) => (
            <TText
              key={`${i}-${line.slice(0, 20)}`}
              color="muted"
              style={styles.logLine}
              numberOfLines={2}
            >
              {line}
            </TText>
          ))
        )}
      </View>
    </GlassCard>
  );
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  card: { marginHorizontal: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 12, fontStyle: "italic" },
  topActions: { flexDirection: "row", gap: 8 },
  runAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  runAllLabel: { color: "#fff", fontSize: 13, fontWeight: "600" },
  cleanupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  label: { fontSize: 13, fontWeight: "500" },
  tokenText: { fontSize: 11, maxWidth: 160 },
  testRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  testInfo: { flex: 1 },
  testName: { fontSize: 13, fontWeight: "600" },
  testDetail: { fontSize: 11, marginTop: 2 },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  logTitle: { fontSize: 13, fontWeight: "600" },
  logContainer: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
    maxHeight: 200,
  },
  logLine: { fontSize: 10, fontFamily: "Menlo", lineHeight: 16 },
});
