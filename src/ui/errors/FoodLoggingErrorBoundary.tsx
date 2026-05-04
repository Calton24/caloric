/**
 * Route-level error boundary for food logging modals.
 * Catches render errors, reports to Sentry with food_logging tags, and offers recovery.
 */

import { router } from "expo-router";
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  addFoodLoggingBreadcrumb,
  captureFoodLoggingError,
} from "../../infrastructure/errorReporting/foodLoggingErrors";

export interface FoodLoggingErrorBoundaryProps {
  /** Route identifier for Sentry (e.g. "/(modals)/tracking"). */
  routeLabel: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

export class FoodLoggingErrorBoundary extends Component<
  FoodLoggingErrorBoundaryProps,
  State
> {
  state: State = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    captureFoodLoggingError(error, {
      flow: "unknown",
      step: "react_render_error",
      route: this.props.routeLabel,
    });
    addFoodLoggingBreadcrumb("food_logging.screen_error", {
      route: this.props.routeLabel,
      component_stack_preview: errorInfo.componentStack?.slice(0, 500),
    });
  }

  private handleRetry = (): void => {
    this.setState((s) => ({
      hasError: false,
      error: null,
      resetKey: s.resetKey + 1,
    }));
  };

  private handleGoHome = (): void => {
    try {
      router.replace("/(tabs)" as never);
    } catch (e) {
      captureFoodLoggingError(e, {
        flow: "unknown",
        step: "error_boundary_go_home",
        route: this.props.routeLabel,
      });
    }
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Something went wrong while opening food tracking.
          </Text>
          <Pressable style={styles.btnPrimary} onPress={this.handleRetry}>
            <Text style={styles.btnPrimaryText}>Try again</Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={this.handleGoHome}>
            <Text style={styles.btnSecondaryText}>Go Home</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View key={this.state.resetKey} style={styles.flex}>
        {this.props.children}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "#0B0F14",
    padding: 24,
    justifyContent: "center",
    gap: 16,
  },
  title: {
    color: "#F3F5F7",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    color: "#AAB3C2",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 8,
  },
  btnPrimary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontWeight: "700",
  },
  btnSecondary: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#314050",
  },
  btnSecondaryText: {
    color: "#D0D5DE",
    fontSize: 16,
    fontWeight: "600",
  },
});
