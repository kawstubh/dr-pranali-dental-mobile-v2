import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, spacing, typography } from "../../theme";
export function Chip({ label, selected = false, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.base, selected ? styles.selected : styles.idle, style]}
    >
      <Text
        style={[styles.text, selected ? styles.selectedText : styles.idleText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: spacing.pill,
    borderWidth: 1,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  idle: { backgroundColor: colors.white, borderColor: colors.border },
  text: {
    fontFamily: typography.family.medium,
    fontSize: 12,
    fontWeight: "700",
  },
  selectedText: { color: colors.white },
  idleText: { color: colors.body },
});
