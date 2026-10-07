import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, typography, shadows } from "../../theme";
export function ServiceTile({
  title,
  subtitle,
  icon = "smile",
  onPress,
  compact = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tile, compact && styles.compact]}
    >
      <View style={styles.icon}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {!compact ? (
        <Feather name="chevron-right" size={17} color={colors.muted} />
      ) : null}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  tile: {
    minHeight: 72,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
    ...shadows.card,
  },
  compact: {
    width: "23.5%",
    minHeight: 88,
    flexDirection: "column",
    justifyContent: "center",
    padding: 8,
    marginBottom: 0,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, marginLeft: 10 },
  title: {
    fontFamily: typography.family.bold,
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
  },
  sub: {
    fontFamily: typography.family.regular,
    fontSize: 10,
    color: colors.body,
    marginTop: 2,
  },
});
