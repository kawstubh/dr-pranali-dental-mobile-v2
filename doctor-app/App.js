import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Linking, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { requestDoctorOtp, verifyDoctorOtp, listAppointments, listPatients, updateAppointment, getHealth, getDentalChart, saveDentalChartEntry, getPeriodontogram, savePeriodontogramEntry } from './src/api/doctorApi';

const clinicLogo = require('./assets/dr-pranali-branded-logo.png');

const C = {
  navy:'#082B49', blue:'#1677D2', bg:'#F5F9FC', white:'#FFF',
  text:'#18334D', muted:'#6B7D8F', border:'#DCE8F4',
  green:'#1DAA68', amber:'#D98900', red:'#D64B4B'
};

const STATUSES = ['requested','confirmed','scheduled','completed','cancelled','rescheduled','no_show'];

function statusLabel(s){ return (s || '').replace('_',' ').replace(/^./, x => x.toUpperCase()); }

function Login({ onLogin }) {
  const [phone,setPhone]=useState('');
  const [otp,setOtp]=useState('');
  const [challenge,setChallenge]=useState(null);
  const [busy,setBusy]=useState(false);
  const sendOtp=async()=>{
    if(phone.replace(/\D/g,'').length!==10){Alert.alert('Doctor login','Enter the registered 10-digit mobile number.');return;}
    setBusy(true);
    try { const result=await requestDoctorOtp(phone); setChallenge(result.challenge_id); Alert.alert('OTP sent','Check the registered mobile for your 6-digit OTP.'); }
    catch(e){ Alert.alert('OTP unavailable', e.message || 'Could not send OTP.'); }
    finally { setBusy(false); }
  };
  const verify=async()=>{
    if(!challenge || otp.trim().length!==6){Alert.alert('Verify OTP','Enter the 6-digit OTP.');return;}
    setBusy(true);
    try { const result=await verifyDoctorOtp(phone,challenge,otp); onLogin(result.access_token); }
    catch(e){ Alert.alert('Verification failed', e.message || 'The OTP could not be verified.'); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark"/>
    <ScrollView contentContainerStyle={styles.loginWrap}>
      <Image source={clinicLogo} style={styles.loginLogo} resizeMode="contain" />
      <Text style={styles.kicker}>DR. PRANALI DENTAL CLINIC</Text>
      <Text style={styles.loginTitle}>Doctor Console</Text>
      <Text style={styles.loginSub}>Secure OTP access for appointments, patients and the dental intelligence layer.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Registered mobile number</Text>
        <TextInput value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" placeholderTextColor="#93A3B2" keyboardType="phone-pad" maxLength={10} style={styles.input}/>
        {!challenge ? (
          <Pressable disabled={busy} onPress={sendOtp} style={styles.primary}><Text style={styles.primaryText}>{busy?'Sending OTP...':'Send OTP'}</Text></Pressable>
        ) : (
          <>
            <Text style={[styles.label,{marginTop:12}]}>6-digit OTP</Text>
            <TextInput value={otp} onChangeText={setOtp} placeholder="Enter OTP" placeholderTextColor="#93A3B2" keyboardType="number-pad" maxLength={6} style={styles.input}/>
            <Pressable disabled={busy} onPress={verify} style={styles.primary}><Text style={styles.primaryText}>{busy?'Verifying...':'Verify & Open Dashboard'}</Text></Pressable>
            <Pressable disabled={busy} onPress={sendOtp} style={[styles.action,{marginTop:8}]}><Text style={styles.actionText}>Resend OTP</Text></Pressable>
          </>
        )}
        <Text style={styles.help}>Only the registered clinic mobile number can access this doctor workspace.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function AppointmentCard({ item, token, onChanged }) {
  const [busy,setBusy]=useState(false);
  const change=async(status)=>{
    setBusy(true);
    try { await updateAppointment(token,item.id,{status}); onChanged(); }
    catch(e){Alert.alert('Update failed',e.message||'Could not update appointment.');}
    finally{setBusy(false);}
  };
  const call=()=>item.patient_phone && Linking.openURL('tel:'+item.patient_phone);
  const whatsapp=()=>item.patient_phone && Linking.openURL('https://wa.me/'+String(item.patient_phone).replace(/\D/g,''));
  return <View style={styles.apptCard}>
    <View style={styles.rowBetween}>
      <View style={{flex:1}}><Text style={styles.patient}>{item.patient_name || 'Patient'}</Text><Text style={styles.phone}>{item.patient_phone || 'No phone'}</Text></View>
      <View style={[styles.badge, item.status==='requested'&&{backgroundColor:'#FFF3D9'}, item.status==='confirmed'&&{backgroundColor:'#E5F8EE'}, item.status==='cancelled'&&{backgroundColor:'#FCEAEA'}]}>
        <Text style={styles.badgeText}>{statusLabel(item.status)}</Text>
      </View>
    </View>
    <Text style={styles.apptDate}>{item.starts_at}</Text>
    <Text style={styles.reason}>{item.treatment_type}</Text>
    {!!item.note && <Text style={styles.note}>{item.note}</Text>}
    <View style={styles.actions}>
      <Pressable onPress={call} style={styles.action}><Text style={styles.actionText}>Call</Text></Pressable>
      <Pressable onPress={whatsapp} style={styles.action}><Text style={styles.actionText}>WhatsApp</Text></Pressable>
      {item.status==='requested' && <Pressable disabled={busy} onPress={()=>change('confirmed')} style={[styles.action,styles.confirm]}><Text style={styles.confirmText}>{busy?'…':'Confirm'}</Text></Pressable>}
      {item.status!=='completed' && item.status!=='cancelled' && item.status!=='no_show' && <Pressable disabled={busy} onPress={()=>change('completed')} style={styles.action}><Text style={styles.actionText}>Complete</Text></Pressable>}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingTop:8}}>
      {STATUSES.filter(s=>s!==item.status).map(s=><Pressable key={s} onPress={()=>change(s)} style={styles.statusChip}><Text style={styles.statusChipText}>{statusLabel(s)}</Text></Pressable>)}
    </ScrollView>
  </View>;
}


const ADULT_UPPER = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
const ADULT_LOWER = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
const CHILD_UPPER = ['55','54','53','52','51','61','62','63','64','65'];
const CHILD_LOWER = ['85','84','83','82','81','71','72','73','74','75'];

function Tooth({ number, state, onPress, upper, index, total }) {
  const curve = Math.abs((total - 1) / 2 - index);
  const palette = state === 'healthy'
    ? { fill:'#DFF6E9', edge:'#59C989', mark:'#35B878' }
    : state === 'attention'
      ? { fill:'#FFF3D8', edge:'#E7B54A', mark:'#D99118' }
      : state === 'treated'
        ? { fill:'#E8F1FF', edge:'#76A8E8', mark:'#3978C7' }
        : { fill:'#F2F4F7', edge:'#C9D1DA', mark:'#A8B2BD' };

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toothItem,
        { transform:[{ translateY: curve * 2.4 * (upper ? 1 : -1) }] }
      ]}
    >
      <View style={[
        styles.toothShape,
        {
          backgroundColor:palette.fill,
          borderColor:palette.edge,
          borderRadius:number.endsWith('1') || number.endsWith('2') ? 14 : 11,
          transform:[{ scaleY: upper ? 1 : 0.96 }]
        }
      ]}>
        <View style={[styles.toothCusp, { backgroundColor:palette.mark }]} />
        <View style={[styles.toothRoot, { borderColor:palette.edge, top: upper ? 23 : 25 }]} />
      </View>
      <Text style={[styles.toothNumber, state === 'attention' && {color:'#B87908'}]}>{number}</Text>
    </Pressable>
  );
}

function DentalChart({ token, patientId, patientName='Patient' }) {
  const [arch, setArch] = useState('adult');
  const [selected, setSelected] = useState('46');
  const [states, setStates] = useState({46:'attention', 21:'treated', 11:'healthy', 36:'treated'});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    if (!patientId) return undefined;
    setLoaded(false);
    getDentalChart(token, patientId).then(entries => {
      if (!active) return;
      const next = {};
      (entries || []).forEach(entry => { next[entry.tooth_fdi] = entry.status; });
      setStates(prev => ({ ...prev, ...next }));
    }).catch(() => {}).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [patientId, token]);
  const upper = arch === 'adult' ? ADULT_UPPER : CHILD_UPPER;
  const lower = arch === 'adult' ? ADULT_LOWER : CHILD_LOWER;
  const currentState = states[selected] || 'healthy';

  const cycleState = async () => {
    if (!patientId || saving) return;
    const order=['healthy','attention','treated','missing'];
    const next=order[(order.indexOf(currentState)+1)%order.length];
    setStates(prev=>({...prev,[selected]:next}));
    setSaving(true);
    try {
      await saveDentalChartEntry(token, patientId, { tooth_fdi:selected, status:next, note:'' });
    } catch (e) {
      setStates(prev=>({...prev,[selected]:currentState}));
      Alert.alert('Dental chart', e.message || 'Could not save tooth status.');
    } finally { setSaving(false); }
  };

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={{flex:1}}>
          <Text style={styles.chartEyebrow}>CLINICAL ODONTOGRAM</Text>
          <Text style={styles.chartTitle}>Dental chart</Text>
          <Text style={styles.chartPatient}>{patientName} • {loaded ? 'Synced clinical record' : 'Loading clinical record'}</Text>
        </View>
        <View style={styles.chartLegendDot}/>
      </View>

      <View style={styles.archSwitch}>
        <Pressable onPress={()=>setArch('adult')} style={[styles.archOption, arch==='adult'&&styles.archOptionActive]}>
          <Text style={[styles.archText, arch==='adult'&&styles.archTextActive]}>Adult</Text>
        </Pressable>
        <Pressable onPress={()=>setArch('child')} style={[styles.archOption, arch==='child'&&styles.archOptionActive]}>
          <Text style={[styles.archText, arch==='child'&&styles.archTextActive]}>Children</Text>
        </Pressable>
      </View>

      <View style={styles.mouthFrame}>
        <Text style={styles.sideLabel}>RIGHT</Text>
        <View style={styles.teethArc}>
          {upper.map((n,i)=><Tooth key={n} number={n} state={states[n]||'healthy'} upper index={i} total={upper.length} onPress={()=>setSelected(n)}/>)}
        </View>
        <View style={styles.mouthCenter}><View style={styles.mouthLine}/><Text style={styles.mouthHint}>UPPER</Text></View>
        <View style={styles.teethArc}>
          {lower.map((n,i)=><Tooth key={n} number={n} state={states[n]||'healthy'} index={i} total={lower.length} onPress={()=>setSelected(n)}/>)}
        </View>
        <Text style={styles.sideLabel}>LEFT</Text>
      </View>

      <View style={styles.selectedTooth}>
        <View style={styles.selectedToothIcon}><Text style={styles.selectedToothIconText}>{selected}</Text></View>
        <View style={{flex:1}}>
          <Text style={styles.selectedLabel}>Tooth {selected}</Text>
          <Text style={styles.selectedStatus}>Status: {currentState === 'attention' ? 'Needs attention' : currentState === 'treated' ? 'Treatment completed' : currentState === 'missing' ? 'Missing / extracted' : 'Healthy'}</Text>
        </View>
        <Pressable disabled={!patientId || saving} onPress={cycleState} style={[styles.changeStatus, saving && {opacity:0.5}]}><Text style={styles.changeStatusText}>{saving ? 'Saving…' : 'Update'}</Text></Pressable>
      </View>

      <View style={styles.chartLegend}>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#59C989'}]}/><Text>Healthy</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#E7B54A'}]}/><Text>Attention</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#76A8E8'}]}/><Text>Treated</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#C9D1DA'}]}/><Text>Missing</Text></View>
      </View>
    </View>
  );
}


function Periodontogram({ token, patientId, patientName='Patient' }) {
  const teeth = ADULT_UPPER.concat(ADULT_LOWER);
  const points = ['MB','B','DB','ML','L','DL'];
  const [selected,setSelected]=useState('46');
  const [records,setRecords]=useState({});
  const [saving,setSaving]=useState(false);
  useEffect(()=>{ let active=true; if(!patientId)return; getPeriodontogram(token,patientId).then(rows=>{ if(!active)return; const next={}; (rows||[]).forEach(r=>next[r.tooth_fdi]=r.measurements||{}); setRecords(next); }).catch(()=>{}); return()=>{active=false}; },[patientId,token]);
  const current=records[selected]||{};
  const update=(key,value)=>setRecords(prev=>({...prev,[selected]:{...(prev[selected]||{}),[key]:value}}));
  const save=async()=>{ if(!patientId||saving)return; setSaving(true); try{await savePeriodontogramEntry(token,patientId,{tooth_fdi:selected,measurements:current,note:''}); Alert.alert('Periodontogram','Measurements saved for tooth '+selected+'.');}catch(e){Alert.alert('Periodontogram',e.message||'Could not save measurements.')}finally{setSaving(false)} };
  return <View style={styles.chartCard}>
    <View style={styles.chartHeader}><View style={{flex:1}}><Text style={styles.chartEyebrow}>CLINICAL PERIODONTICS</Text><Text style={styles.chartTitle}>Periodontogram</Text><Text style={styles.chartPatient}>{patientName} • 6-point periodontal probing</Text></View><View style={[styles.chartLegendDot,{backgroundColor:'#D98900'}]}/></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingVertical:12}}>{teeth.map(n=><Pressable key={n} onPress={()=>setSelected(n)} style={[styles.perioTooth,selected===n&&styles.perioToothActive]}><Text style={[styles.perioToothText,selected===n&&styles.perioToothTextActive]}>{n}</Text></Pressable>)}</ScrollView>
    <View style={styles.perioSelected}><Text style={styles.selectedLabel}>Tooth {selected}</Text><Text style={styles.selectedStatus}>Probing depths (mm) — MB · B · DB · ML · L · DL</Text></View>
    <View style={styles.perioGrid}>{points.map(p=><View key={p} style={styles.perioCell}><Text style={styles.perioPoint}>{p}</Text><TextInput value={String(current[p]??'')} onChangeText={v=>update(p,v.replace(/[^0-9]/g,''))} keyboardType="number-pad" maxLength={2} placeholder="0" placeholderTextColor="#AAB5BF" style={styles.perioInput}/></View>)}</View>
    <View style={styles.perioMeta}>
      {['recession','CAL'].map(k=><View key={k} style={styles.metaField}><Text style={styles.metaLabel}>{k==='recession'?'Recession':'CAL'} (mm)</Text><TextInput value={String(current[k]??'')} onChangeText={v=>update(k,v.replace(/[^0-9]/g,''))} keyboardType="number-pad" style={styles.metaInput}/></View>)}
      {['BOP','Mobility','Furcation','Plaque','Calculus'].map(k=><Pressable key={k} onPress={()=>update(k,current[k]?'':'Yes')} style={[styles.perioFlag,current[k]&&styles.perioFlagActive]}><Text style={[styles.perioFlagText,current[k]&&styles.perioFlagTextActive]}>{k}{current[k]?' ✓':''}</Text></Pressable>)}
    </View>
    <Pressable disabled={saving||!patientId} onPress={save} style={[styles.primary,{marginTop:12,opacity:saving?0.6:1}]}><Text style={styles.primaryText}>{saving?'Saving…':'Save Periodontogram'}</Text></Pressable>
  </View>;
}

function Dashboard({ token, logout }) {
  const isDemo = token === 'demo';
  const [appointments,setAppointments]=useState([]);
  const [patients,setPatients]=useState([]);
  const [tab,setTab]=useState('Appointments');
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [apiOk,setApiOk]=useState(false);

  const load=useCallback(async()=>{
    if (isDemo) {
      setAppointments([{id:'demo-1',status:'requested',patient_name:'Demo Patient',patient_phone:'9876543210',starts_at:'2026-10-07T10:30:00+05:30',treatment_type:'Dental consultation',note:'Demo appointment'}]);
      setPatients([{id:'demo-patient',name:'Demo Patient',phone:'9876543210',age:32}]);
      setApiOk(true);
      setLoading(false); setRefreshing(false); return;
    }
    try {
      const [a,p,h]=await Promise.all([listAppointments(token),listPatients(token),getHealth()]);
      setAppointments(a||[]); setPatients(p||[]); setApiOk(h?.status==='ok');
    } catch(e) {
      setApiOk(false);
      Alert.alert('Clinic connection', e.message || 'Could not reach the dental backend.');
    } finally {setLoading(false);setRefreshing(false);}
  },[token,isDemo]);

  useEffect(()=>{load();},[load]);

  const requested=appointments.filter(a=>a.status==='requested').length;
  const confirmed=appointments.filter(a=>['confirmed','scheduled'].includes(a.status)).length;

  if(loading) return <SafeAreaView style={styles.safe}><ActivityIndicator size="large" color={C.blue} style={{marginTop:80}}/></SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark"/>
    <View style={styles.header}>
      <View><Text style={styles.headerTitle}>Dr. Pranali Dental</Text><Text style={styles.headerSub}>Doctor Console • Taloja</Text></View>
      <Pressable onPress={()=>{logout();}}><Text style={styles.logout}>Sign out</Text></Pressable>
    </View>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}}/>} contentContainerStyle={styles.content}>
      <View style={styles.hero}><View><Text style={styles.heroKicker}>CLINIC CONTROL CENTER</Text><Text style={styles.heroTitle}>Good day, Doctor</Text><Text style={styles.heroSub}>Manage today's patient flow from one place.</Text></View><View style={[styles.dot,{backgroundColor:apiOk?C.green:C.red}]}/></View>
      <View style={styles.stats}>
        <Stat n={appointments.length} t="Appointments"/><Stat n={requested} t="New Requests"/><Stat n={confirmed} t="Confirmed"/><Stat n={patients.length} t="Patients"/>
      </View>
      <View style={styles.tabs}>{['Appointments','Patients','Intelligence'].map(x=><Pressable key={x} onPress={()=>setTab(x)} style={[styles.tab,tab===x&&styles.tabActive]}><Text style={[styles.tabText,tab===x&&styles.tabTextActive]}>{x}</Text></Pressable>)}</View>
      {tab==='Appointments' && <View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Appointment Queue</Text><Pressable onPress={load}><Text style={styles.refresh}>Refresh</Text></Pressable></View>
        {appointments.length===0?<Empty text="No appointments yet."/>:appointments.map(a=><AppointmentCard key={a.id} item={a} token={token} onChanged={load}/>)}
      </View>}
      {tab==='Patients' && <View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Patients</Text><Text style={styles.patientCount}>{patients.length} records</Text></View>
        {patients.length===0?<Empty text="No patients yet. Patient bookings will appear here."/>:patients.map((p,i)=><View key={p.id} style={styles.patientCard}><View style={styles.patientTop}><View style={styles.avatar}><Text style={styles.avatarText}>{(p.name||'P').slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={styles.patient}>{p.name}</Text><Text style={styles.phone}>{p.phone||'No phone'}{p.age?' • Age '+p.age:''}</Text></View></View></View>)}
        {patients[0] ? <><DentalChart token={token} patientId={patients[0].id} patientName={patients[0].name} /><Periodontogram token={token} patientId={patients[0].id} patientName={patients[0].name} /></> : <><DentalChart token={token} patientName="Demo patient" /><Periodontogram token={token} patientName="Demo patient" /></>}
      </View>}
      {tab==='Intelligence' && <View>
        <View style={styles.intelHero}><Text style={styles.intelKicker}>AI DENTAL COMMAND CENTER</Text><Text style={styles.intelTitle}>Clinician-controlled intelligence</Text><Text style={styles.intelText}>Patient context, clinical research, treatment research, products, suppliers, practice and referrals — with human approval required.</Text></View>
        {['Patient Intelligence','Clinical Research','Treatment Research','Product & Supplier Intelligence','Practice Intelligence','Referral Intelligence'].map((x,i)=><View key={x} style={styles.intelCard}><Text style={styles.intelNum}>0{i+1}</Text><View style={{flex:1}}><Text style={styles.intelName}>{x}</Text><Text style={styles.intelSub}>Ready for authorized clinical data and evidence review.</Text></View></View>)}
      </View>}
    </ScrollView>
  </SafeAreaView>;
}

function Stat({n,t}){return <View style={styles.stat}><Text style={styles.statN}>{n}</Text><Text style={styles.statT}>{t}</Text></View>}
function Empty({text}){return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>}

export default function App(){
  const [token,setToken]=useState('demo');
  return <Dashboard token={token} logout={()=>setToken('demo')}/>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg}, loginWrap:{padding:24,paddingTop:70,flexGrow:1,justifyContent:'center'},
 loginLogo:{width:150,height:150,borderRadius:34,alignSelf:'center',marginBottom:14},
 logo:{width:82,height:82,borderRadius:24,backgroundColor:'#0B2E4F',alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:18},
 logoTooth:{fontSize:42,color:'#FFF'}, kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.2,color:C.blue,textAlign:'center'},
 loginTitle:{fontSize:34,fontWeight:'900',color:C.navy,textAlign:'center',marginTop:4},loginSub:{fontSize:14,color:C.muted,lineHeight:21,textAlign:'center',marginTop:9,marginBottom:20},
 card:{backgroundColor:C.white,borderRadius:20,borderWidth:1,borderColor:C.border,padding:18},label:{fontSize:13,fontWeight:'800',color:C.navy,marginBottom:7},input:{borderWidth:1,borderColor:C.border,borderRadius:12,padding:13,fontSize:15,color:C.text,backgroundColor:'#F9FBFD'},primary:{backgroundColor:C.blue,borderRadius:13,padding:15,alignItems:'center',marginTop:13},primaryText:{color:C.white,fontWeight:'900',fontSize:15},help:{fontSize:11,color:C.muted,lineHeight:17,marginTop:10},
 header:{backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.border,padding:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},headerTitle:{fontSize:20,fontWeight:'900',color:C.navy},headerSub:{fontSize:12,color:C.muted,marginTop:2},logout:{color:C.blue,fontWeight:'800'},
 content:{padding:16,paddingBottom:35},hero:{backgroundColor:C.navy,borderRadius:20,padding:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},heroKicker:{fontSize:9,color:'#8FCBFF',fontWeight:'900',letterSpacing:1},heroTitle:{fontSize:25,color:C.white,fontWeight:'900',marginTop:4},heroSub:{fontSize:12,color:'#D9EAF7',marginTop:5},dot:{width:13,height:13,borderRadius:7,borderWidth:2,borderColor:C.white},
 stats:{flexDirection:'row',gap:8,marginVertical:12},stat:{flex:1,backgroundColor:C.white,borderRadius:14,padding:11,borderWidth:1,borderColor:C.border},statN:{fontSize:22,fontWeight:'900',color:C.navy},statT:{fontSize:9,color:C.muted,marginTop:2,fontWeight:'700'},
 tabs:{backgroundColor:C.white,borderRadius:13,padding:4,flexDirection:'row',marginBottom:14,borderWidth:1,borderColor:C.border},tab:{flex:1,padding:10,alignItems:'center',borderRadius:10},tabActive:{backgroundColor:'#EAF4FF'},tabText:{fontSize:12,fontWeight:'800',color:C.muted},tabTextActive:{color:C.blue},
 sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},sectionTitle:{fontSize:19,fontWeight:'900',color:C.navy},refresh:{color:C.blue,fontWeight:'800'},
 apptCard:{backgroundColor:C.white,borderRadius:17,borderWidth:1,borderColor:C.border,padding:15,marginBottom:10},rowBetween:{flexDirection:'row',justifyContent:'space-between'},patient:{fontSize:16,fontWeight:'900',color:C.navy},phone:{fontSize:12,color:C.muted,marginTop:3},badge:{paddingHorizontal:9,paddingVertical:6,borderRadius:10,backgroundColor:'#EAF4FF',alignSelf:'flex-start'},badgeText:{fontSize:10,fontWeight:'900',color:C.navy},apptDate:{fontSize:13,fontWeight:'800',color:C.blue,marginTop:12},reason:{fontSize:14,fontWeight:'800',color:C.text,marginTop:5},note:{fontSize:12,color:C.muted,lineHeight:18,marginTop:5},actions:{flexDirection:'row',gap:7,marginTop:12,flexWrap:'wrap'},action:{paddingHorizontal:11,paddingVertical:9,borderRadius:10,borderWidth:1,borderColor:C.border,backgroundColor:'#F9FBFD'},actionText:{fontSize:11,fontWeight:'800',color:C.navy},confirm:{backgroundColor:'#E5F8EE',borderColor:'#BDE8D0'},confirmText:{fontSize:11,fontWeight:'900',color:'#147A4B'},statusChip:{paddingHorizontal:9,paddingVertical:7,borderRadius:14,backgroundColor:'#F2F5F8'},statusChipText:{fontSize:9,fontWeight:'800',color:C.muted},
 patientCard:{backgroundColor:C.white,borderRadius:15,padding:15,borderWidth:1,borderColor:C.border,marginTop:8},patientTop:{flexDirection:'row',alignItems:'center',gap:11},avatar:{width:42,height:42,borderRadius:21,backgroundColor:'#EAF4FF',alignItems:'center',justifyContent:'center'},avatarText:{fontSize:17,fontWeight:'900',color:C.blue},patientCount:{fontSize:11,color:C.muted,fontWeight:'800'},empty:{backgroundColor:C.white,borderRadius:16,padding:24,borderWidth:1,borderColor:C.border,marginTop:8},emptyText:{textAlign:'center',color:C.muted,fontSize:13},
 chartCard:{backgroundColor:C.white,borderRadius:20,padding:15,borderWidth:1,borderColor:C.border,marginTop:14},
 chartHeader:{flexDirection:'row',alignItems:'center'},chartEyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.1,color:C.blue},chartTitle:{fontSize:24,fontWeight:'900',color:C.navy,marginTop:2},chartPatient:{fontSize:11,color:C.muted,marginTop:3},chartLegendDot:{width:10,height:10,borderRadius:5,backgroundColor:'#59C989',marginRight:3},
 archSwitch:{flexDirection:'row',borderWidth:1,borderColor:'#E4D3A0',borderRadius:10,overflow:'hidden',marginTop:14},archOption:{flex:1,paddingVertical:9,alignItems:'center',backgroundColor:C.white},archOptionActive:{backgroundColor:'#F4C24A'},archText:{fontSize:13,fontWeight:'800',color:'#D5A63A'},archTextActive:{color:C.white},
 mouthFrame:{marginTop:16,paddingVertical:8,backgroundColor:'#FCFCFD',borderRadius:18,borderWidth:1,borderColor:'#EEF1F4',alignItems:'center'},sideLabel:{fontSize:8,fontWeight:'900',letterSpacing:1.2,color:'#B7C0C9',marginVertical:4},teethArc:{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingHorizontal:3},toothItem:{width:20,alignItems:'center',marginHorizontal:1},toothShape:{width:18,height:30,borderWidth:1.4,alignItems:'center',justifyContent:'flex-start',shadowOpacity:0.08,shadowRadius:2,elevation:1},toothCusp:{width:5,height:5,borderRadius:3,marginTop:5,opacity:0.8},toothRoot:{position:'absolute',width:5,height:7,borderLeftWidth:1,borderRightWidth:1,borderBottomWidth:1,borderBottomLeftRadius:4,borderBottomRightRadius:4,opacity:0.75},toothNumber:{fontSize:7.5,color:'#A6AFB8',fontWeight:'700',marginTop:3},mouthCenter:{height:26,alignItems:'center',justifyContent:'center'},mouthLine:{width:120,height:1,backgroundColor:'#EEF1F4'},mouthHint:{fontSize:7,color:'#C2C9D0',letterSpacing:1,marginTop:2},
 selectedTooth:{flexDirection:'row',alignItems:'center',backgroundColor:'#F7FAFD',borderRadius:13,padding:10,marginTop:12,borderWidth:1,borderColor:'#E4EDF5'},selectedToothIcon:{width:38,height:38,borderRadius:11,backgroundColor:'#FFF3D8',alignItems:'center',justifyContent:'center'},selectedToothIconText:{fontSize:12,fontWeight:'900',color:'#B87908'},selectedLabel:{fontSize:13,fontWeight:'900',color:C.navy},selectedStatus:{fontSize:10.5,color:C.muted,marginTop:2},changeStatus:{paddingHorizontal:10,paddingVertical:8,borderRadius:9,backgroundColor:'#EAF4FF'},changeStatusText:{fontSize:10,fontWeight:'900',color:C.blue},
 chartLegend:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:11},legendItem:{flexDirection:'row',alignItems:'center',gap:4},legendItemText:{fontSize:9,color:C.muted},legendDot:{width:8,height:8,borderRadius:4},perioTooth:{paddingHorizontal:10,paddingVertical:7,borderRadius:9,backgroundColor:'#F2F5F8',borderWidth:1,borderColor:C.border},perioToothActive:{backgroundColor:'#FFF3D8',borderColor:'#E7B54A'},perioToothText:{fontSize:10,fontWeight:'900',color:C.muted},perioToothTextActive:{color:'#B87908'},perioSelected:{backgroundColor:'#F7FAFD',padding:11,borderRadius:12,borderWidth:1,borderColor:'#E4EDF5'},perioGrid:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:10},perioCell:{width:'15.4%',minWidth:42,alignItems:'center'},perioPoint:{fontSize:9,fontWeight:'900',color:C.blue,marginBottom:4},perioInput:{width:42,height:38,borderWidth:1,borderColor:C.border,borderRadius:9,textAlign:'center',fontSize:14,fontWeight:'900',color:C.navy,backgroundColor:'#FFF'},perioMeta:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:10},metaField:{width:'31%'},metaLabel:{fontSize:8,fontWeight:'800',color:C.muted,marginBottom:3},metaInput:{height:36,borderWidth:1,borderColor:C.border,borderRadius:8,textAlign:'center',backgroundColor:'#FFF',color:C.navy,fontWeight:'800'},perioFlag:{paddingHorizontal:8,paddingVertical:8,borderRadius:9,backgroundColor:'#F2F5F8',borderWidth:1,borderColor:C.border},perioFlagActive:{backgroundColor:'#E5F8EE',borderColor:'#BDE8D0'},perioFlagText:{fontSize:9,fontWeight:'800',color:C.muted},perioFlagTextActive:{color:'#147A4B'},
 intelHero:{backgroundColor:'#0B2E4F',borderRadius:18,padding:18,marginBottom:10},intelKicker:{fontSize:9,color:'#8FCBFF',fontWeight:'900',letterSpacing:1},intelTitle:{fontSize:21,color:C.white,fontWeight:'900',marginTop:4},intelText:{fontSize:12,color:'#D9EAF7',lineHeight:18,marginTop:6},intelCard:{backgroundColor:C.white,borderRadius:15,padding:14,borderWidth:1,borderColor:C.border,marginBottom:8,flexDirection:'row',gap:12},intelNum:{fontSize:12,fontWeight:'900',color:C.blue},intelName:{fontSize:14,fontWeight:'900',color:C.navy},intelSub:{fontSize:11,color:C.muted,marginTop:3}
});
