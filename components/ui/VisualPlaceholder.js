import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../theme';

export function VisualPlaceholder({filename, label='3D visual', style}) {
  return <LinearGradient colors={[colors.white, colors.softBlue]} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.wrap, style]}>
    <View style={styles.inner}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.file}>/assets/images/{filename}</Text>
      <Text style={styles.note}>Add the approved 3D asset here</Text>
    </View>
  </LinearGradient>;
}
const styles=StyleSheet.create({
 wrap:{borderRadius:spacing.radiusXl,borderWidth:1,borderColor:colors.blue200,overflow:'hidden'},
 inner:{flex:1,alignItems:'center',justifyContent:'center',padding:16},
 label:{fontFamily:typography.family.bold,fontSize:12,color:colors.primary,fontWeight:'800'},
 file:{fontFamily:typography.family.medium,fontSize:10,color:colors.text,textAlign:'center',marginTop:7},
 note:{fontFamily:typography.family.regular,fontSize:9,color:colors.muted,textAlign:'center',marginTop:4},
});
