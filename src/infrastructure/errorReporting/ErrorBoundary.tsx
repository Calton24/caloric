/**
 * Error Reporting - React Error Boundary
 * Catches unhandled React errors and reports them
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { getErrorReporter } from "./factory";

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
    // Report to error tracking service
    const reporter = getErrorReporter();

    // Add React-specific context
    reporter.addBreadcrumb({
      message: "React Error Boundary caught error",
      category: "error-boundary",
      level: "error",
      data: {
        componentStack: errorInfo.componentStack,
      },
    });

    reporter.captureException(error, {
      react: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Also log to console in development
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

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We&apos;ve been notified and are working on a fix.
            </Text>
            {__DEV__ && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (dev only):</Text>
                <Text style={styles.errorText}>{this.state.error.message}</Text>
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
  errorText: {
    fontSize: 12,
    color: "#d32f2f",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
