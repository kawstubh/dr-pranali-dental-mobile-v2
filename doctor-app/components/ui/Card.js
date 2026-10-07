import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, shadows } from '../../theme';
export function Card({children,style}) { return <View style={[styles.card,style]}>{children}</View>; }
const styles=StyleSheet.create({card:{backgroundColor:colors.card,borderRadius:spacing.radiusLg,borderWidth:1,borderColor:colors.border,padding:spacing.card,...shadows.card}});
