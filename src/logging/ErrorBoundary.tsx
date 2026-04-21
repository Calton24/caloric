/**
 * Error Boundary
 * Catches React errors and logs them
 */

import { Component, ErrorInfo, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { logger } from "./logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component
 * Catches errors in child components and logs them
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
    // Log error via logger (not analytics - separation of concerns)
    logger.error("[ErrorBoundary] Caught error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default recovery fallback — tap to reset
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#111",
              marginBottom: 8,
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#666",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {this.state.error?.message ?? "An unexpected error occurred."}
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{
              backgroundColor: "#111",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
