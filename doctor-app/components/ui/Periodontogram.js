import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";
import { colors, spacing, typography } from "../../theme";
export function Periodontogram({ patientName = "Patient", onSave }) {
  const teeth = [
    "18",
    "17",
    "16",
    "15",
    "14",
    "13",
    "12",
    "11",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "48",
    "47",
    "46",
    "45",
    "44",
    "43",
    "42",
    "41",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
  ];
  const [selected, setSelected] = useState("46");
  const [values, setValues] = useState({});
  const current = values[selected] || {};
  const points = ["MB", "B", "DB", "ML", "L", "DL"];
  const depth = useMemo(
    () =>
      points.map((p, i) => ({ p, v: Number(current[p] || 2), x: 12 + i * 49 })),
    [current],
  );
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>CLINICAL PERIODONTICS</Text>
      <Text style={styles.title}>Periodontogram</Text>
      <Text style={styles.sub}>{patientName} • pocket depth (mm)</Text>
      <View style={styles.toothRow}>
        {teeth.map((t) => (
          <Pressable
            key={t}
            onPress={() => setSelected(t)}
            style={[styles.tooth, selected === t && styles.toothActive]}
          >
            <Text
              style={[
                styles.toothText,
                selected === t && styles.toothTextActive,
              ]}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>
      <Svg width="100%" height="125" viewBox="0 0 300 125">
        <Path
          d="M10 88 C70 55 120 110 170 75 S250 95 290 60"
          fill="none"
          stroke={colors.primary}
          strokeWidth="3"
        />
        <Path
          d="M10 98 C70 68 120 120 170 85 S250 105 290 70"
          fill="none"
          stroke={colors.danger}
          strokeWidth="2"
        />
        {depth.map((d) => (
          <SvgText
            key={d.p}
            x={d.x}
            y="42"
            fontSize="9"
            fill={
              d.v >= 6
                ? colors.danger
                : d.v >= 4
                  ? colors.warning
                  : colors.primary
            }
          >
            {d.v}
          </SvgText>
        ))}
      </Svg>
      <View style={styles.grid}>
        {points.map((p) => (
          <View key={p} style={styles.cell}>
            <Text style={styles.point}>{p}</Text>
            <TextInput
              value={String(current[p] ?? "")}
              onChangeText={(v) =>
                setValues((prev) => ({
                  ...prev,
                  [selected]: {
                    ...(prev[selected] || {}),
                    [p]: v.replace(/[^0-9]/g, ""),
                  },
                }))
              }
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          1–3 mm <Text style={{ color: colors.primary }}>●</Text>
        </Text>
        <Text style={styles.legendText}>
          4–5 mm <Text style={{ color: colors.warning }}>●</Text>
        </Text>
        <Text style={styles.legendText}>
          6+ mm <Text style={{ color: colors.danger }}>●</Text>
        </Text>
      </View>
      <Pressable
        onPress={() => onSave?.(selected, current)}
        style={styles.save}
      >
        <Text style={styles.saveText}>Save Measurements</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusLg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    fontFamily: typography.family.bold,
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 1,
  },
  title: {
    fontFamily: typography.family.bold,
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginTop: 3,
  },
  sub: {
    fontFamily: typography.family.regular,
    fontSize: 11,
    color: colors.body,
    marginTop: 2,
  },
  toothRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 12 },
  tooth: {
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.greySoft,
  },
  toothActive: { backgroundColor: colors.primary },
  toothText: { fontSize: 9, color: colors.body, fontWeight: "700" },
  toothTextActive: { color: colors.white },
  grid: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  cell: { alignItems: "center" },
  point: { fontSize: 9, color: colors.primary, fontWeight: "800" },
  input: {
    width: 40,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    textAlign: "center",
    color: colors.text,
    backgroundColor: colors.white,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  legendText: { fontSize: 9, color: colors.body },
  save: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: { fontSize: 12, fontWeight: "800", color: colors.white },
});
