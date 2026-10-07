import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography, shadows } from "../../theme";
export function StatCard({ value, label, icon }) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 100,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusLg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.card,
  },
  icon: { alignSelf: "flex-start" },
  value: {
    fontFamily: typography.family.bold,
    fontSize: 23,
    fontWeight: "800",
    color: colors.text,
    marginTop: 7,
  },
  label: {
    fontFamily: typography.family.medium,
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
});
