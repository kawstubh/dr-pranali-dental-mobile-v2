import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, spacing, typography } from "../../theme";
export function TimeSlot({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.slot, selected && styles.selected]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  slot: {
    flex: 1,
    minWidth: 88,
    paddingVertical: 11,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: {
    fontFamily: typography.family.medium,
    fontSize: 12,
    color: colors.body,
  },
  selectedText: { color: colors.white, fontWeight: "800" },
});
