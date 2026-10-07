import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme';
export function BottomTabBar({items,active,onChange}) {
 return <View style={styles.bar}>{items.map(item=>{const selected=item.key===active;return <Pressable key={item.key} onPress={()=>onChange(item.key)} style={styles.item}>
   <Feather name={item.icon} size={20} color={selected?colors.primary:colors.muted}/>
   <Text style={[styles.label,selected&&styles.active]}>{item.label}</Text>
 </Pressable>})}</View>;
}
const styles=StyleSheet.create({bar:{height:76,backgroundColor:colors.white,borderTopWidth:1,borderTopColor:colors.border,flexDirection:'row',paddingTop:7,paddingBottom:5},item:{flex:1,alignItems:'center',justifyContent:'center'},label:{marginTop:4,fontFamily:typography.family.medium,fontSize:10,color:colors.muted},active:{color:colors.primary,fontWeight:'800'}});
