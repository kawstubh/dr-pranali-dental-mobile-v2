import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../theme";
export function Input({ icon = "search", style, ...props }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.icon}>
        <Feather name={icon} size={17} color={colors.primary} />
      </View>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: {
    height: 54,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radiusMd,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    marginLeft: 9,
    color: colors.text,
    fontFamily: typography.family.regular,
    fontSize: 14,
  },
});
