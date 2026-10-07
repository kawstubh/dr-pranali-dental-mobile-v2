import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
export function StatCard({value,label,icon}) { return <View style={styles.card}><View style={styles.icon}>{icon}</View><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>; }
const styles=StyleSheet.create({card:{flex:1,minHeight:94,backgroundColor:colors.white,borderRadius:spacing.radiusMd,borderWidth:1,borderColor:colors.border,padding:12},icon:{alignSelf:'flex-start',color:colors.primary},value:{fontFamily:typography.family.bold,fontSize:22,fontWeight:'800',color:colors.text,marginTop:6},label:{fontFamily:typography.family.medium,fontSize:10,color:colors.muted,marginTop:2}});
