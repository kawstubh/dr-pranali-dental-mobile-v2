import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg,{Circle,Path,Text as SvgText} from 'react-native-svg';
import { colors, spacing, typography } from '../../theme';
const adult=['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
const lower=['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
const child=['55','54','53','52','51','61','62','63','64','65'];
const childLower=['85','84','83','82','81','71','72','73','74','75'];
export const ToothChart=memo(function ToothChart({onSelect}) {
 const [mode,setMode]=useState('adult'); const [selected,setSelected]=useState('46');
 const top=mode==='adult'?adult:child,bottom=mode==='adult'?lower:childLower;
 const points=useMemo(()=>top.map((n,i)=>{const a=Math.PI+(Math.PI*(i/(top.length-1)));return {n,x:150+105*Math.cos(a),y:105+48*Math.sin(a)}}),[top]);
 const points2=useMemo(()=>bottom.map((n,i)=>{const a=Math.PI*(i/(bottom.length-1));return {n,x:150+105*Math.cos(a),y:150+48*Math.sin(a)}}),[bottom]);
 const select=n=>{setSelected(n);onSelect?.(n)};
 return <View style={styles.card}>
  <View style={styles.toggle}><Pressable onPress={()=>setMode('adult')} style={[styles.option,mode==='adult'&&styles.active]}><Text style={[styles.optionText,mode==='adult'&&styles.activeText]}>Adult</Text></Pressable><Pressable onPress={()=>setMode('child')} style={[styles.option,mode==='child'&&styles.active]}><Text style={[styles.optionText,mode==='child'&&styles.activeText]}>Children</Text></Pressable></View>
  <View style={styles.chart}><Svg width="300" height="240" viewBox="0 0 300 240"><Path d="M45 108 Q150 15 255 108" fill="none" stroke={colors.blue100} strokeWidth="3"/><Path d="M45 150 Q150 225 255 150" fill="none" stroke={colors.blue100} strokeWidth="3"/>{points.map(p=><Circle key={p.n} cx={p.x} cy={p.y} r={selected===p.n?13:10} fill={selected===p.n?colors.primary:colors.successSoft} stroke={selected===p.n?colors.primary:colors.success} strokeWidth="2"/>) }{points2.map(p=><Circle key={p.n} cx={p.x} cy={p.y} r={selected===p.n?13:10} fill={selected===p.n?colors.primary:colors.successSoft} stroke={selected===p.n?colors.primary:colors.success} strokeWidth="2"/>) }{points.map(p=><SvgText key={'t'+p.n} x={p.x} y={p.y+4} textAnchor="middle" fontSize="7" fill={colors.text}>{p.n}</SvgText>)}{points2.map(p=><SvgText key={'b'+p.n} x={p.x} y={p.y+4} textAnchor="middle" fontSize="7" fill={colors.text}>{p.n}</SvgText>)}</Svg></View>
  <View style={styles.legend}>{[['Healthy',colors.success],['Cavity',colors.danger],['Filled',colors.primary],['RCT',colors.warning],['Missing',colors.muted]].map(([label,color])=><View key={label} style={styles.legendItem}><View style={[styles.dot,{backgroundColor:color}]}/><Text style={styles.legendText}>{label}</Text></View>)}</View>
  <Text style={styles.selected}>Selected tooth: {selected}</Text>
 </View>
});
const styles=StyleSheet.create({card:{backgroundColor:colors.white,borderRadius:spacing.radiusLg,padding:14,borderWidth:1,borderColor:colors.border},toggle:{flexDirection:'row',borderWidth:1,borderColor:colors.border,borderRadius:spacing.radiusMd,overflow:'hidden'},option:{flex:1,paddingVertical:9,alignItems:'center'},active:{backgroundColor:colors.primary},optionText:{fontFamily:typography.family.medium,fontSize:12,color:colors.body},activeText:{color:colors.white,fontWeight:'800'},chart:{alignItems:'center',marginTop:8},legend:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:4},legendItem:{flexDirection:'row',alignItems:'center',gap:4},dot:{width:8,height:8,borderRadius:4},legendText:{fontFamily:typography.family.medium,fontSize:9,color:colors.body},selected:{fontFamily:typography.family.bold,fontSize:12,fontWeight:'800',color:colors.text,marginTop:12}});
