import React from "react";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "../../theme";

const ASSETS = {
  "patient_hero_3d.png": require("../../assets/images/patient_hero_3d.png"),
  "patient_care_3d.png": require("../../assets/images/patient_care_3d.png"),
};

export function VisualPlaceholder({ filename, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={ASSETS[filename]}
        style={styles.image}
        contentFit="contain"
        transition={150}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: spacing.radiusXl,
    borderWidth: 1,
    borderColor: colors.blue200,
    overflow: "hidden",
    backgroundColor: colors.softBlue,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
