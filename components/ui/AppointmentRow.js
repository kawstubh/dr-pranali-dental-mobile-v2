import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme";
export function AppointmentRow({
  name,
  time,
  subtitle,
  status = "Upcoming",
  onPress,
}) {
  return (
    <View style={styles.row}>
      <View style={styles.bar} />
      <View style={styles.main}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <Text
        style={[
          styles.status,
          status === "Arrived" ? styles.arrived : styles.upcoming,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  bar: {
    width: 4,
    height: 50,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  main: { flex: 1 },
  name: {
    fontFamily: typography.family.bold,
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  sub: {
    fontFamily: typography.family.regular,
    fontSize: 11,
    color: colors.body,
    marginTop: 2,
  },
  time: {
    fontFamily: typography.family.medium,
    fontSize: 11,
    color: colors.primary,
    marginTop: 5,
  },
  status: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    fontFamily: typography.family.bold,
    fontSize: 10,
    fontWeight: "800",
  },
  arrived: { backgroundColor: colors.successSoft, color: colors.success },
  upcoming: { backgroundColor: colors.softBlue, color: colors.primary },
});
