import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { palette } from "../theme/palette";

type GlassPanelProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
};

export function GlassPanel({ children, style, blurIntensity = 28 }: GlassPanelProps) {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: palette.stroke,
    overflow: "hidden",
    backgroundColor: palette.glassBlue,
  },
  inner: {
    padding: 18,
  },
});
