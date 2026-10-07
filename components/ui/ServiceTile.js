import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
export function ServiceTile({title,subtitle,icon='smile',onPress,compact=false}) {
 return <Pressable onPress={onPress} style={[styles.tile,compact&&styles.compact]}>
   <View style={styles.icon}><Feather name={icon} size={18} color={colors.primary}/></View>
   <View style={styles.copy}><Text style={styles.title}>{title}</Text>{subtitle?<Text style={styles.sub}>{subtitle}</Text>:null}</View>
   {!compact?<Feather name="chevron-right" size={18} color={colors.muted}/>:null}
 </Pressable>;
}
const styles=StyleSheet.create({tile:{minHeight:66,backgroundColor:colors.white,borderRadius:spacing.radiusMd,borderWidth:1,borderColor:colors.border,padding:10,flexDirection:'row',alignItems:'center',marginBottom:8},compact:{width:'23.5%',minHeight:82,flexDirection:'column',justifyContent:'center',padding:8},icon:{width:38,height:38,borderRadius:12,backgroundColor:colors.softBlue,alignItems:'center',justifyContent:'center'},copy:{flex:1,marginLeft:10},title:{fontFamily:typography.family.bold,fontSize:12,fontWeight:'800',color:colors.text},sub:{fontFamily:typography.family.regular,fontSize:10,color:colors.body,marginTop:2}});
