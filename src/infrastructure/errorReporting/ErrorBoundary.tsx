/**
 * Error Reporting - React Error Boundary
 * Catches unhandled React errors and reports them
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { reportBreadcrumb, reportError } from "./reportError";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI — either a render function (error, retry) => ReactNode, or a static ReactNode */
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary that reports errors via the configured error reporter
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Drop a crumb so we still see context for the next event even if the
    // captureException below is rate-limited or filtered.
    reportBreadcrumb("React Error Boundary caught error", {
      area: "bootstrap",
      action: "react_error_boundary",
      level: "error",
      extra: {
        componentStack: errorInfo.componentStack ?? null,
      },
    });

    reportError(error, {
      area: "bootstrap",
      action: "react_error_boundary",
      level: "error",
      extra: {
        componentStack: errorInfo.componentStack ?? null,
      },
    });

    if (__DEV__) {
      console.error("[ErrorBoundary] Caught error:", error);
      console.error(
        "[ErrorBoundary] Component stack:",
        errorInfo.componentStack
      );
    }
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        // Support both render function and static ReactNode
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error, this.retry);
        }
        return this.props.fallback;
      }

      // Default fallback UI — include message + retry so TestFlight / internal
      // builds are actionable without opening Sentry for every repro.
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We&apos;ve been notified and are working on a fix.
            </Text>
            {this.state.error.message ? (
              <Text style={styles.errorSummary} selectable>
                {this.state.error.message}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try again"
              onPress={this.retry}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
            >
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
            {__DEV__ && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Stack (dev only)</Text>
                <Text style={styles.errorStack}>{this.state.error.stack}</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#000",
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  errorSummary: {
    marginTop: 16,
    fontSize: 13,
    color: "#333",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  retryButton: {
    marginTop: 24,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorDetails: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#d32f2f",
  },
  errorStack: {
    fontSize: 10,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
