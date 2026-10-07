import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, typography, shadows } from "../../theme";
export function Button({
  title,
  onPress,
  variant = "primary",
  icon = "arrow-right",
  disabled = false,
  style,
}) {
  const content = (
    <>
      <Text style={[styles.text, variant === "outline" && styles.outlineText]}>
        {title}
      </Text>
      {icon ? (
        <Feather
          name={icon}
          size={17}
          color={variant === "outline" ? colors.primary : colors.white}
        />
      ) : null}
    </>
  );
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.pressable, disabled && styles.disabled, style]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={[colors.ctaStart, colors.ctaEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={styles.outline}>{content}</View>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  pressable: {
    minHeight: 54,
    borderRadius: spacing.radiusMd,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fill: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.button,
  },
  outline: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.blue200,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  text: {
    fontFamily: typography.family.bold,
    fontSize: 14,
    color: colors.white,
    fontWeight: "800",
  },
  outlineText: { color: colors.primary },
  disabled: { opacity: 0.5 },
});
