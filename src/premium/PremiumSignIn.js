import React, { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Eye, EyeOff, Plus } from 'lucide-react-native';
import { PREMIUM as P } from './theme';

export default function PremiumSignIn({
  mode = 'patient',
  onSubmit,
  onInvite,
  busy = false,
  stage = '',
  error = '',
  errorCode = '',
  onRetry,
}) {
  const doctor = mode === 'doctor';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const title = doctor ? 'Doctor sign-in' : 'Welcome back';
  const subtitle = doctor
    ? 'Access your schedule, patients and records.'
    : 'Sign in to manage your visits, view your reports and ask the Dental AI.';
  const submit = () => onSubmit?.({ email: email.trim(), password });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={[P.colors.deep, P.colors.ink, P.colors.sky]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={styles.glow} />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <LinearGradient colors={[P.colors.teal,P.colors.sky]} style={styles.logoTile}>
              <View style={styles.toothMark}><View style={styles.toothTop}/><View style={styles.toothStem}/><Plus color="#FFFFFF" size={21} strokeWidth={3} style={styles.plus}/></View>
            </LinearGradient>
            <Text style={styles.brandName}>Dr Pranali</Text>
            <Text style={styles.brandClinic}>DENTAL CLINIC</Text>
            <Text style={styles.tagline}>{doctor ? 'Care with precision. Progress with confidence.' : 'Healthy smiles, happier lives'}</Text>
            {doctor ? <Text style={styles.portal}>DOCTOR PORTAL</Text> : null}
          </View>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Text style={styles.sheetSubtitle}>{subtitle}</Text>
            <View style={styles.field}>
              <Text style={styles.label}>{doctor ? 'CLINIC EMAIL' : 'EMAIL OR USERNAME'}</Text>
              <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="Enter your email" placeholderTextColor={P.colors.quiet} style={styles.input} editable={!busy} returnKeyType="next" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordLine}>
                <TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete="password" placeholder="Enter your password" placeholderTextColor={P.colors.quiet} style={[styles.input,{flex:1}]} editable={!busy} onSubmitEditing={submit} returnKeyType="go" />
                <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={()=>setShowPassword(v=>!v)} style={styles.eye}>{showPassword ? <EyeOff color={P.colors.quiet} size={20}/> : <Eye color={P.colors.quiet} size={20}/>}</Pressable>
              </View>
            </View>
            {busy ? <View style={styles.stageRow}><ActivityIndicator color={P.colors.sky}/><Text style={styles.stageText}>{stage || 'Signing in…'}</Text></View> : null}
            {error ? <View style={styles.errorBox}><Text style={styles.errorTitle}>Unable to sign in</Text><Text style={styles.errorText}>{error}</Text>{errorCode ? <Text style={styles.errorCode}>Error code: {errorCode}</Text> : null}{onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable> : null}</View> : null}
            <Pressable accessibilityRole="button" disabled={busy || !email.trim() || !password} onPress={submit} style={[styles.submit,(busy || !email.trim() || !password) && styles.disabled]}><Text style={styles.submitText}>{busy ? 'Please wait…' : doctor ? 'Sign in to Doctor Portal' : 'Sign in'}</Text><Sparkles color="#FFFFFF" size={18}/></Pressable>
            {!doctor ? <Pressable accessibilityRole="link" onPress={onInvite} style={styles.invite}><Text style={styles.inviteText}>Have a clinic invite code? Enter it</Text></Pressable> : null}
            <Text style={styles.terms}>By continuing you agree to the Terms and Privacy Policy.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:P.colors.deep},safe:{flex:1},content:{flexGrow:1,justifyContent:'space-between',paddingHorizontal:20,paddingTop:24,paddingBottom:20,gap:24},glow:{position:'absolute',width:250,height:250,borderRadius:125,top:-65,right:-60,backgroundColor:'rgba(0,198,200,0.42)'},brand:{alignItems:'center',paddingTop:8},logoTile:{width:76,height:76,borderRadius:24,alignItems:'center',justifyContent:'center',marginBottom:16},toothMark:{width:46,height:42,alignItems:'center',justifyContent:'center'},toothTop:{width:35,height:26,borderWidth:3,borderColor:'#FFFFFF',borderRadius:18,borderBottomLeftRadius:10,borderBottomRightRadius:10},toothStem:{position:'absolute',bottom:0,width:18,height:18,borderLeftWidth:3,borderRightWidth:3,borderBottomWidth:3,borderColor:'#FFFFFF',borderBottomLeftRadius:8,borderBottomRightRadius:8},plus:{position:'absolute',right:-8,top:-5},brandName:{fontSize:36,fontWeight:'700',letterSpacing:-.7,color:'#FFFFFF'},brandClinic:{fontSize:12,fontWeight:'700',letterSpacing:4,color:P.colors.logoLabel,marginTop:1},tagline:{fontSize:14,color:'#E8F4FF',marginTop:12,textAlign:'center'},portal:{fontSize:11,fontWeight:'800',letterSpacing:2,color:P.colors.heroLabel,marginTop:12},sheet:{backgroundColor:'#FFFFFF',borderRadius:32,padding:24,gap:16},sheetTitle:{fontSize:26,fontWeight:'700',letterSpacing:-.5,color:P.colors.ink},sheetSubtitle:{fontSize:14,lineHeight:21,color:P.colors.muted,marginTop:-8},field:{gap:7},label:{fontSize:11,fontWeight:'800',letterSpacing:1.6,color:P.colors.link},input:{minHeight:50,borderRadius:16,borderWidth:1,borderColor:P.colors.hairline,backgroundColor:P.colors.ground,paddingHorizontal:15,fontSize:15,color:P.colors.ink},passwordLine:{flexDirection:'row',alignItems:'center'},eye:{width:48,height:48,alignItems:'center',justifyContent:'center'},submit:{minHeight:54,borderRadius:999,backgroundColor:P.colors.deep,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},submitText:{fontSize:15,fontWeight:'700',color:'#FFFFFF'},disabled:{opacity:.55},invite:{minHeight:44,alignItems:'center',justifyContent:'center'},inviteText:{fontSize:14,fontWeight:'700',color:P.colors.link},terms:{fontSize:11,lineHeight:17,color:P.colors.quiet,textAlign:'center'},stageRow:{flexDirection:'row',alignItems:'center',gap:10},stageText:{fontSize:13,color:P.colors.muted},errorBox:{padding:12,borderRadius:14,borderWidth:1,borderColor:'#F1C9C9',backgroundColor:'#FFF8F8',gap:5},errorTitle:{fontSize:14,fontWeight:'700',color:'#8B2020'},errorText:{fontSize:13,color:'#6B3030',lineHeight:18},errorCode:{fontSize:11,color:'#8B2020'},retry:{alignSelf:'flex-start',paddingVertical:8,paddingHorizontal:14,borderRadius:999,backgroundColor:'#FBE8E8'},retryText:{fontSize:13,fontWeight:'700',color:'#8B2020'}}
);
