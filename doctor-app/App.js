
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Linking, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { listAppointments, listPatients, updateAppointment, getHealth, getDentalChart, saveDentalChartEntry, getPeriodontogram, savePeriodontogramEntry } from './src/api/doctorApi';
import { getStoredDoctorSession, signInWithGoogle, signOutGoogle } from './src/auth/googleAuth';
import { runDentalIntelligence, extractEvidence, doctorPatientSummary, doctorTreatmentPlan, doctorChartInsights, doctorFollowUp, doctorDailySummary, doctorScanAnalysis, approveDoctorAI } from './src/api/intelligenceApi';

const clinicLogo = require('./assets/dr-pranali-branded-logo.png');

const C = {
  navy:'#082B49', blue:'#1677D2', bg:'#F5F9FC', white:'#FFF',
  text:'#18334D', muted:'#6B7D8F', border:'#DCE8F4',
  green:'#1DAA68', amber:'#D98900', red:'#D64B4B'
};

const STATUSES = ['requested','confirmed','scheduled','completed','cancelled','rescheduled','no_show'];

function statusLabel(s){ return (s || '').replace('_',' ').replace(/^./, x => x.toUpperCase()); }

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
      {item.status==='requested' && <Pressable disabled={busy} onPress={()=>change('confirmed')} style={[styles.action,styles.confirm]}><Text style={styles.confirmText}>{busy?'â€¦':'Confirm'}</Text></Pressable>}
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
          <Text style={styles.chartPatient}>{patientName} â€¢ {loaded ? 'Synced clinical record' : 'Loading clinical record'}</Text>
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
        <Pressable disabled={!patientId || saving} onPress={cycleState} style={[styles.changeStatus, saving && {opacity:0.5}]}><Text style={styles.changeStatusText}>{saving ? 'Savingâ€¦' : 'Update'}</Text></Pressable>
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
    <View style={styles.chartHeader}><View style={{flex:1}}><Text style={styles.chartEyebrow}>CLINICAL PERIODONTICS</Text><Text style={styles.chartTitle}>Periodontogram</Text><Text style={styles.chartPatient}>{patientName} â€¢ 6-point periodontal probing</Text></View><View style={[styles.chartLegendDot,{backgroundColor:'#D98900'}]}/></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingVertical:12}}>{teeth.map(n=><Pressable key={n} onPress={()=>setSelected(n)} style={[styles.perioTooth,selected===n&&styles.perioToothActive]}><Text style={[styles.perioToothText,selected===n&&styles.perioToothTextActive]}>{n}</Text></Pressable>)}</ScrollView>
    <View style={styles.perioSelected}><Text style={styles.selectedLabel}>Tooth {selected}</Text><Text style={styles.selectedStatus}>Probing depths (mm) â€” MB Â· B Â· DB Â· ML Â· L Â· DL</Text></View>
    <View style={styles.perioGrid}>{points.map(p=><View key={p} style={styles.perioCell}><Text style={styles.perioPoint}>{p}</Text><TextInput value={String(current[p]??'')} onChangeText={v=>update(p,v.replace(/[^0-9]/g,''))} keyboardType="number-pad" maxLength={2} placeholder="0" placeholderTextColor="#AAB5BF" style={styles.perioInput}/></View>)}</View>
    <View style={styles.perioMeta}>
      {['recession','CAL'].map(k=><View key={k} style={styles.metaField}><Text style={styles.metaLabel}>{k==='recession'?'Recession':'CAL'} (mm)</Text><TextInput value={String(current[k]??'')} onChangeText={v=>update(k,v.replace(/[^0-9]/g,''))} keyboardType="number-pad" style={styles.metaInput}/></View>)}
      {['BOP','Mobility','Furcation','Plaque','Calculus'].map(k=><Pressable key={k} onPress={()=>update(k,current[k]?'':'Yes')} style={[styles.perioFlag,current[k]&&styles.perioFlagActive]}><Text style={[styles.perioFlagText,current[k]&&styles.perioFlagTextActive]}>{k}{current[k]?' âœ“':''}</Text></Pressable>)}
    </View>
    <Pressable disabled={saving||!patientId} onPress={save} style={[styles.primary,{marginTop:12,opacity:saving?0.6:1}]}><Text style={styles.primaryText}>{saving?'Savingâ€¦':'Save Periodontogram'}</Text></Pressable>
  </View>;
}

function IntelligenceCard({ token, patient, title, description, goal, requiresPatient=true }) {
  const [status,setStatus]=useState('idle');
  const [result,setResult]=useState(null);
  const [edited,setEdited]=useState('');
  const [editing,setEditing]=useState(false);
  const run = async () => {
    if (requiresPatient && !patient?.id) { setStatus('error'); setResult({error:'Select a patient before running this clinical intelligence.'}); return; }
    setStatus('loading'); setResult(null); setEditing(false);
    try {
      const response=await runDentalIntelligence(token,{patient_id:patient?.id||null,goal,language:'en',locale:'IN-MH',context:{}});
      setResult(response||{}); setEdited(typeof response?.answer==='string'?response.answer:JSON.stringify(response?.answer||'',null,2)); setStatus('result');
    } catch(e){ setResult({error:e?.message||'Clinical AI is unavailable. Please retry.'}); setStatus('error'); }
  };
  const evidence=extractEvidence(result);
  return <View style={styles.intelCardLarge}>
    <View style={styles.intelCardHead}><View style={{flex:1}}><Text style={styles.intelName}>{title}</Text><Text style={styles.intelSub}>{description}</Text></View><Text style={styles.aiBadge}>AI</Text></View>
    {patient?.name&&<Text style={styles.intelPatient}>Patient: {patient.name}</Text>}
    {status==='idle'&&<Pressable onPress={run} style={styles.intelRunButton}><Text style={styles.intelRunText}>Run intelligence</Text></Pressable>}
    {status==='loading'&&<View style={styles.intelSkeleton}><View style={styles.skeletonLineWide}/><View style={styles.skeletonLine}/><View style={styles.skeletonLineShort}/><Text style={styles.intelLoading}>Analyzing clinical context and evidenceâ€¦</Text></View>}
    {status==='error'&&<View style={styles.intelError}><Text style={styles.intelErrorTitle}>Could not complete</Text><Text style={styles.intelErrorText}>{result?.error}</Text><Pressable onPress={run} style={styles.intelRetry}><Text style={styles.intelRetryText}>Retry</Text></Pressable></View>}
    {status==='result'&&<View style={styles.intelResult}>
      <View style={styles.aiVerify}><Text style={styles.aiVerifyText}>AI suggestion, doctor to verify</Text></View>
      {editing?<TextInput multiline value={edited} onChangeText={setEdited} style={styles.intelEditInput}/>:<Text style={styles.intelAnswer}>{typeof result?.answer==='string'?result.answer:JSON.stringify(result?.answer||result,null,2)}</Text>}
      {!!evidence.length&&<View style={styles.sourceBox}><Text style={styles.sourceTitle}>Sources / evidence</Text>{evidence.slice(0,5).map((item,index)=><View key={index} style={styles.sourceItem}><Text style={styles.sourceName}>{item.title||item.source||'Evidence'}</Text>{!!item.url&&<Text style={styles.sourceUrl}>{item.url}</Text>}{!!item.content&&<Text style={styles.sourceContent}>{item.content}</Text>}</View>)}</View>}
      <Text style={styles.intelSafety}>Nothing from this result is written to the dental chart or treatment plan automatically.</Text>
      <View style={styles.intelActions}><Pressable onPress={()=>Alert.alert('Accepted','Accepted for this session only. No clinical record was changed.')} style={styles.acceptButton}><Text style={styles.acceptText}>Accept</Text></Pressable><Pressable onPress={()=>setEditing(v=>!v)} style={styles.editButton}><Text style={styles.editText}>{editing?'Preview':'Edit'}</Text></Pressable><Pressable onPress={()=>{setResult(null);setStatus('idle');setEditing(false);}} style={styles.dismissButton}><Text style={styles.dismissText}>Dismiss</Text></Pressable></View>
      <Pressable onPress={run} style={styles.intelAgain}><Text style={styles.intelAgainText}>Run again</Text></Pressable>
    </View>}
  </View>;
}

function DoctorAIActionCard({ token, patient, title, description, capability, run }) {
  const [state,setState]=useState('idle');
  const [result,setResult]=useState(null);
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState('');
  const execute=async()=>{ if(!patient?.id)return; setState('loading'); try{const r=await run(token,patient.id);setResult(r);setDraft(typeof r?.result==='string'?r.result:JSON.stringify(r?.result||r,null,2));setState('result');}catch(e){setResult({error:e.message||'AI unavailable'});setState('error');} };
  const approve=async(action)=>{ try{await approveDoctorAI(token,{patient_id:patient.id,capability,action,content:{result:draft}});Alert.alert(action==='accepted'?'Accepted':'Saved',action==='accepted'?'Doctor approval recorded. No clinical record was changed.':'Doctor action recorded.');if(action==='dismissed')setState('idle');}catch(e){Alert.alert('AI approval',e.message||'Could not record doctor action.');} };
  return <View style={styles.intelCardLarge}>
    <View style={styles.intelCardHead}><View style={{flex:1}}><Text style={styles.intelName}>{title}</Text><Text style={styles.intelSub}>{description}</Text></View><Text style={styles.aiBadge}>AI</Text></View>
    {state==='idle'&&<Pressable onPress={execute} disabled={!patient?.id} style={[styles.intelRunButton,!patient?.id&&{opacity:0.45}]}><Text style={styles.intelRunText}>{patient?.id?'Run AI insight':'Select a patient'}</Text></Pressable>}
    {state==='loading'&&<View style={styles.intelSkeleton}><ActivityIndicator color={C.blue}/><Text style={styles.intelLoading}>Analyzing authorized clinical data…</Text></View>}
    {state==='error'&&<View style={styles.intelError}><Text style={styles.intelErrorTitle}>Could not complete</Text><Text style={styles.intelErrorText}>{result?.error}</Text><Pressable onPress={execute} style={styles.intelRetry}><Text style={styles.intelRetryText}>Retry</Text></Pressable></View>}
    {state==='result'&&<View style={styles.intelResult}><View style={styles.aiVerify}><Text style={styles.aiVerifyText}>AI suggestion — doctor to verify</Text></View>{editing?<TextInput multiline value={draft} onChangeText={setDraft} style={styles.intelEditInput}/>:<Text style={styles.intelAnswer}>{draft}</Text>}<Text style={styles.intelSafety}>AI never writes the chart, periodontogram, treatment plan or appointment automatically.</Text><View style={styles.intelActions}><Pressable onPress={()=>approve('accepted')} style={styles.acceptButton}><Text style={styles.acceptText}>Accept</Text></Pressable><Pressable onPress={()=>setEditing(v=>!v)} style={styles.editButton}><Text style={styles.editText}>{editing?'Preview':'Edit'}</Text></Pressable><Pressable onPress={()=>approve('dismissed')} style={styles.dismissButton}><Text style={styles.dismissText}>Dismiss</Text></Pressable></View></View>}
  </View>;
}

function DoctorScanCard({token,patient}) {
  const [ref,setRef]=useState(''); const [result,setResult]=useState(null); const [loading,setLoading]=useState(false);
  const run=async()=>{if(!patient?.id||!ref.trim())return;setLoading(true);try{setResult(await doctorScanAnalysis(token,{patient_id:patient.id,scan_reference:ref.trim(),scan_type:'oral_screening',metadata:{}}));}catch(e){setResult({error:e.message||'AI unavailable'});}finally{setLoading(false);}};
  return <View style={styles.intelCardLarge}><Text style={styles.intelName}>Images • ScanO AI Analysis</Text><Text style={styles.intelSub}>Official ScanO adapter status is reported; AI does not diagnose from an unavailable adapter.</Text><TextInput value={ref} onChangeText={setRef} placeholder="Scan reference / approved image identifier" placeholderTextColor="#91A0AE" style={styles.intelQuestionInput}/><Pressable onPress={run} disabled={!patient?.id||!ref.trim()||loading} style={[styles.intelRunButton,(!patient?.id||!ref.trim())&&{opacity:0.45}]}><Text style={styles.intelRunText}>{loading?'Analyzing…':'Analyze scan'}</Text></Pressable>{result&&<Text style={styles.intelAnswer}>{result.error||JSON.stringify(result,null,2)}</Text>}</View>;
}

function DoctorDailyAISummary({token}) {
  const [result,setResult]=useState(null); const [loading,setLoading]=useState(false);
  const run=async()=>{setLoading(true);try{setResult(await doctorDailySummary(token));}catch(e){setResult({error:e.message||'AI unavailable'});}finally{setLoading(false);}};
  return <View style={styles.todayCard}><View style={{flex:1}}><Text style={styles.todayKicker}>AI DAILY SUMMARY</Text><Text style={styles.todayTitle}>Clinic workload insight</Text>{loading?<ActivityIndicator color={C.blue}/>:<Text style={styles.todaySub}>{result?.error|| (result?.result ? (typeof result.result==='string'?result.result:JSON.stringify(result.result)) : 'Run a secure AI summary using appointment status only.')}</Text>}</View><Pressable onPress={run} style={styles.refresh}><Text>Run</Text></Pressable></View>;
}

function Dashboard({ token, logout }) {
  const [appointments,setAppointments]=useState([]);
  const [patients,setPatients]=useState([]);
  const [tab,setTab]=useState('Home');
  const [selectedPatient,setSelectedPatient]=useState(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [apiOk,setApiOk]=useState(false);

  const load=useCallback(async()=>{
    try {
      const [a,p,h]=await Promise.all([listAppointments(token),listPatients(token),getHealth()]);
      setAppointments(a||[]); setPatients(p||[]); setApiOk(h?.status==='ok');
    } catch(e) {
      setApiOk(false);
      Alert.alert('Clinic connection', e.message || 'Could not reach the dental backend.');
    } finally {setLoading(false);setRefreshing(false);}
  },[token]);

  useEffect(()=>{load();},[load]);

  const requested=appointments.filter(a=>a.status==='requested').length;
  const confirmed=appointments.filter(a=>['confirmed','scheduled'].includes(a.status)).length;

  if(loading) return <SafeAreaView style={styles.safe}><ActivityIndicator size="large" color={C.blue} style={{marginTop:80}}/></SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark"/>
    <View style={styles.header}>
      <View style={styles.headerBrand}>
        <Image source={clinicLogo} style={styles.headerLogo} resizeMode="contain" />
        <View><Text style={styles.headerTitle}>Dr. Pranali</Text><Text style={styles.headerSub}>Dental Clinic â€¢ Taloja</Text></View>
      </View>
      <Pressable onPress={()=>{logout();}} style={styles.headerAction}><Text style={styles.headerActionText}>Sign out</Text></Pressable>
    </View>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}}/>} contentContainerStyle={styles.content}>
      <View style={styles.hero}><View><Text style={styles.heroKicker}>CLINIC CONTROL CENTER</Text><Text style={styles.heroTitle}>Good day, Doctor</Text><Text style={styles.heroSub}>Manage today's patient flow from one place.</Text></View><View style={[styles.dot,{backgroundColor:apiOk?C.green:C.red}]}/></View>
      <View style={styles.stats}>
        <Stat n={appointments.length} t="Appointments"/><Stat n={requested} t="New Requests"/><Stat n={confirmed} t="Confirmed"/><Stat n={patients.length} t="Patients"/>
      </View>
      {tab==='Home' && <View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Today's workspace</Text><Text style={styles.patientCount}>Live clinic data</Text></View>
        <View style={styles.quickGrid}>
          <Pressable onPress={()=>setTab('Appointments')} style={styles.quickCard}><View style={styles.quickIcon}><Text>ðŸ“…</Text></View><Text style={styles.quickTitle}>Appointments</Text><Text style={styles.quickSub}>{requested} new request{requested===1?'':'s'}</Text></Pressable>
          <Pressable onPress={()=>setTab('Patients')} style={styles.quickCard}><View style={styles.quickIcon}><Text>ðŸ‘¥</Text></View><Text style={styles.quickTitle}>Patients</Text><Text style={styles.quickSub}>{patients.length} clinical record{patients.length===1?'':'s'}</Text></Pressable>
          <Pressable onPress={()=>setTab('Clinical')} style={styles.quickCard}><View style={styles.quickIcon}><Text>ðŸ¦·</Text></View><Text style={styles.quickTitle}>Dental Chart</Text><Text style={styles.quickSub}>Odontogram & perio</Text></Pressable>
          <Pressable onPress={()=>setTab('Clinical')} style={styles.quickCard}><View style={styles.quickIcon}><Text>âœ¦</Text></View><Text style={styles.quickTitle}>AI Intelligence</Text><Text style={styles.quickSub}>Clinical decision support</Text></Pressable>
        </View>
        <View style={styles.todayCard}>
          <View><Text style={styles.todayKicker}>CLINIC STATUS</Text><Text style={styles.todayTitle}>{apiOk ? 'Everything is connected' : 'Connection needs attention'}</Text><Text style={styles.todaySub}>Patient bookings and doctor records use the same secure backend.</Text></View>
          <View style={[styles.statusPill,{backgroundColor:apiOk?'#DDF7EA':'#FCEAEA'}]}><Text style={[styles.statusPillText,{color:apiOk?C.green:C.red}]}>{apiOk?'ONLINE':'OFFLINE'}</Text></View>
        </View>
        <DoctorDailyAISummary token={token}/>
      </View>}
      {tab==='Appointments' && <View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Appointment Queue</Text><Pressable onPress={load}><Text style={styles.refresh}>Refresh</Text></Pressable></View>
        {appointments.length===0?<Empty text="No appointments yet."/>:appointments.map(a=><AppointmentCard key={a.id} item={a} token={token} onChanged={load}/>)}
      </View>}
      {tab==='Patients' && <View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Patients</Text><Text style={styles.patientCount}>{patients.length} records</Text></View>
        {patients.length===0?<Empty text="No patients yet. Patient bookings will appear here."/>:patients.map((p,i)=><Pressable key={p.id} onPress={()=>setSelectedPatient(p)} style={[styles.patientCard,selectedPatient?.id===p.id&&styles.patientCardActive]}><View style={styles.patientTop}><View style={styles.avatar}><Text style={styles.avatarText}>{(p.name||'P').slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={styles.patient}>{p.name}</Text><Text style={styles.phone}>{p.phone||'No phone'}{p.age?' â€¢ Age '+p.age:''}</Text></View><Text style={styles.chevron}>â€º</Text></View></Pressable>)}
        {selectedPatient ? <><View style={styles.selectedPatientBanner}><Text style={styles.selectedPatientLabel}>SELECTED PATIENT</Text><Text style={styles.selectedPatientName}>{selectedPatient.name}</Text><Text style={styles.selectedPatientMeta}>{selectedPatient.phone||'No phone'}{selectedPatient.age?' â€¢ Age '+selectedPatient.age:''}</Text></View><DoctorAIActionCard token={token} patient={selectedPatient} title="Patient Profile • AI Insights" description="Summary and risk flags from the authorized record." capability="patient_summary" run={doctorPatientSummary}/><DentalChart token={token} patientId={selectedPatient.id} patientName={selectedPatient.name} /><DoctorAIActionCard token={token} patient={selectedPatient} title="Dental Chart & Periodontogram • AI Insights" description="Patterns and findings that merit clinician review." capability="chart_insights" run={doctorChartInsights}/><Periodontogram token={token} patientId={selectedPatient.id} patientName={selectedPatient.name} /></> : <Empty text="Select a patient to open the dental chart and periodontogram." />}
      </View>}
      {tab==='Clinical' && <View>
        <View style={styles.intelHero}><Text style={styles.intelKicker}>AI DENTAL COMMAND CENTER</Text><Text style={styles.intelTitle}>Clinical intelligence</Text><Text style={styles.intelText}>Evidence-backed decision support. AI suggestions never write to the dental chart or treatment plan without doctor confirmation.</Text></View>
        <View style={styles.intelPatientPicker}>
          <Text style={styles.intelPickerTitle}>Selected patient</Text>
          {selectedPatient?<View style={styles.intelSelectedPatient}><Text style={styles.intelSelectedName}>{selectedPatient.name}</Text><Text style={styles.intelSelectedMeta}>{selectedPatient.age?'Age '+selectedPatient.age:'Clinical record selected'}</Text></View>:<Text style={styles.intelPickerHint}>Choose a patient below for Patient Intelligence and Treatment Research.</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7,paddingTop:9}}>{patients.map(p=><Pressable key={p.id} onPress={()=>setSelectedPatient(p)} style={[styles.patientChip,selectedPatient?.id===p.id&&styles.patientChipActive]}><Text style={[styles.patientChipText,selectedPatient?.id===p.id&&styles.patientChipTextActive]}>{p.name}</Text></Pressable>)}</ScrollView>
        </View>
        <DoctorAIActionCard token={token} patient={selectedPatient} title="Treatment Planning • AI Suggestion" description="Treatment-plan options with rationale, alternatives and verification points." capability="treatment_plan" run={doctorTreatmentPlan}/>
        <DoctorAIActionCard token={token} patient={selectedPatient} title="Follow-up & Recall Recommendations" description="Recall timing and follow-up considerations; no appointment is created automatically." capability="follow_up" run={doctorFollowUp}/>
        <DoctorScanCard token={token} patient={selectedPatient}/>
        <IntelligenceCard token={token} patient={selectedPatient} title="Clinical Research" description="Evidence-backed research with sources." goal="Answer an evidence-based clinical question and show sources and uncertainty." />
        {['Product & Supplier Intelligence','Practice Intelligence','Referral Intelligence'].map((x,i)=><View key={x} style={styles.intelCard}><Text style={styles.intelNum}>0{i+4}</Text><View style={{flex:1}}><Text style={styles.intelName}>{x}</Text><Text style={styles.comingSoon}>Coming soon</Text></View></View>)}
      </View>}
    </ScrollView>
  </SafeAreaView>;
}

function ClinicalResearchCard({ token, patient }) {
  const [question,setQuestion]=useState('');
  const [status,setStatus]=useState('idle');
  const [result,setResult]=useState(null);
  const [edited,setEdited]=useState('');
  const [editing,setEditing]=useState(false);
  const run=async()=>{
    if(!question.trim())return;
    setStatus('loading');setResult(null);setEditing(false);
    try{const response=await runDentalIntelligence(token,{patient_id:patient?.id||null,goal:question.trim(),language:'en',locale:'IN-MH',context:{}});setResult(response||{});setEdited(typeof response?.answer==='string'?response.answer:JSON.stringify(response?.answer||'',null,2));setStatus('result');}
    catch(e){setResult({error:e?.message||'Clinical AI is unavailable. Please retry.'});setStatus('error');}
  };
  const evidence=extractEvidence(result);
  return <View style={styles.intelCardLarge}>
    <View style={styles.intelCardHead}><View style={{flex:1}}><Text style={styles.intelName}>Clinical Research</Text><Text style={styles.intelSub}>Ask an evidence-based clinical question. Sources are shown when returned.</Text></View><Text style={styles.aiBadge}>AI</Text></View>
    <TextInput value={question} onChangeText={setQuestion} placeholder="Ask a clinical questionâ€¦" placeholderTextColor="#91A0AE" multiline style={styles.intelQuestionInput}/>
    <Pressable disabled={!question.trim()||status==='loading'} onPress={run} style={[styles.intelRunButton,(!question.trim()||status==='loading')&&{opacity:0.5}]}><Text style={styles.intelRunText}>{status==='loading'?'Researchingâ€¦':'Ask clinical research'}</Text></Pressable>
    {status==='loading'&&<View style={styles.intelSkeleton}><View style={styles.skeletonLineWide}/><View style={styles.skeletonLine}/><View style={styles.skeletonLineShort}/><Text style={styles.intelLoading}>Retrieving evidence and reasoningâ€¦</Text></View>}
    {status==='error'&&<View style={styles.intelError}><Text style={styles.intelErrorTitle}>Could not complete</Text><Text style={styles.intelErrorText}>{result?.error}</Text><Pressable onPress={run} style={styles.intelRetry}><Text style={styles.intelRetryText}>Retry</Text></Pressable></View>}
    {status==='result'&&<View style={styles.intelResult}><View style={styles.aiVerify}><Text style={styles.aiVerifyText}>AI suggestion, doctor to verify</Text></View>{editing?<TextInput multiline value={edited} onChangeText={setEdited} style={styles.intelEditInput}/>:<Text style={styles.intelAnswer}>{typeof result?.answer==='string'?result.answer:JSON.stringify(result?.answer||result,null,2)}</Text>}{!!evidence.length&&<View style={styles.sourceBox}><Text style={styles.sourceTitle}>Sources / evidence</Text>{evidence.slice(0,6).map((item,index)=><View key={index} style={styles.sourceItem}><Text style={styles.sourceName}>{item.title||item.source||'Evidence'}</Text>{!!item.url&&<Text style={styles.sourceUrl}>{item.url}</Text>}{!!item.content&&<Text style={styles.sourceContent}>{item.content}</Text>}</View>)}</View>}<Text style={styles.intelSafety}>Nothing from this result is written to the dental chart or treatment plan automatically.</Text><View style={styles.intelActions}><Pressable onPress={()=>Alert.alert('Accepted','Accepted for this session only. No clinical record was changed.')} style={styles.acceptButton}><Text style={styles.acceptText}>Accept</Text></Pressable><Pressable onPress={()=>setEditing(v=>!v)} style={styles.editButton}><Text style={styles.editText}>{editing?'Preview':'Edit'}</Text></Pressable><Pressable onPress={()=>{setStatus('idle');setResult(null)}} style={styles.dismissButton}><Text style={styles.dismissText}>Dismiss</Text></Pressable></View></View>}
  </View>;
}

function Stat({n,t}){return <View style={styles.stat}><Text style={styles.statN}>{n}</Text><Text style={styles.statT}>{t}</Text></View>}
function Empty({text}){return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>}

function GoogleLoginScreen({ onSignedIn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const login = async () => {
    setBusy(true);
    setError('');
    try {
      const session = await signInWithGoogle('https://dr-pranali-dental-api.onrender.com');
      onSignedIn(session.access_token);
    } catch (e) {
      setError(e?.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.loginWrap}>
        <Image source={clinicLogo} style={styles.loginLogo} resizeMode="contain" />
        <Text style={styles.kicker}>DOCTOR PORTAL</Text>
        <Text style={styles.loginTitle}>Dr. Pranali Dental Clinic</Text>
        <Text style={styles.loginSub}>Sign in with the Google account authorized for this clinic.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Secure doctor authentication</Text>
          <Text style={styles.help}>This uses native Android Google Sign-In. No Expo OAuth proxy and no OTP are used.</Text>
          <Pressable disabled={busy} onPress={login} style={[styles.primary, busy && {opacity:0.6}]}>
            {busy ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryText}>Continue with Google</Text>}
          </Pressable>
          {!!error && <View style={styles.loginError}><Text style={styles.loginErrorTitle}>Sign-in error</Text><Text style={styles.loginErrorText}>{error}</Text></View>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App(){
  const [token,setToken]=useState(null);
  const [checking,setChecking]=useState(true);

  useEffect(() => {
    getStoredDoctorSession().then(value => setToken(value || null)).finally(() => setChecking(false));
  }, []);

  const logout = async () => {
    await signOutGoogle();
    setToken(null);
  };

  if (checking) return <SafeAreaView style={styles.safe}><ActivityIndicator size="large" color={C.blue} style={{marginTop:80}}/></SafeAreaView>;
  if (!token) return <GoogleLoginScreen onSignedIn={setToken}/>;
  return <Dashboard token={token} logout={logout}/>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg}, loginWrap:{padding:24,paddingTop:70,flexGrow:1,justifyContent:'center'},
 loginLogo:{width:150,height:150,borderRadius:34,alignSelf:'center',marginBottom:14},
 logo:{width:82,height:82,borderRadius:24,backgroundColor:'#0B2E4F',alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:18},
 logoTooth:{fontSize:42,color:'#FFF'}, kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.2,color:C.blue,textAlign:'center'},
 loginTitle:{fontSize:34,fontWeight:'900',color:C.navy,textAlign:'center',marginTop:4},loginSub:{fontSize:14,color:C.muted,lineHeight:21,textAlign:'center',marginTop:9,marginBottom:20},
 card:{backgroundColor:C.white,borderRadius:20,borderWidth:1,borderColor:C.border,padding:18},label:{fontSize:13,fontWeight:'800',color:C.navy,marginBottom:7},input:{borderWidth:1,borderColor:C.border,borderRadius:12,padding:13,fontSize:15,color:C.text,backgroundColor:'#F9FBFD'},primary:{backgroundColor:C.blue,borderRadius:13,padding:15,alignItems:'center',marginTop:13},primaryText:{color:C.white,fontWeight:'900',fontSize:15},help:{fontSize:11,color:C.muted,lineHeight:17,marginTop:10},loginError:{marginTop:12,padding:12,borderRadius:12,backgroundColor:'#FCEAEA',borderWidth:1,borderColor:'#F2C3C3'},loginErrorTitle:{fontSize:12,fontWeight:'900',color:C.red},loginErrorText:{fontSize:11,color:'#7A2E2E',lineHeight:16,marginTop:4},
 header:{backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.border,paddingHorizontal:16,paddingVertical:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},headerBrand:{flexDirection:'row',alignItems:'center',gap:10},headerLogo:{width:38,height:38,borderRadius:12},headerTitle:{fontSize:19,fontWeight:'900',color:C.navy},headerSub:{fontSize:11,color:C.muted,marginTop:1},headerAction:{paddingHorizontal:10,paddingVertical:7,borderRadius:10,backgroundColor:'#F2F7FC'},headerActionText:{color:C.blue,fontWeight:'800',fontSize:10},
 content:{padding:16,paddingBottom:95},hero:{backgroundColor:C.navy,borderRadius:20,padding:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},heroKicker:{fontSize:9,color:'#8FCBFF',fontWeight:'900',letterSpacing:1},heroTitle:{fontSize:25,color:C.white,fontWeight:'900',marginTop:4},heroSub:{fontSize:12,color:'#D9EAF7',marginTop:5},dot:{width:13,height:13,borderRadius:7,borderWidth:2,borderColor:C.white},
 stats:{flexDirection:'row',gap:8,marginVertical:12},quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},quickCard:{width:'48.2%',backgroundColor:C.white,borderRadius:17,padding:14,borderWidth:1,borderColor:C.border,minHeight:128},quickIcon:{width:38,height:38,borderRadius:12,backgroundColor:'#EAF4FF',alignItems:'center',justifyContent:'center',marginBottom:10},quickTitle:{fontSize:14,fontWeight:'900',color:C.navy},quickSub:{fontSize:10.5,color:C.muted,lineHeight:15,marginTop:4},todayCard:{backgroundColor:'#EEF7FF',borderRadius:17,padding:15,marginTop:12,borderWidth:1,borderColor:'#D4E9FA',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},todayKicker:{fontSize:8,fontWeight:'900',letterSpacing:1,color:C.blue},todayTitle:{fontSize:16,fontWeight:'900',color:C.navy,marginTop:3},todaySub:{fontSize:10.5,color:C.muted,lineHeight:15,marginTop:3,maxWidth:'82%'},statusPill:{paddingHorizontal:9,paddingVertical:6,borderRadius:10},statusPillText:{fontSize:9,fontWeight:'900'},stat:{flex:1,backgroundColor:C.white,borderRadius:14,padding:11,borderWidth:1,borderColor:C.border},statN:{fontSize:22,fontWeight:'900',color:C.navy},statT:{fontSize:9,color:C.muted,marginTop:2,fontWeight:'700'},
 tabs:{backgroundColor:C.white,borderRadius:13,padding:4,flexDirection:'row',marginBottom:14,borderWidth:1,borderColor:C.border},tab:{flex:1,padding:10,alignItems:'center',borderRadius:10},tabActive:{backgroundColor:'#EAF4FF'},tabText:{fontSize:12,fontWeight:'800',color:C.muted},tabTextActive:{color:C.blue},
 sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},sectionTitle:{fontSize:19,fontWeight:'900',color:C.navy},refresh:{color:C.blue,fontWeight:'800'},
 apptCard:{backgroundColor:C.white,borderRadius:17,borderWidth:1,borderColor:C.border,padding:15,marginBottom:10},rowBetween:{flexDirection:'row',justifyContent:'space-between'},patient:{fontSize:16,fontWeight:'900',color:C.navy},phone:{fontSize:12,color:C.muted,marginTop:3},badge:{paddingHorizontal:9,paddingVertical:6,borderRadius:10,backgroundColor:'#EAF4FF',alignSelf:'flex-start'},badgeText:{fontSize:10,fontWeight:'900',color:C.navy},apptDate:{fontSize:13,fontWeight:'800',color:C.blue,marginTop:12},reason:{fontSize:14,fontWeight:'800',color:C.text,marginTop:5},note:{fontSize:12,color:C.muted,lineHeight:18,marginTop:5},actions:{flexDirection:'row',gap:7,marginTop:12,flexWrap:'wrap'},action:{paddingHorizontal:11,paddingVertical:9,borderRadius:10,borderWidth:1,borderColor:C.border,backgroundColor:'#F9FBFD'},actionText:{fontSize:11,fontWeight:'800',color:C.navy},confirm:{backgroundColor:'#E5F8EE',borderColor:'#BDE8D0'},confirmText:{fontSize:11,fontWeight:'900',color:'#147A4B'},statusChip:{paddingHorizontal:9,paddingVertical:7,borderRadius:14,backgroundColor:'#F2F5F8'},statusChipText:{fontSize:9,fontWeight:'800',color:C.muted},
 patientCard:{backgroundColor:C.white,borderRadius:15,padding:14,borderWidth:1,borderColor:C.border,marginTop:8},patientCardActive:{borderColor:'#86BDF0',backgroundColor:'#F3F9FF'},patientTop:{flexDirection:'row',alignItems:'center',gap:11},avatar:{width:42,height:42,borderRadius:21,backgroundColor:'#EAF4FF',alignItems:'center',justifyContent:'center'},avatarText:{fontSize:17,fontWeight:'900',color:C.blue},chevron:{fontSize:26,color:'#9AA9B7',fontWeight:'300'},selectedPatientBanner:{backgroundColor:C.navy,borderRadius:16,padding:14,marginTop:12},selectedPatientLabel:{fontSize:8,fontWeight:'900',letterSpacing:1,color:'#8FCBFF'},selectedPatientName:{fontSize:19,fontWeight:'900',color:C.white,marginTop:3},selectedPatientMeta:{fontSize:11,color:'#D9EAF7',marginTop:2},patientCount:{fontSize:11,color:C.muted,fontWeight:'800'},empty:{backgroundColor:C.white,borderRadius:16,padding:24,borderWidth:1,borderColor:C.border,marginTop:8},emptyText:{textAlign:'center',color:C.muted,fontSize:13},
 chartCard:{backgroundColor:C.white,borderRadius:20,padding:15,borderWidth:1,borderColor:C.border,marginTop:14},
 chartHeader:{flexDirection:'row',alignItems:'center'},chartEyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.1,color:C.blue},chartTitle:{fontSize:24,fontWeight:'900',color:C.navy,marginTop:2},chartPatient:{fontSize:11,color:C.muted,marginTop:3},chartLegendDot:{width:10,height:10,borderRadius:5,backgroundColor:'#59C989',marginRight:3},
 archSwitch:{flexDirection:'row',borderWidth:1,borderColor:'#E4D3A0',borderRadius:10,overflow:'hidden',marginTop:14},archOption:{flex:1,paddingVertical:9,alignItems:'center',backgroundColor:C.white},archOptionActive:{backgroundColor:'#F4C24A'},archText:{fontSize:13,fontWeight:'800',color:'#D5A63A'},archTextActive:{color:C.white},
 mouthFrame:{marginTop:16,paddingVertical:8,backgroundColor:'#FCFCFD',borderRadius:18,borderWidth:1,borderColor:'#EEF1F4',alignItems:'center'},sideLabel:{fontSize:8,fontWeight:'900',letterSpacing:1.2,color:'#B7C0C9',marginVertical:4},teethArc:{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingHorizontal:3},toothItem:{width:20,alignItems:'center',marginHorizontal:1},toothShape:{width:18,height:30,borderWidth:1.4,alignItems:'center',justifyContent:'flex-start',shadowOpacity:0.08,shadowRadius:2,elevation:1},toothCusp:{width:5,height:5,borderRadius:3,marginTop:5,opacity:0.8},toothRoot:{position:'absolute',width:5,height:7,borderLeftWidth:1,borderRightWidth:1,borderBottomWidth:1,borderBottomLeftRadius:4,borderBottomRightRadius:4,opacity:0.75},toothNumber:{fontSize:7.5,color:'#A6AFB8',fontWeight:'700',marginTop:3},mouthCenter:{height:26,alignItems:'center',justifyContent:'center'},mouthLine:{width:120,height:1,backgroundColor:'#EEF1F4'},mouthHint:{fontSize:7,color:'#C2C9D0',letterSpacing:1,marginTop:2},
 selectedTooth:{flexDirection:'row',alignItems:'center',backgroundColor:'#F7FAFD',borderRadius:13,padding:10,marginTop:12,borderWidth:1,borderColor:'#E4EDF5'},selectedToothIcon:{width:38,height:38,borderRadius:11,backgroundColor:'#FFF3D8',alignItems:'center',justifyContent:'center'},selectedToothIconText:{fontSize:12,fontWeight:'900',color:'#B87908'},selectedLabel:{fontSize:13,fontWeight:'900',color:C.navy},selectedStatus:{fontSize:10.5,color:C.muted,marginTop:2},changeStatus:{paddingHorizontal:10,paddingVertical:8,borderRadius:9,backgroundColor:'#EAF4FF'},changeStatusText:{fontSize:10,fontWeight:'900',color:C.blue},
 chartLegend:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:11},legendItem:{flexDirection:'row',alignItems:'center',gap:4},legendItemText:{fontSize:9,color:C.muted},legendDot:{width:8,height:8,borderRadius:4},perioTooth:{paddingHorizontal:10,paddingVertical:7,borderRadius:9,backgroundColor:'#F2F5F8',borderWidth:1,borderColor:C.border},perioToothActive:{backgroundColor:'#FFF3D8',borderColor:'#E7B54A'},perioToothText:{fontSize:10,fontWeight:'900',color:C.muted},perioToothTextActive:{color:'#B87908'},perioSelected:{backgroundColor:'#F7FAFD',padding:11,borderRadius:12,borderWidth:1,borderColor:'#E4EDF5'},perioGrid:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:10},perioCell:{width:'15.4%',minWidth:42,alignItems:'center'},perioPoint:{fontSize:9,fontWeight:'900',color:C.blue,marginBottom:4},perioInput:{width:42,height:38,borderWidth:1,borderColor:C.border,borderRadius:9,textAlign:'center',fontSize:14,fontWeight:'900',color:C.navy,backgroundColor:'#FFF'},perioMeta:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:10},metaField:{width:'31%'},metaLabel:{fontSize:8,fontWeight:'800',color:C.muted,marginBottom:3},metaInput:{height:36,borderWidth:1,borderColor:C.border,borderRadius:8,textAlign:'center',backgroundColor:'#FFF',color:C.navy,fontWeight:'800'},perioFlag:{paddingHorizontal:8,paddingVertical:8,borderRadius:9,backgroundColor:'#F2F5F8',borderWidth:1,borderColor:C.border},perioFlagActive:{backgroundColor:'#E5F8EE',borderColor:'#BDE8D0'},perioFlagText:{fontSize:9,fontWeight:'800',color:C.muted},perioFlagTextActive:{color:'#147A4B'},
 bottomNav:{position:'absolute',left:0,right:0,bottom:0,backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.border,height:76,flexDirection:'row',paddingTop:7,paddingBottom:5},navItem:{flex:1,alignItems:'center',justifyContent:'center'},navIcon:{width:36,height:30,borderRadius:10,alignItems:'center',justifyContent:'center'},navIconActive:{backgroundColor:'#EAF4FF'},navIconText:{fontSize:18,color:'#9AA9B7'},navIconTextActive:{color:C.blue},navLabel:{fontSize:9,fontWeight:'800',color:'#9AA9B7',marginTop:2},navLabelActive:{color:C.blue},intelCardLarge:{backgroundColor:C.white,borderRadius:16,padding:14,borderWidth:1,borderColor:C.border,marginBottom:10},intelCardHead:{flexDirection:'row',alignItems:'flex-start',gap:10},aiBadge:{fontSize:9,fontWeight:'900',color:C.blue,backgroundColor:'#EAF4FF',paddingHorizontal:7,paddingVertical:5,borderRadius:8},intelPatient:{fontSize:10,fontWeight:'800',color:C.muted,marginTop:9},intelRunButton:{backgroundColor:C.blue,borderRadius:11,paddingVertical:11,alignItems:'center',marginTop:11},intelRunText:{fontSize:11,fontWeight:'900',color:C.white},intelSkeleton:{marginTop:11,padding:12,borderRadius:12,backgroundColor:'#F5F8FB'},skeletonLineWide:{height:9,width:'92%',backgroundColor:'#E4EBF2',borderRadius:5},skeletonLine:{height:9,width:'72%',backgroundColor:'#E4EBF2',borderRadius:5,marginTop:8},skeletonLineShort:{height:9,width:'48%',backgroundColor:'#E4EBF2',borderRadius:5,marginTop:8},intelLoading:{fontSize:10,color:C.muted,marginTop:10},intelError:{marginTop:11,padding:12,borderRadius:12,backgroundColor:'#FCEAEA',borderWidth:1,borderColor:'#F2C3C3'},intelErrorTitle:{fontSize:12,fontWeight:'900',color:C.red},intelErrorText:{fontSize:11,color:'#7A2E2E',lineHeight:16,marginTop:4},intelRetry:{alignSelf:'flex-start',marginTop:8,paddingHorizontal:11,paddingVertical:7,borderRadius:8,backgroundColor:C.white},intelRetryText:{fontSize:10,fontWeight:'900',color:C.red},intelResult:{marginTop:11},aiVerify:{backgroundColor:'#FFF4D8',borderRadius:8,padding:7,alignSelf:'flex-start'},aiVerifyText:{fontSize:9,fontWeight:'900',color:'#8C6200'},intelAnswer:{fontSize:12.5,color:C.text,lineHeight:19,marginTop:10},intelEditInput:{minHeight:130,borderWidth:1,borderColor:C.border,borderRadius:10,padding:10,color:C.text,fontSize:12,lineHeight:18,marginTop:10,textAlignVertical:'top'},sourceBox:{marginTop:12,borderTopWidth:1,borderTopColor:C.border,paddingTop:10},sourceTitle:{fontSize:10,fontWeight:'900',color:C.navy},sourceItem:{marginTop:8,padding:9,borderRadius:9,backgroundColor:'#F7FAFD'},sourceName:{fontSize:10,fontWeight:'900',color:C.navy},sourceUrl:{fontSize:8,color:C.blue,marginTop:2},sourceContent:{fontSize:9.5,color:C.muted,lineHeight:14,marginTop:3},intelSafety:{fontSize:9,color:C.muted,lineHeight:13,marginTop:10},intelActions:{flexDirection:'row',gap:7,marginTop:11},acceptButton:{paddingHorizontal:11,paddingVertical:8,borderRadius:9,backgroundColor:'#E5F8EE'},acceptText:{fontSize:10,fontWeight:'900',color:'#147A4B'},editButton:{paddingHorizontal:11,paddingVertical:8,borderRadius:9,backgroundColor:'#EAF4FF'},editText:{fontSize:10,fontWeight:'900',color:C.blue},dismissButton:{paddingHorizontal:11,paddingVertical:8,borderRadius:9,backgroundColor:'#F2F5F8'},dismissText:{fontSize:10,fontWeight:'900',color:C.muted},intelAgain:{marginTop:8},intelAgainText:{fontSize:9,fontWeight:'800',color:C.blue},intelPatientPicker:{backgroundColor:C.white,borderRadius:16,padding:14,borderWidth:1,borderColor:C.border,marginBottom:10},intelPickerTitle:{fontSize:11,fontWeight:'900',color:C.navy},intelPickerHint:{fontSize:10,color:C.muted,lineHeight:15,marginTop:5},intelSelectedPatient:{marginTop:7},intelSelectedName:{fontSize:14,fontWeight:'900',color:C.navy},intelSelectedMeta:{fontSize:10,color:C.muted,marginTop:2},patientChip:{paddingHorizontal:10,paddingVertical:7,borderRadius:12,backgroundColor:'#F2F5F8',borderWidth:1,borderColor:C.border},patientChipActive:{backgroundColor:'#EAF4FF',borderColor:'#86BDF0'},patientChipText:{fontSize:9,fontWeight:'800',color:C.muted},patientChipTextActive:{color:C.blue},intelQuestionInput:{minHeight:72,borderWidth:1,borderColor:C.border,borderRadius:11,padding:10,color:C.text,fontSize:12,lineHeight:17,marginTop:11,textAlignVertical:'top'},comingSoon:{fontSize:10,fontWeight:'900',color:C.amber,marginTop:3},intelHero:{backgroundColor:'#0B2E4F',borderRadius:18,padding:18,marginBottom:10},intelKicker:{fontSize:9,color:'#8FCBFF',fontWeight:'900',letterSpacing:1},intelTitle:{fontSize:21,color:C.white,fontWeight:'900',marginTop:4},intelText:{fontSize:12,color:'#D9EAF7',lineHeight:18,marginTop:6},intelCard:{backgroundColor:C.white,borderRadius:15,padding:14,borderWidth:1,borderColor:C.border,marginBottom:8,flexDirection:'row',gap:12},intelNum:{fontSize:12,fontWeight:'900',color:C.blue},intelName:{fontSize:14,fontWeight:'900',color:C.navy},intelSub:{fontSize:11,color:C.muted,marginTop:3}
});

