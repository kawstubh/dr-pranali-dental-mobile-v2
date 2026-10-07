import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
export function Input({icon='search',style,...props}) {
 return <View style={[styles.wrap,style]}><Feather name={icon} size={18} color={colors.muted}/><TextInput {...props} style={styles.input} placeholderTextColor={colors.muted}/></View>;
}
const styles=StyleSheet.create({
 wrap:{height:50,backgroundColor:colors.white,borderWidth:1,borderColor:colors.border,borderRadius:spacing.radiusMd,flexDirection:'row',alignItems:'center',paddingHorizontal:14},
 input:{flex:1,marginLeft:10,color:colors.text,fontFamily:typography.family.regular,fontSize:14},
});
