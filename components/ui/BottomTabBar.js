import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, typography, shadows } from "../../theme";
export function BottomTabBar({ items, active, onChange }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {items.map((item) => {
          const selected = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              style={[styles.item, selected && styles.selected]}
            >
              <View style={[styles.icon, selected && styles.iconSelected]}>
                <Feather
                  name={item.icon}
                  size={19}
                  color={selected ? colors.primary : colors.muted}
                />
              </View>
              <Text style={[styles.label, selected && styles.active]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 10,
  },
  bar: {
    height: 68,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    flexDirection: "row",
    paddingHorizontal: 5,
    ...shadows.floating,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    marginVertical: 5,
  },
  selected: { backgroundColor: colors.softBlue },
  icon: {
    width: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSelected: {},
  label: {
    marginTop: 2,
    fontFamily: typography.family.medium,
    fontSize: 9,
    color: colors.muted,
  },
  active: { color: colors.primary, fontWeight: "800" },
});
