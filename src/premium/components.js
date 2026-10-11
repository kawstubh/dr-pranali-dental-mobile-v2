import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PREMIUM as P } from './theme';

export function Screen({ children, style, scroll = true }) {
  const content = <View style={[styles.screen, style]}>{children}</View>;
  return scroll ? <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>{content}</ScrollView> : <View style={styles.root}>{content}</View>;
}
export function Header({ title, eyebrow, right }) {
  return <View style={styles.header}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<View style={styles.headerLine}><Text style={styles.headerTitle}>{title}</Text>{right}</View></View>;
}
export function HeroCard({ children, style }) {
  return <View style={[styles.hero, style]}>{children}</View>;
}
export function ListRow({ title, subtitle, icon, right, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}><View style={styles.rowIcon}>{icon}</View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text>{subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}</View>{right || <Text style={styles.chevron}>›</Text>}</Pressable>;
}
export function PrimaryButton({ title, onPress, disabled = false, icon }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({pressed})=>[styles.primary, disabled && styles.disabled, pressed && !disabled && {opacity:.85}]}>{icon}{<Text style={styles.primaryText}>{title}</Text>}</Pressable>;
}
export function GhostButton({ title, onPress, icon }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.ghost}>{icon}<Text style={styles.ghostText}>{title}</Text></Pressable>;
}
export function StatusDot({ label, color = '#1E9E68' }) {
  return <View style={styles.status}><View style={[styles.dot,{backgroundColor:color}]}/><Text style={styles.statusText}>{label}</Text></View>;
}
export function SectionLabel({ children }) { return <Text style={styles.sectionLabel}>{children}</Text>; }

const patientTabs = [
  {key:'Home', label:'Home', icon:'⌂'},
  {key:'Visits', label:'Visits', icon:'▦'},
  {key:'Services', label:'Services', icon:'✚'},
  {key:'Reports', label:'Reports', icon:'▤'},
  {key:'Profile', label:'Profile', icon:'●'},
];
const doctorTabs = [
  {key:'Home', label:'Home', icon:'⌂'},
  {key:'Patients', label:'Patients', icon:'♙'},
  {key:'Calendar', label:'Calendar', icon:'▦'},
  {key:'Reports', label:'Reports', icon:'▤'},
  {key:'More', label:'Clinical', icon:'✦'},
];
export function PillTabBar({ active = 'Home', onChange, mode = 'patient' }) {
  const tabs = mode === 'doctor' ? doctorTabs : patientTabs;
  return <View style={styles.tabDock}>{tabs.map(({key,label,icon}) => {
    const selected = key === active;
    return <Pressable key={key} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} onPress={()=>onChange?.(key)} style={[styles.tab, selected && styles.tabActive]}><Text style={[styles.tabIcon,selected&&styles.tabIconActive]}>{icon}</Text>{selected ? <Text style={styles.tabLabel}>{label}</Text> : null}</Pressable>;
  })}</View>;
}
export function DentalAIAssistantRow({ onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.aiRow}><View style={styles.aiIcon}><Text style={styles.aiGlyph}>✦</Text></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Dental AI assistant</Text><Text style={styles.rowSub}>Ask a question about your care</Text></View><Text style={styles.chevron}>›</Text></Pressable>;
}
const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:P.colors.ground}, scroll:{flexGrow:1}, screen:{flex:1,paddingHorizontal:P.spacing.screen,paddingTop:18,paddingBottom:110,gap:20},
  header:{gap:6}, eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1.6,color:P.colors.link,textTransform:'uppercase'}, headerLine:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},headerTitle:{fontSize:26,fontWeight:'700',letterSpacing:-.5,color:P.colors.ink},
  hero:{borderRadius:28,padding:24,overflow:'hidden',gap:12,backgroundColor:P.colors.deep},row:{minHeight:60,flexDirection:'row',alignItems:'center',gap:14,borderBottomWidth:1,borderBottomColor:P.colors.hairline,paddingVertical:10},rowIcon:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'#EFF7FD'},rowCopy:{flex:1,gap:3},rowTitle:{fontSize:15,fontWeight:'700',color:P.colors.ink},rowSub:{fontSize:13,color:P.colors.muted,lineHeight:18},chevron:{fontSize:26,color:P.colors.quiet,fontWeight:'300'},
  primary:{minHeight:52,borderRadius:999,backgroundColor:P.colors.ink,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,paddingHorizontal:22},primaryText:{fontSize:15,fontWeight:'700',color:'#FFFFFF'},disabled:{opacity:.5},ghost:{minHeight:48,borderRadius:999,borderWidth:1,borderColor:P.colors.hairline,backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,paddingHorizontal:18},ghostText:{fontSize:15,fontWeight:'700',color:P.colors.ink},status:{flexDirection:'row',alignItems:'center',gap:7},dot:{width:7,height:7,borderRadius:4},statusText:{fontSize:13,color:P.colors.muted},sectionLabel:{fontSize:11,fontWeight:'800',letterSpacing:1.6,color:P.colors.link,textTransform:'uppercase'},
  tabDock:{position:'absolute',bottom:18,left:20,right:20,height:64,borderRadius:32,borderWidth:1,borderColor:P.colors.hairline,backgroundColor:'#FFFFFF',elevation:9,shadowColor:'#0C3B82',shadowOpacity:.12,shadowRadius:18,shadowOffset:{width:0,height:6},flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:7},tab:{height:48,minWidth:48,paddingHorizontal:13,borderRadius:24,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7},tabActive:{backgroundColor:P.colors.deep},tabIcon:{fontSize:19,color:P.colors.quiet},tabIconActive:{color:'#FFFFFF'},tabLabel:{color:'#FFFFFF',fontSize:12,fontWeight:'700'},aiRow:{minHeight:72,padding:14,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:P.colors.hairline,borderRadius:20,flexDirection:'row',alignItems:'center',gap:12},aiIcon:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:P.colors.sky},aiGlyph:{fontSize:23,color:'#FFFFFF'}
});
