import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
export function Header({title,onBack,rightIcon='bell',onRight}) {
 return <View style={styles.row}>
   <Pressable onPress={onBack} style={styles.icon}>{onBack?<Feather name="arrow-left" size={20} color={colors.text}/>:null}</Pressable>
   <Text style={styles.title}>{title}</Text>
   <Pressable onPress={onRight} style={styles.icon}><Feather name={rightIcon} size={19} color={colors.text}/></Pressable>
 </View>;
}
const styles=StyleSheet.create({row:{height:54,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},icon:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:colors.white},title:{fontFamily:typography.family.bold,fontSize:18,fontWeight:'800',color:colors.text}});
