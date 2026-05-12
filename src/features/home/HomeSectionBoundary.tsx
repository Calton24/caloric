import React from "react";
import { View } from "react-native";
import { reportError } from "../../infrastructure/errorReporting";
import { TText } from "../../ui/primitives/TText";

type Props = {
  name: string;
  children: React.ReactNode;
};

type State = { hasError: boolean };

export class HomeSectionBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error, {
      area: "home",
      action: "section_render_failed",
      extra: { section: this.props.name },
    });
    if (__DEV__) {
      console.error("[HomeSectionBoundary]", this.props.name, error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 16 }}>
          <TText style={{ opacity: 0.85 }}>
            Could not load {this.props.name}
          </TText>
        </View>
      );
    }
    return this.props.children;
  }
}
