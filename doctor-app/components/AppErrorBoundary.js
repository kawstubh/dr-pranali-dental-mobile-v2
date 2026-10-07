import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";

export class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          The app hit an unexpected screen error. Your saved clinic data was not changed.
        </Text>
        <Pressable style={styles.button} onPress={this.handleRetry}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.screen,
  },
  title: {
    fontFamily: typography.family.bold,
    fontSize: 24,
    color: colors.text,
    textAlign: "center",
  },
  message: {
    fontFamily: typography.family.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.body,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 320,
  },
  button: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: spacing.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    fontFamily: typography.family.bold,
    color: colors.white,
    fontSize: 14,
  },
});
