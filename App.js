import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { signInWithGoogle } from './src/auth/googleAuth';
import { BRAND } from './src/brandTheme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { buildPatientCareRequest } from './src/intelligence/dentalIntelligence';
import { requestPublicAppointment } from './src/api/dentalApi';
import { getAIConsent, giveAIConsent, linkPatient, patientAIChat, explainTreatment, deleteAIHistory, registerExpoPushToken } from './src/api/aiApi';

// Production HTTPS API. The patient app does not require the phone and computer to share a Wi-Fi network.
const API_URL = 'https://dr-pranali-dental-api.onrender.com';
const PHONE = '9137007432';
const WHATSAPP = '919137007432';

const COLORS = {
  navy: BRAND.colors.deepBlue,
  blue: BRAND.colors.skyBlue,
  blue2: BRAND.colors.skyBlue,
  teal: BRAND.colors.teal,
  pale: BRAND.colors.lightBlue,
  bg: BRAND.colors.lightBlue,
  text: '#18334D',
  muted: '#657789',
  border: '#DCE8F4',
  white: BRAND.colors.white,
  green: '#20B96B',
};

const services = [
  ['Dental Check-up', 'Regular oral examination', '🦷'],
  ['Scaling & Polishing', 'Remove plaque & stains', '🪥'],
  ['Tooth Whitening', 'Brighter & whiter smile', '✨'],
  ['Dental Fillings', 'Tooth-coloured restorations', '🦷'],
  ['Root Canal Treatment', 'Painless RCT care', '🩺'],
  ['Dental Crowns', 'Protect damaged teeth', '👑'],
  ['Dental Bridges', 'Replace missing teeth', '🌉'],
  ['Dental Implants', 'Permanent tooth replacement', '🦷'],
  ['Tooth Extraction', 'Safe & gentle extractions', '🩹'],
  ['Wisdom Tooth Removal', 'Pain-free removal of wisdom teeth', '🦷'],
  ['Dentures', 'Complete & partial dentures', '😁'],
  ['Kids Dental Care', 'Specialized care for children', '👶'],
  ['Orthodontic Braces', 'Straighten your teeth', '🔗'],
  ['Clear Aligners (Invisalign)', 'Invisible teeth alignment', '😁'],
  ['Gum Disease Treatment', 'Healthy gums, healthy smile', '🩺'],
  ['Cosmetic Dentistry', 'Smile makeover solutions', '✨'],
  ['Veneers', 'Perfect smile makeover', '😁'],
  ['Full Mouth Rehabilitation', 'Complete dental restoration', '🦷'],
  ['Dental Sealants', 'Protects from cavities', '🛡️'],
  ['Emergency Dental Care', 'Immediate care when you need it', '🚑'],
];

const tabs = [
  ['Home', '⌂'],
  ['AI Dental', '✦'],
  ['Services', '♢'],
  ['Appointment', '▣'],
  ['Gallery', '▧'],
  ['Contact', '☎'],
];

function WelcomeScreen({ onStart, serverMessage }) {
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleStage, setGoogleStage] = useState('');
  const [googleError, setGoogleError] = useState(null);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [localMessage, setLocalMessage] = useState('');

  const googleLogin = async () => {
    setGoogleBusy(true); setGoogleError(null); setLocalMessage(''); setGoogleStage('Opening Google...');
    try {
      await signInWithGoogle(setGoogleStage);
      setLocalMessage('Google account connected successfully.');
    } catch (error) {
      setGoogleError({ message: error?.message || 'Google sign-in failed.', code: error?.code || error?.name || 'AUTH_ERROR', stage: error?.stage || googleStage || 'Unknown stage' });
    } finally { setGoogleBusy(false); }
  };
  const unavailable = (method) => setLocalMessage(method + ' sign-in is displayed for the approved design but is not connected to an authentication provider yet.');

  return (
    <SafeAreaView style={styles.welcomeSafe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.loginRedesignContent} keyboardShouldPersistTaps="handled">
        <View style={styles.patientPhotoPlaceholder}><Text style={styles.photoPlaceholderTitle}>PATIENT HEADER PHOTO PLACEHOLDER</Text><Text style={styles.photoPlaceholderSub}>Smiling-woman image pending</Text></View>
        <View style={styles.logoPlaceholder}><Text style={styles.logoPlaceholderText}>LOGO PLACEHOLDER</Text><Text style={styles.logoPlaceholderSub}>Original Dr Pranali orbit-tooth logo pending</Text></View>
        <Text style={styles.loginBrandName}>Dr Pranali</Text>
        <Text style={styles.loginBrandClinic}>D E N T A L   C L I N I C</Text>
        <Text style={styles.loginWelcomeHeading}>Welcome</Text>
        <Text style={styles.loginWelcomeSub}>Book Appointments • View Reports{"\n"}Stay Connected • Smile Brighter</Text>
        <Pressable disabled={googleBusy} onPress={googleLogin} style={styles.loginProviderButton}>
          <Text style={styles.providerIconGoogle}>G</Text><Text style={styles.loginProviderText}>{googleBusy ? googleStage || 'Opening Google...' : 'Continue with Google'}</Text>
        </Pressable>
        <Pressable onPress={() => unavailable('Apple')} style={styles.loginProviderButton}><Text style={styles.providerIconApple}>●</Text><Text style={styles.loginProviderText}>Continue with Apple</Text></Pressable>
        <View style={styles.loginOrRow}><View style={styles.loginOrLine}/><Text style={styles.loginOrText}>or</Text><View style={styles.loginOrLine}/></View>
        <View style={styles.loginInputRow}><Text style={styles.loginInputIcon}>☎</Text><Text style={styles.countryCode}>+91</Text><TextInput value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="Mobile Number" placeholderTextColor="#6D8CB0" style={styles.loginInput}/></View>
        <View style={styles.loginInputRow}><Text style={styles.loginInputIcon}>♙</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor="#6D8CB0" style={styles.loginInput}/></View>
        <View style={styles.loginRememberRow}><Pressable onPress={() => setRemember(!remember)} style={styles.rememberToggle}><Text style={styles.rememberCheck}>{remember ? '✓' : ''}</Text></Pressable><Text style={styles.rememberLabel}>Remember me</Text><Pressable onPress={() => unavailable('Password recovery')}><Text style={styles.forgotText}>Forgot Password?</Text></Pressable></View>
        <Pressable onPress={() => unavailable('Mobile/password')} style={styles.loginGradientButton}><Text style={styles.loginGradientText}>Login  →</Text></Pressable>
        <Text style={styles.createAccountLine}>New here? <Text style={styles.createAccountLink} onPress={() => unavailable('Account creation')}>Create an Account</Text></Text>
        {!!serverMessage && <Text style={styles.serverWakeMessage}>{serverMessage}</Text>}
        {!!localMessage && <Text accessibilityRole="alert" style={styles.authErrorText}>{localMessage}</Text>}
        {!!googleError && <View style={styles.authErrorBox}><Text style={styles.authErrorTitle}>Sign-in failed</Text><Text style={styles.authErrorText}>{googleError.message}</Text><Text style={styles.authErrorDetail}>Stage: {googleError.stage} • Code: {googleError.code}</Text><Pressable onPress={googleLogin} style={styles.authRetry}><Text style={styles.authRetryText}>Retry</Text></Pressable></View>}
        <View style={styles.loginQuickActions}>
          { [['▣','Book Appointment','Appointment'],['▤','View Reports','Gallery'],['♧','Dental Treatments','Services'],['♙','Family Members','Home']].map(([icon,label,tab]) => <Pressable key={label} onPress={() => onStart(tab)} style={styles.loginQuickAction}><Text style={styles.loginQuickIcon}>{icon}</Text><Text style={styles.loginQuickLabel}>{label}</Text></Pressable>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ label, icon, onPress, variant = 'primary' }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
        pressed && { opacity: 0.78 },
      ]}
    >
      <Text style={[styles.actionIcon, variant === 'primary' && styles.whiteText]}>{icon}</Text>
      <Text style={[styles.actionText, variant === 'primary' && styles.whiteText]}>{label}</Text>
    </Pressable>
  );
}

function Feature({ icon, title, subtitle }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSub}>{subtitle}</Text>
    </View>
  );
}

function ServiceCard({ name, desc, icon }) {
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceIconWrap}>
        <Text style={styles.serviceIcon}>{icon}</Text>
      </View>
      <Text style={styles.serviceName}>{name}</Text>
      <Text style={styles.serviceDesc}>{desc}</Text>
    </View>
  );
}

function HomeScreen({ go }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.hero}>
        <View style={styles.profileColumn}>
          <Image source={require('./assets/dr-pranali.jpg')} style={styles.profileImage} />
          <View style={styles.bdsBadge}><Text style={styles.bdsText}>BDS</Text></View>
          <Text style={styles.doctorName}>Dr. Pranali</Text>
          <Text style={styles.degree}>BDS – Dental Surgeon</Text>
          <View style={styles.divider} />
          <Text style={styles.smallInfo}>⌖  Taloja, Navi Mumbai</Text>
          <Text style={styles.smallInfo}>◷  Mon – Sun: 10:00 AM – 9:00 PM</Text>
          <Text style={styles.byAppointment}>By Appointment Only</Text>
        </View>

        <View style={styles.heroCopy}>
          <View style={styles.brandLine}><Text style={styles.tooth}>♧</Text><Text style={styles.brand}>Dr. Pranali's</Text></View>
          <Text style={styles.heroTitle}>Healthy Smile,</Text>
          <Text style={[styles.heroTitle, styles.heroBlue]}>Happy You!</Text>
          <Text style={styles.heroSub}>Expert dental care for you and your family, with gentle treatment and modern technology.</Text>
          <ActionButton label="Book Appointment" icon="▣" onPress={() => go('Appointment')} />
          <ActionButton label="WhatsApp Clinic" icon="◉" variant="secondary" onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`)} />
          <ActionButton label={`Call Us   ${PHONE}`} icon="☎" variant="secondary" onPress={() => Linking.openURL(`tel:+${WHATSAPP}`)} />
        </View>
      </View>

      <View style={styles.featureRow}>
        <Feature icon="♧" title="Experienced" subtitle="Doctor" />
        <Feature icon="✓" title="Safe & Hygienic" subtitle="Care" />
        <Feature icon="♙" title="Patient First" subtitle="Approach" />
        <Feature icon="☆" title="Modern" subtitle="Technology" />
      </View>

      <Pressable onPress={() => go('AI Dental')} style={styles.homeAICard}>
        <View style={styles.homeAIIcon}><Text style={styles.homeAIIconText}>✦</Text></View>
        <View style={{flex:1}}><Text style={styles.homeAITitle}>Dr. Pranali Dental AI Assistant</Text><Text style={styles.homeAISub}>Ask questions, understand treatment information and get urgent-symptom guidance.</Text></View>
        <Text style={styles.homeAIArrow}>›</Text>
      </Pressable>

      <View style={styles.aboutCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>About Dr. Pranali</Text>
          <Text style={styles.aboutText}>A patient-focused dental practice offering preventive, restorative and cosmetic dental care in a comfortable environment.</Text>
        </View>
        <Text style={styles.aboutTooth}>♧</Text>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTooth}>♧</Text>
        <Text style={styles.sectionTitle}>Our Dental Services</Text>
      </View>
      <View style={styles.servicesGrid}>
        {services.slice(0, 8).map(([name, desc, icon]) => <ServiceCard key={name} name={name} desc={desc} icon={icon} />)}
      </View>
      <Pressable onPress={() => go('Services')} style={styles.viewAll}><Text style={styles.viewAllText}>View All Dental Services →</Text></Pressable>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}



const PATIENT_UPPER = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
const PATIENT_LOWER = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
const PATIENT_CHILD_UPPER = ['55','54','53','52','51','61','62','63','64','65'];
const PATIENT_CHILD_LOWER = ['85','84','83','82','81','71','72','73','74','75'];

function PatientTooth({ number, selected, upper, index, total, onPress }) {
  const curve = Math.abs((total - 1) / 2 - index);
  return (
    <Pressable onPress={onPress} style={[styles.pToothItem,{transform:[{translateY:curve*2.2*(upper?1:-1)}]}]}>
      <View style={[styles.pToothShape, selected && styles.pToothSelected]}>
        <View style={[styles.pToothCusp, selected && {backgroundColor:COLORS.blue}]} />
        <View style={[styles.pToothRoot, selected && {borderColor:COLORS.blue}]} />
      </View>
      <Text style={[styles.pToothNumber, selected && {color:COLORS.blue,fontWeight:'900'}]}>{number}</Text>
    </Pressable>
  );
}

function PatientDentalChart() {
  const [arch,setArch]=useState('adult');
  const [selected,setSelected]=useState('46');
  const upper=arch==='adult'?PATIENT_UPPER:PATIENT_CHILD_UPPER;
  const lower=arch==='adult'?PATIENT_LOWER:PATIENT_CHILD_LOWER;
  return (
    <View style={styles.pChartCard}>
      <View style={styles.pChartHeader}>
        <View style={{flex:1}}>
          <Text style={styles.pChartEyebrow}>MY ORAL HEALTH</Text>
          <Text style={styles.pChartTitle}>Dental chart</Text>
          <Text style={styles.pChartSub}>Tap a tooth to view its recorded status.</Text>
        </View>
        <View style={styles.pChartBadge}><Text style={styles.pChartBadgeText}>LIVE</Text></View>
      </View>
      <View style={styles.pArchSwitch}>
        <Pressable onPress={()=>setArch('adult')} style={[styles.pArchOption,arch==='adult'&&styles.pArchActive]}><Text style={[styles.pArchText,arch==='adult'&&styles.pArchTextActive]}>Adult</Text></Pressable>
        <Pressable onPress={()=>setArch('child')} style={[styles.pArchOption,arch==='child'&&styles.pArchActive]}><Text style={[styles.pArchText,arch==='child'&&styles.pArchTextActive]}>Children</Text></Pressable>
      </View>
      <View style={styles.pMouth}>
        <Text style={styles.pSide}>RIGHT</Text>
        <View style={styles.pTeethRow}>{upper.map((n,i)=><PatientTooth key={n} number={n} selected={selected===n} upper index={i} total={upper.length} onPress={()=>setSelected(n)}/>)}</View>
        <View style={styles.pMouthCenter}><View style={styles.pMouthLine}/><Text style={styles.pMouthHint}>UPPER</Text></View>
        <View style={styles.pTeethRow}>{lower.map((n,i)=><PatientTooth key={n} number={n} selected={selected===n} index={i} total={lower.length} onPress={()=>setSelected(n)}/>)}</View>
        <Text style={styles.pSide}>LEFT</Text>
      </View>
      <View style={styles.pSelected}>
        <View style={styles.pSelectedIcon}><Text style={styles.pSelectedIconText}>{selected}</Text></View>
        <View style={{flex:1}}><Text style={styles.pSelectedTitle}>Tooth {selected}</Text><Text style={styles.pSelectedSub}>Tap to view treatment history when available.</Text></View>
      </View>
    </View>
  );
}

function PatientAIConsent({ onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const continueAI = async () => {
    setBusy(true); setError('');
    try {
      await signInWithGoogle();
      await giveAIConsent();
      await registerExpoPushToken();
      onDone();
    } catch (e) {
      setError(e?.message || 'Could not enable Dental AI.');
    } finally { setBusy(false); }
  };
  return (
    <View style={styles.aiConsentCard}>
      <Text style={styles.aiEyebrow}>BEFORE FIRST USE</Text>
      <Text style={styles.aiConsentTitle}>Your Dental AI Assistant</Text>
      <Text style={styles.aiConsentText}>AI can explain dental information in simple language, help you prepare questions and flag symptoms that may need urgent attention.</Text>
      <View style={styles.aiSafetyList}>
        <Text style={styles.aiSafetyItem}>• Not a diagnosis</Text>
        <Text style={styles.aiSafetyItem}>• Never prescribes medicines or dosage</Text>
        <Text style={styles.aiSafetyItem}>• Emergency symptoms are flagged conservatively</Text>
        <Text style={styles.aiSafetyItem}>• You can delete your AI chat history</Text>
      </View>
      <Pressable disabled={busy} onPress={continueAI} style={[styles.submitButton,busy&&{opacity:0.55}]}>
        <Text style={styles.submitText}>{busy ? 'Connecting…' : 'Continue with Google & Consent'}</Text>
      </Pressable>
      {!!error && <Text style={styles.aiError}>{error}</Text>}
    </View>
  );
}

function PatientAssistantScreen() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [emergency, setEmergency] = useState(null);
  const [planText, setPlanText] = useState('');
  const [planBusy, setPlanBusy] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [linked, setLinked] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    getAIConsent().then(value => setReady(value)).finally(() => setChecking(false));
  }, []);

  const send = async (text = message) => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true); setMessage('');
    setMessages(prev => [...prev, { role:'user', text:value }]);
    try {
      const result = await patientAIChat(value);
      setEmergency(result?.emergency ? result : null);
      const answer = typeof result?.result === 'string' ? result.result : result?.result?.message || JSON.stringify(result?.result || result);
      setMessages(prev => [...prev, { role:'assistant', text:answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role:'assistant', text:e?.message || 'The assistant is unavailable right now.' }]);
    } finally { setBusy(false); }
  };

  const link = async () => {
    if (!inviteCode.trim()) return;
    setLinking(true);
    try { await linkPatient(inviteCode.trim().toUpperCase()); setLinked(true); Alert.alert('Patient account','Your clinic-issued invite has linked your record to this Google account.'); }
    catch(e){ Alert.alert('Link patient record', e?.message || 'Invalid or expired clinic invite code.'); }
    finally { setLinking(false); }
  };

  const clearHistory = () => Alert.alert('Delete AI chat history?', 'This permanently deletes your saved AI conversation from the clinic AI store.', [
    {text:'Cancel',style:'cancel'},
    {text:'Delete',style:'destructive',onPress:async()=>{try{await deleteAIHistory();setMessages([]);Alert.alert('Deleted','Your AI chat history was deleted.');}catch(e){Alert.alert('Delete failed',e.message||'Could not delete history.');}}}
  ]);

  if (checking) return <View style={styles.aiLoading}><ActivityIndicator size="large" color={COLORS.blue}/></View>;
  if (!ready) return <ScrollView contentContainerStyle={styles.scrollContent}><PatientAIConsent onDone={()=>setReady(true)}/></ScrollView>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.aiHero}>
        <Text style={styles.aiEyebrow}>DR. PRANALI • DENTAL AI</Text>
        <Text style={styles.aiTitle}>Your AI Assistant</Text>
        <Text style={styles.aiSub}>Ask dental questions, understand your treatment plan and get safer next-step guidance.</Text>
        <View style={styles.patientNotDiagnosis}><Text style={styles.patientNotDiagnosisText}>Not a diagnosis • No prescriptions or dosage advice</Text></View>
      </View>
      {!!emergency && <View style={styles.emergencyBanner}><Text style={styles.emergencyTitle}>URGENT DENTAL WARNING</Text><Text style={styles.emergencyText}>{emergency?.result?.message || 'Seek urgent care now.'}</Text></View>}
      {!linked && <View style={styles.linkCard}><Text style={styles.aiCardTitle}>Link your clinic record</Text><Text style={styles.aiCardSub}>Enter the one-time invite code issued by the clinic. Your phone number alone cannot claim a patient record.</Text><TextInput value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" placeholder="Clinic invite code" style={styles.input}/><Pressable onPress={link} disabled={linking} style={styles.submitButton}><Text style={styles.submitText}>{linking?'Linking…':'Link patient record'}</Text></Pressable></View>}
      <View style={styles.quickReplyRow}>
        {['Explain my treatment','I have tooth pain','What should I ask my dentist?','Is this urgent?'].map(chip=><Pressable key={chip} onPress={()=>send(chip)} style={styles.aiQuickChip}><Text style={styles.aiQuickChipText}>{chip}</Text></Pressable>)}
      </View>
      <View style={styles.chatCard}>
        {messages.length===0 && <Text style={styles.chatEmpty}>Start with a question. The assistant will clearly say when something needs a dentist or urgent care.</Text>}
        {messages.map((m,i)=><View key={i} style={[styles.chatBubble,m.role==='user'?styles.chatUser:styles.chatAssistant]}><Text style={styles.chatText}>{m.text}</Text></View>)}
        {busy && <View style={styles.chatBubble}><ActivityIndicator color={COLORS.blue}/></View>}
        <View style={styles.chatComposer}><TextInput value={message} onChangeText={setMessage} placeholder="Ask your dental question…" style={[styles.input,{flex:1,marginRight:8}]} multiline/><Pressable onPress={()=>send()} style={styles.chatSend}><Text style={styles.chatSendText}>Send</Text></Pressable></View>
      </View>
      <View style={styles.aiUtilityCard}>
        <Text style={styles.aiCardTitle}>Plain-language treatment plan</Text>
        <TextInput value={planText} onChangeText={setPlanText} placeholder="Paste your dentist's treatment plan here…" multiline style={[styles.input,{minHeight:70,marginTop:8}]} />
        <Pressable disabled={!planText.trim()||planBusy} onPress={async()=>{setPlanBusy(true);try{const r=await explainTreatment(planText.trim());const answer=typeof r?.result==='string'?r.result:r?.result?.message||JSON.stringify(r?.result);setMessages(prev=>[...prev,{role:'assistant',text:answer}]);setPlanText('');}catch(e){Alert.alert('AI',e.message||'Unavailable');}finally{setPlanBusy(false);}}} style={[styles.submitButton,(!planText.trim()||planBusy)&&{opacity:0.5}]}><Text style={styles.submitText}>{planBusy?'Explaining…':'Explain my treatment plan'}</Text></Pressable>
        <Pressable onPress={clearHistory}><Text style={styles.aiDeleteLink}>Delete my AI chat history</Text></Pressable>
      </View>
    </ScrollView>
  );
}

function AIDentalScreen() {
  return <PatientAssistantScreen />;
}
function ServicesScreen() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Dental Services</Text>
      <Text style={styles.pageSub}>Comprehensive dental care for children and adults.</Text>
      <View style={styles.servicesGrid}>
        {services.map(([name, desc, icon]) => <ServiceCard key={name} name={name} desc={desc} icon={icon} />)}
      </View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function AppointmentScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Missing details', 'Please enter your name, phone, preferred date and time.');
      return;
    }
    setSending(true);
    try {
      const parts = date.split('/');
      const t = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
      if (parts.length !== 3 || !t) throw new Error('Invalid date/time');

      let hour = Number(t[1]);
      const minute = Number(t[2] || '00');
      const ampm = (t[3] || '').toUpperCase();
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      const startsAt =
        parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0') +
        'T' + String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ':00+05:30';

      await requestPublicAppointment({
        name: name.trim(),
        phone: phone.trim(),
        starts_at: startsAt,
        treatment_type: reason.trim() || 'Dental consultation',
        note: note.trim() || null,
        intelligence_request: false,
      });
      Alert.alert('Appointment Requested', 'Your appointment request has been sent to the clinic.');
      setName(''); setPhone(''); setDate(''); setTime(''); setReason(''); setNote('');
    } catch {
      Alert.alert(
        'Connection problem',
        `The clinic appointment service could not be reached right now. Please call ${PHONE} if you need immediate assistance.`
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Book Appointment</Text>
      <Text style={styles.pageSub}>Choose your preferred slot. The clinic will confirm your appointment.</Text>
      <View style={styles.formCard}>
        <Field label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
        <Field label="Phone Number" value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" keyboardType="phone-pad" />
        <Text style={styles.fieldLabel}>Preferred Date</Text>
        <Pressable onPress={() => setShowDatePicker(true)} style={styles.input}>
          <Text style={{ color: date ? COLORS.text : '#91A1B0', fontSize: 15 }}>{date || 'Select date'}</Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={date ? (() => { const [d, m, y] = date.split('/').map(Number); return new Date(y, m - 1, d); })() : new Date()}
            mode="date"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                const d = String(selectedDate.getDate()).padStart(2, '0');
                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                setDate(`${d}/${m}/${selectedDate.getFullYear()}`);
              }
            }}
          />
        )}
        <Text style={styles.fieldLabel}>Preferred Time</Text>
        <Pressable onPress={() => setShowTimePicker(true)} style={styles.input}>
          <Text style={{ color: time ? COLORS.text : '#91A1B0', fontSize: 15 }}>{time || 'Select time'}</Text>
        </Pressable>
        {showTimePicker && (
          <DateTimePicker
            value={(() => {
              const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
              if (!m) return new Date();
              let h = Number(m[1]);
              const min = Number(m[2]);
              const ap = m[3].toUpperCase();
              if (ap === 'PM' && h !== 12) h += 12;
              if (ap === 'AM' && h === 12) h = 0;
              const d = new Date();
              d.setHours(h, min, 0, 0);
              return d;
            })()}
            mode="time"
            is24Hour={false}
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) {
                let h = selectedTime.getHours();
                const min = String(selectedTime.getMinutes()).padStart(2, '0');
                const ap = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                setTime(`${h}:${min} ${ap}`);
              }
            }}
          />
        )}
        <Text style={styles.fieldLabel}>Reason for Visit</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          {services.slice(0, 8).map(([service]) => (
            <Pressable key={service} onPress={() => setReason(service)} style={[styles.chip, reason === service && styles.chipActive]}>
              <Text style={[styles.chipText, reason === service && styles.chipTextActive]}>{service}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Field label="Additional Message" value={note} onChangeText={setNote} placeholder="Tell us anything important" multiline />
        <Pressable disabled={sending} onPress={submit} style={({ pressed }) => [styles.submitButton, pressed && { opacity: 0.8 }, sending && { opacity: 0.55 }]}>
          <Text style={styles.submitText}>{sending ? 'Sending…' : 'Submit Appointment Request'}</Text>
        </Pressable>
        <Text style={styles.formNote}>Or call {PHONE} for immediate assistance.</Text>
      </View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#91A1B0"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function GalleryScreen() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Gallery</Text>
      <Text style={styles.pageSub}>A glimpse of Dr. Pranali and the clinic experience.</Text>
      <View style={styles.galleryCard}>
        <Image source={require('./assets/dr-pranali.jpg')} style={styles.galleryImage} />
        <Text style={styles.galleryTitle}>Dr. Pranali – BDS Dental Surgeon</Text>
        <Text style={styles.gallerySub}>Patient-focused dental care with a gentle approach.</Text>
      </View>
      <View style={styles.galleryPlaceholder}>
        <Text style={styles.galleryPlaceholderIcon}>＋</Text>
        <Text style={styles.galleryTitle}>Clinic photos can be added here</Text>
        <Text style={styles.gallerySub}>We can replace these cards with real clinic, treatment and before/after images.</Text>
      </View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function ContactScreen() {
  const openMaps = () => Linking.openURL('https://www.google.com/maps/search/?api=1&query=Taloja%20Navi%20Mumbai');
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Contact Clinic</Text>
      <Text style={styles.pageSub}>We are here to help you with your dental care.</Text>
      <View style={styles.contactCard}>
        <Text style={styles.contactLabel}>Dr. Pranali Dental</Text>
        <Text style={styles.contactDegree}>BDS – Dental Surgeon</Text>
        <View style={styles.contactLine}><Text style={styles.contactIcon}>⌖</Text><Text style={styles.contactText}>Taloja, Navi Mumbai</Text></View>
        <View style={styles.contactLine}><Text style={styles.contactIcon}>◷</Text><Text style={styles.contactText}>Monday – Sunday{`\n`}10:00 AM – 9:00 PM{`\n`}By Appointment Only</Text></View>
        <View style={styles.contactLine}><Text style={styles.contactIcon}>☎</Text><Text style={styles.contactText}>{PHONE}</Text></View>
        <ActionButton label="Call Clinic" icon="☎" onPress={() => Linking.openURL(`tel:+${WHATSAPP}`)} />
        <ActionButton label="WhatsApp Clinic" icon="◉" variant="secondary" onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`)} />
        <Pressable onPress={openMaps} style={styles.mapButton}><Text style={styles.mapButtonText}>Open Location in Google Maps</Text></Pressable>
      </View>
      <View style={styles.infoCard}><Text style={styles.infoTitle}>Emergency Dental Care</Text><Text style={styles.aboutText}>For urgent dental pain, swelling, bleeding or a dental injury, call the clinic directly so we can guide you on the next step.</Text></View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  useEffect(() => {
    let active = true;
    const slowNotice = setTimeout(() => { if (active) setServerMessage('Waking up the server, this can take up to a minute.'); }, 1800);
    fetch(API_URL + '/health', { method: 'GET' })
      .then(() => { if (active) setServerMessage(''); })
      .catch(() => { if (active) setServerMessage('Waking up the server, this can take up to a minute.'); })
      .finally(() => clearTimeout(slowNotice));
    return () => { active = false; clearTimeout(slowNotice); };
  }, []);
  const [tab, setTab] = useState('Home');
  if (!started) return <WelcomeScreen serverMessage={serverMessage} onStart={(nextTab) => { setStarted(true); if (nextTab) setTab(nextTab); }} />;
  const screen = useMemo(() => {
    if (tab === 'AI Dental') return <AIDentalScreen />;
    if (tab === 'Services') return <ServicesScreen />;
    if (tab === 'Appointment') return <AppointmentScreen />;
    if (tab === 'Gallery') return <GalleryScreen />;
    if (tab === 'Contact') return <ContactScreen />;
    return <HomeScreen go={setTab} />;
  }, [tab]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dr. Pranali Dental</Text>
          <Text style={styles.headerSub}>Healthy Smile, Happy You!</Text>
        </View>
        <Pressable onPress={() => Alert.alert('Dr. Pranali Dental', `BDS – Dental Surgeon\n\nTaloja, Navi Mumbai\n${PHONE}`)} style={styles.settings}><Text style={styles.settingsText}>⚙</Text></Pressable>
      </View>
      <View style={styles.body}>{screen}</View>
      <View style={styles.bottomNav}>
        {tabs.map(([name, icon]) => {
          const active = tab === name;
          return (
            <Pressable key={name} onPress={() => setTab(name)} style={styles.tab}>
              <Text style={[styles.tabIcon, active && styles.tabActive]}>{icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabActive]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginRedesignContent:{flexGrow:1,paddingHorizontal:20,paddingTop:18,paddingBottom:18,alignItems:'center',backgroundColor:'#F4FBFF'},
  patientPhotoPlaceholder:{width:'100%',height:160,borderRadius:22,backgroundColor:'#E0F4FC',borderWidth:1,borderColor:'#B9E8F4',alignItems:'center',justifyContent:'center',marginBottom:10},
  photoPlaceholderTitle:{fontSize:11,fontWeight:'900',color:'#0C3B82',letterSpacing:1,textAlign:'center'},photoPlaceholderSub:{fontSize:11,color:'#0C3B82',marginTop:6},
  logoPlaceholder:{width:86,height:62,borderRadius:14,borderWidth:1,borderStyle:'dashed',borderColor:'#0A84E8',alignItems:'center',justifyContent:'center',marginTop:2},
  logoPlaceholderText:{fontSize:9,fontWeight:'900',color:'#0C3B82'},logoPlaceholderSub:{fontSize:6,color:'#0C3B82',textAlign:'center',paddingHorizontal:4,marginTop:2},
  loginWelcomeHeading:{fontSize:24,fontWeight:'900',color:'#0C3B82',marginTop:14},loginWelcomeSub:{fontSize:12,color:'#244D79',textAlign:'center',lineHeight:18,marginTop:3,marginBottom:12},
  loginProviderButton:{width:'100%',minHeight:46,borderRadius:13,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#E0EBF6',flexDirection:'row',alignItems:'center',justifyContent:'center',marginTop:7},
  providerIconGoogle:{fontSize:20,fontWeight:'900',color:'#0A84E8',marginRight:12},providerIconApple:{fontSize:18,color:'#111111',marginRight:12},loginProviderText:{fontSize:13,fontWeight:'700',color:'#142C4C'},
  loginOrRow:{width:'100%',flexDirection:'row',alignItems:'center',gap:10,marginVertical:12},loginOrLine:{height:1,flex:1,backgroundColor:'#D6E7F5'},loginOrText:{fontSize:11,color:'#4F6D90'},
  loginInputRow:{width:'100%',minHeight:46,borderRadius:12,borderWidth:1,borderColor:'#D6E7F5',backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',paddingHorizontal:12,marginTop:8},
  loginInputIcon:{fontSize:18,color:'#0C3B82',marginRight:9},countryCode:{fontSize:12,color:'#0C3B82',fontWeight:'800',paddingRight:8},loginInput:{flex:1,minHeight:42,color:'#18334D',fontSize:13},
  loginRememberRow:{width:'100%',flexDirection:'row',alignItems:'center',marginTop:10},rememberToggle:{width:20,height:20,borderRadius:4,borderWidth:1,borderColor:'#0A84E8',backgroundColor:'#0A84E8',alignItems:'center',justifyContent:'center'},rememberCheck:{color:'#FFFFFF',fontWeight:'900'},rememberLabel:{fontSize:11,color:'#18334D',marginLeft:7},forgotText:{fontSize:11,color:'#0A84E8',marginLeft:'auto'},
  loginGradientButton:{width:'100%',minHeight:46,borderRadius:14,backgroundColor:'#0A84E8',alignItems:'center',justifyContent:'center',marginTop:12,borderBottomWidth:3,borderBottomColor:'#00C6C8'},loginGradientText:{fontSize:15,color:'#FFFFFF',fontWeight:'900'},
  createAccountLine:{fontSize:12,color:'#18334D',marginTop:12},createAccountLink:{fontWeight:'900',color:'#00AEB8'},
  loginQuickActions:{width:'100%',flexDirection:'row',justifyContent:'space-between',gap:6,backgroundColor:'#FFFFFF',borderRadius:18,padding:10,marginTop:14,borderWidth:1,borderColor:'#D6E7F5'},
  loginQuickAction:{flex:1,alignItems:'center',justifyContent:'center',minHeight:65},loginQuickIcon:{fontSize:20,color:'#0C3B82'},loginQuickLabel:{fontSize:9,color:'#0C3B82',textAlign:'center',marginTop:5},

  serverWakeMessage:{width:'100%',textAlign:'center',fontSize:11,color:'#0C3B82',marginTop:8},
  authErrorBox:{width:'100%',marginTop:12,padding:12,borderRadius:12,backgroundColor:'#FFF1F1',borderWidth:1,borderColor:'#F2C3C3'},
  authErrorTitle:{fontSize:13,fontWeight:'900',color:'#8B1E1E'},authErrorText:{fontSize:12,color:'#6F2424',marginTop:4},authErrorDetail:{fontSize:10,color:'#6F2424',marginTop:5},authRetry:{marginTop:8,padding:10,backgroundColor:'#0A84E8',borderRadius:10,alignItems:'center'},authRetryText:{color:'#FFFFFF',fontWeight:'800'},
  welcomeSafe:{flex:1,backgroundColor:'#F7FBFF'},
  welcomeContent:{flexGrow:1,paddingHorizontal:22,paddingTop:18,paddingBottom:18,alignItems:'center'},
  welcomeTop:{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  brandBadge:{flexDirection:'row',alignItems:'center',gap:9},
  brandBadgeLogo:{width:42,height:42},
  welcomeBrand:{fontSize:17,fontWeight:'900',color:COLORS.navy},
  welcomeClinic:{fontSize:8.5,fontWeight:'900',letterSpacing:2,color:COLORS.blue,marginTop:1},
  skipButton:{paddingHorizontal:13,paddingVertical:8,borderRadius:18,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#DDEAF5'},
  skipText:{fontSize:12,fontWeight:'800',color:'#657789'},
  welcomeTitle:{fontSize:34,lineHeight:38,fontWeight:'900',color:'#0B2E4F',marginTop:38,textAlign:'center',letterSpacing:-1},
  welcomeTitleBlue:{fontSize:34,lineHeight:38,fontWeight:'900',color:'#1677D2',textAlign:'center',letterSpacing:-1},
  welcomeSub:{fontSize:14,color:'#657789',lineHeight:20,textAlign:'center',marginTop:10,maxWidth:290},
  logoStage:{width:'100%',height:300,alignItems:'center',justifyContent:'flex-end',marginTop:3,position:'relative'},
  logoGlow:{position:'absolute',width:245,height:245,borderRadius:125,backgroundColor:'#E4F2FF',top:30,opacity:0.8},
  hero3dLogo:{width:270,height:270,zIndex:2},
  logoPedestal:{position:'absolute',bottom:18,width:220,height:22,borderRadius:14,backgroundColor:'#D8EBFB',borderWidth:1,borderColor:'#BBDCF6',shadowOpacity:0.12,shadowRadius:12,elevation:5},
  logoPedestalGlow:{position:'absolute',left:18,right:18,top:5,height:5,borderRadius:4,backgroundColor:'#4EA5F5',opacity:0.75},
  googleButton:{width:'100%',height:50,borderRadius:25,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#D6E2EE',alignItems:'center',justifyContent:'center',marginBottom:8},
  googleButtonText:{color:'#18334D',fontSize:14,fontWeight:'900'},
  googleMessage:{fontSize:11,color:'#6B7D8F',textAlign:'center',marginBottom:8},
  getStarted:{width:'100%',height:58,borderRadius:29,backgroundColor:'#1677D2',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:25,paddingRight:7,shadowOpacity:0.18,shadowRadius:12,elevation:4},
  getStartedText:{color:'#FFFFFF',fontSize:16,fontWeight:'900',marginLeft:70},
  arrowCircle:{width:44,height:44,borderRadius:22,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},
  arrowText:{fontSize:22,fontWeight:'900',color:'#1677D2'},
  exploreButton:{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:14},
  exploreText:{fontSize:13,fontWeight:'800',color:'#18334D'},
  exploreArrow:{fontSize:16,color:'#1677D2'},
  welcomeTrust:{width:'100%',backgroundColor:'#FFFFFF',borderRadius:18,paddingVertical:13,paddingHorizontal:8,flexDirection:'row',alignItems:'center',justifyContent:'space-around',borderWidth:1,borderColor:'#E3EDF5',marginTop:5},
  trustNumber:{fontSize:16,fontWeight:'900',color:'#1677D2',textAlign:'center'},
  trustLabel:{fontSize:8.5,fontWeight:'700',color:'#657789',textAlign:'center',marginTop:2},
  trustDivider:{width:1,height:28,backgroundColor:'#E5EDF4'},
  terms:{fontSize:9.5,color:'#8A98A6',textAlign:'center',lineHeight:15,marginTop:14},
  termsBlue:{fontSize:9.5,color:'#1677D2',fontWeight:'800',textAlign:'center',marginTop:2},

  safe: { flex: 1, backgroundColor: COLORS.bg },
  body: { flex: 1 },
  header: { backgroundColor: COLORS.white, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E7EEF5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: COLORS.navy, fontSize: 21, fontWeight: '900', letterSpacing: 0.1 },
  headerSub: { color: COLORS.muted, fontSize: 12.5, marginTop: 3, fontWeight: '600' },
  settings: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D6E8F7' },
  settingsText: { fontSize: 21, color: COLORS.blue },
  scrollContent: { padding: 16, paddingBottom: 24 },
  hero: { backgroundColor: COLORS.pale, borderRadius: 26, padding: 15, flexDirection: 'row', gap: 13, marginBottom: 14, borderWidth: 1, borderColor: '#DCECF9' },
  profileColumn: { width: '39%', alignItems: 'center' },
  profileImage: { width: 118, height: 118, borderRadius: 59, borderWidth: 4, borderColor: COLORS.white, marginTop: 8 },
  bdsBadge: { marginTop: -7, backgroundColor: COLORS.blue, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 2, borderColor: COLORS.white },
  bdsText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  doctorName: { color: COLORS.navy, fontWeight: '900', fontSize: 21, marginTop: 5 },
  degree: { color: COLORS.text, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 3 },
  divider: { height: 1, backgroundColor: '#D6E5F4', width: '95%', marginVertical: 10 },
  smallInfo: { color: COLORS.text, fontSize: 11.5, lineHeight: 18, textAlign: 'center', marginTop: 2 },
  byAppointment: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 2 },
  heroCopy: { flex: 1, paddingTop: 8 },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  tooth: { fontSize: 22, color: COLORS.blue },
  brand: { color: COLORS.blue, fontSize: 16, fontWeight: '800' },
  heroTitle: { color: '#0B2E4F', fontSize: 27, lineHeight: 31, fontWeight: '900' },
  heroBlue: { color: COLORS.blue },
  heroSub: { color: '#5E7080', fontSize: 12.5, lineHeight: 18, marginTop: 10, marginBottom: 6 },
  actionButton: { minHeight: 46, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, marginTop: 8, borderWidth: 1 },
  primaryButton: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  secondaryButton: { backgroundColor: COLORS.white, borderColor: '#CFE0F1' },
  actionIcon: { fontSize: 20, color: COLORS.blue, marginRight: 8 },
  actionText: { color: COLORS.blue, fontWeight: '800', fontSize: 14 },
  whiteText: { color: COLORS.white },
  featureRow: { backgroundColor: COLORS.white, borderRadius: 18, flexDirection: 'row', paddingVertical: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E8EFF6' },
  feature: { flex: 1, alignItems: 'center', paddingHorizontal: 3, borderRightWidth: 1, borderRightColor: '#EDF1F5' },
  featureIcon: { color: COLORS.blue, fontSize: 25, height: 31 },
  featureTitle: { color: COLORS.navy, fontSize: 10.5, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  featureSub: { color: COLORS.navy, fontSize: 10.5, textAlign: 'center' },
  aboutCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E8EFF6', marginBottom: 16 },
  sectionTitle: { color: COLORS.navy, fontSize: 22, fontWeight: '900' },
  aboutText: { color: COLORS.muted, fontSize: 14, lineHeight: 22, marginTop: 9 },
  aboutTooth: { fontSize: 62, color: COLORS.blue, marginLeft: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTooth: { color: COLORS.blue, fontSize: 24 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  serviceCard: { width: '48.3%', backgroundColor: COLORS.white, borderRadius: 16, padding: 13, minHeight: 132, marginBottom: 10, borderWidth: 1, borderColor: '#E2EBF3', shadowOpacity: 0.025, shadowRadius: 7, elevation: 1 },
  serviceIconWrap: { width: 33, height: 33, borderRadius: 10, backgroundColor: '#F0F7FF', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  serviceIcon: { color: COLORS.blue, fontSize: 20 },
  serviceName: { color: COLORS.navy, fontSize: 13.5, fontWeight: '800', lineHeight: 18 },
  serviceDesc: { color: COLORS.muted, fontSize: 11.5, lineHeight: 16, marginTop: 5 },
  viewAll: { backgroundColor: '#E8F4FF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 2, borderWidth: 1, borderColor: '#D6E9F8' },
  viewAllText: { color: COLORS.blue, fontWeight: '800' },
  pageTitle: { color: COLORS.navy, fontSize: 28, fontWeight: '900', marginTop: 4, letterSpacing: -0.3 },
  pageSub: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginTop: 5, marginBottom: 15 },
  formCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 17, borderWidth: 1, borderColor: '#E2EBF3', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  fieldLabel: { color: COLORS.navy, fontSize: 13, fontWeight: '800', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#F9FBFD', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: Platform.OS === 'ios' ? 13 : 10, color: COLORS.text, fontSize: 15 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.white },
  chipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  chipText: { color: COLORS.navy, fontSize: 11.5, fontWeight: '700' },
  chipTextActive: { color: COLORS.white },
  submitButton: { backgroundColor: COLORS.blue, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 15, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  submitText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  formNote: { color: COLORS.muted, textAlign: 'center', fontSize: 12, marginTop: 11 },
  galleryCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: '#E5EDF5' },
  galleryImage: { width: '100%', height: 330, borderRadius: 14, resizeMode: 'cover' },
  galleryTitle: { color: COLORS.navy, fontSize: 17, fontWeight: '800', marginTop: 10 },
  gallerySub: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  galleryPlaceholder: { backgroundColor: '#EEF7FF', borderRadius: 18, padding: 25, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#D8EAF9' },
  galleryPlaceholderIcon: { fontSize: 40, color: COLORS.blue },
  contactCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#E5EDF5' },
  contactLabel: { color: COLORS.navy, fontSize: 23, fontWeight: '900' },
  contactDegree: { color: COLORS.blue, fontWeight: '800', fontSize: 14, marginTop: 3, marginBottom: 14 },
  contactLine: { flexDirection: 'row', marginTop: 12, alignItems: 'flex-start' },
  contactIcon: { color: COLORS.blue, fontSize: 21, width: 30 },
  contactText: { color: COLORS.text, fontSize: 14, lineHeight: 21, flex: 1 },
  mapButton: { marginTop: 10, backgroundColor: '#EAF4FF', padding: 14, borderRadius: 13, alignItems: 'center' },
  mapButtonText: { color: COLORS.blue, fontWeight: '800' },
  infoCard: { backgroundColor: COLORS.pale, borderRadius: 18, padding: 18, marginTop: 12 },
  infoTitle: { color: COLORS.navy, fontSize: 18, fontWeight: '900' },
  bottomNav: { height: 70, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#E1EAF2', flexDirection: 'row', paddingBottom: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { color: '#718090', fontSize: 23, lineHeight: 27 },
  tabLabel: { color: '#718090', fontSize: 10.5, marginTop: 2, fontWeight: '700' },
  tabActive: { color: COLORS.blue },
  pChartCard:{backgroundColor:COLORS.white,borderRadius:20,padding:15,borderWidth:1,borderColor:'#E1EAF2',marginBottom:15},
  pChartHeader:{flexDirection:'row',alignItems:'center'},pChartEyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.1,color:COLORS.blue},pChartTitle:{fontSize:23,fontWeight:'900',color:COLORS.navy,marginTop:2},pChartSub:{fontSize:11,color:COLORS.muted,marginTop:3},pChartBadge:{backgroundColor:'#E7F8EF',paddingHorizontal:8,paddingVertical:5,borderRadius:9},pChartBadgeText:{fontSize:8,fontWeight:'900',color:'#16824D'},
  pArchSwitch:{flexDirection:'row',borderWidth:1,borderColor:'#E4D3A0',borderRadius:10,overflow:'hidden',marginTop:13},pArchOption:{flex:1,paddingVertical:8,alignItems:'center'},pArchActive:{backgroundColor:'#F4C24A'},pArchText:{fontSize:12,fontWeight:'800',color:'#D5A63A'},pArchTextActive:{color:COLORS.white},
  pMouth:{marginTop:14,paddingVertical:7,backgroundColor:'#FCFCFD',borderRadius:16,borderWidth:1,borderColor:'#EEF1F4',alignItems:'center'},pSide:{fontSize:7,fontWeight:'900',letterSpacing:1.2,color:'#B7C0C9',marginVertical:3},pTeethRow:{flexDirection:'row',alignItems:'center',justifyContent:'center'},pToothItem:{width:18,alignItems:'center',marginHorizontal:1},pToothShape:{width:17,height:28,borderWidth:1.2,borderColor:'#C8D0D8',backgroundColor:'#F4F6F8',borderRadius:10,alignItems:'center'},pToothSelected:{backgroundColor:'#EAF4FF',borderColor:COLORS.blue,borderWidth:1.7},pToothCusp:{width:5,height:5,borderRadius:3,backgroundColor:'#B9C3CC',marginTop:5},pToothRoot:{position:'absolute',width:5,height:7,top:21,borderLeftWidth:1,borderRightWidth:1,borderBottomWidth:1,borderColor:'#B9C3CC',borderBottomLeftRadius:4,borderBottomRightRadius:4},pToothNumber:{fontSize:7,color:'#A6AFB8',marginTop:3},pMouthCenter:{height:24,alignItems:'center',justifyContent:'center'},pMouthLine:{width:115,height:1,backgroundColor:'#EEF1F4'},pMouthHint:{fontSize:7,color:'#C2C9D0',letterSpacing:1,marginTop:2},
  pSelected:{flexDirection:'row',alignItems:'center',backgroundColor:'#F7FAFD',borderRadius:12,padding:9,marginTop:10,borderWidth:1,borderColor:'#E4EDF5'},pSelectedIcon:{width:36,height:36,borderRadius:10,backgroundColor:'#EAF4FF',alignItems:'center',justifyContent:'center'},pSelectedIconText:{fontSize:11,fontWeight:'900',color:COLORS.blue},pSelectedTitle:{fontSize:13,fontWeight:'900',color:COLORS.navy},pSelectedSub:{fontSize:10,color:COLORS.muted,marginTop:2},
  aiHero: { backgroundColor: '#0B2E4F', borderRadius: 22, padding: 20, marginBottom: 14 },
  aiEyebrow: { color: '#8FCBFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  aiTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 5 },
  aiSub: { color: '#D9EAF7', fontSize: 14, lineHeight: 21, marginTop: 8 },
  scanoPill: { alignSelf: 'flex-start', backgroundColor: '#16476D', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 14 },
  scanoPillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  aiCard: { backgroundColor: COLORS.white, borderRadius: 17, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E2EBF3' },
  aiIcon: { width: 45, height: 45, borderRadius: 13, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  aiIconText: { color: COLORS.blue, fontSize: 23, fontWeight: '900' },
  aiCardTitle: { color: COLORS.navy, fontSize: 15, fontWeight: '900' },
  aiCardSub: { color: COLORS.muted, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  safetyCard: { backgroundColor: '#FFF9E9', borderRadius: 17, padding: 16, marginTop: 4, borderWidth: 1, borderColor: '#F1E2AE' },
  safetyTitle: { color: COLORS.navy, fontSize: 16, fontWeight: '900' },
  safetyText: { color: COLORS.text, fontSize: 12.5, lineHeight: 19, marginTop: 6 },
  commandLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginBottom: 7 },
  commandChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: COLORS.white },
  commandChipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  commandChipText: { color: COLORS.navy, fontSize: 11, fontWeight: '800' },
  commandChipTextActive: { color: COLORS.white },
  aiCardLarge: { backgroundColor: COLORS.white, borderRadius: 19, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: '#DCE8F4' },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 5 },
  pipelineItem: { color: COLORS.blue, backgroundColor: '#EAF4FF', fontSize: 9, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7 },
  pipelineArrow: { color: COLORS.muted, fontSize: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  statusDot: { color: COLORS.green, fontSize: 10, marginRight: 6 },
  statusText: { color: COLORS.muted, fontSize: 11.5, fontWeight: '700' },
  scanFlow: { backgroundColor: '#EEF7FF', borderRadius: 17, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#D6E9F8' },
  scanFlowTitle: { color: COLORS.navy, fontSize: 16, fontWeight: '900' },
  scanFlowText: { color: COLORS.text, fontSize: 12.5, lineHeight: 19, marginTop: 6 },
  homeAICard:{backgroundColor:COLORS.white,borderRadius:18,padding:14,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#D7E8F6',marginBottom:14},
  homeAIIcon:{width:44,height:44,borderRadius:14,backgroundColor:'#EAF4FF',alignItems:'center',justifyContent:'center',marginRight:12},
  homeAIIconText:{fontSize:23,color:COLORS.blue,fontWeight:'900'},homeAITitle:{fontSize:14,fontWeight:'900',color:COLORS.navy},homeAISub:{fontSize:11.5,color:COLORS.muted,lineHeight:17,marginTop:3},homeAIArrow:{fontSize:28,color:COLORS.blue,marginLeft:8},
  aiConsentCard:{backgroundColor:COLORS.white,borderRadius:22,padding:20,borderWidth:1,borderColor:'#DCE8F4',marginTop:8},aiConsentTitle:{fontSize:27,fontWeight:'900',color:COLORS.navy,marginTop:5},aiConsentText:{fontSize:13.5,color:COLORS.text,lineHeight:20,marginTop:8},aiSafetyList:{backgroundColor:'#F7FAFD',borderRadius:14,padding:14,marginTop:14},aiSafetyItem:{fontSize:12.5,color:COLORS.text,lineHeight:22},aiError:{color:'#C53E3E',fontSize:12,marginTop:10},
  aiLoading:{paddingTop:60,alignItems:'center'},patientNotDiagnosis:{alignSelf:'flex-start',backgroundColor:'#16476D',borderRadius:12,paddingHorizontal:10,paddingVertical:7,marginTop:13},patientNotDiagnosisText:{color:'#FFF',fontSize:10,fontWeight:'900'},emergencyBanner:{backgroundColor:'#FFF0F0',borderWidth:1,borderColor:'#E6A0A0',borderRadius:18,padding:15,marginBottom:12},emergencyTitle:{color:'#A52828',fontSize:11,fontWeight:'900',letterSpacing:1},emergencyText:{color:'#6D2525',fontSize:13,lineHeight:19,marginTop:5},quickReplyRow:{gap:8,paddingBottom:12},aiQuickChip:{borderWidth:1,borderColor:'#D5E3EF',borderRadius:18,paddingHorizontal:12,paddingVertical:9,backgroundColor:COLORS.white},aiQuickChipText:{color:COLORS.navy,fontSize:11,fontWeight:'800'},chatCard:{backgroundColor:COLORS.white,borderRadius:19,padding:14,borderWidth:1,borderColor:'#DCE8F4'},chatEmpty:{color:COLORS.muted,fontSize:12.5,lineHeight:19,padding:8},chatBubble:{padding:11,borderRadius:15,marginBottom:8,maxWidth:'92%'},chatUser:{backgroundColor:'#EAF4FF',alignSelf:'flex-end'},chatAssistant:{backgroundColor:'#F5F7F9',alignSelf:'flex-start'},chatText:{color:COLORS.text,fontSize:13,lineHeight:19},chatComposer:{flexDirection:'row',alignItems:'flex-end',marginTop:6},chatSend:{backgroundColor:COLORS.blue,borderRadius:12,paddingHorizontal:14,paddingVertical:12},chatSendText:{color:'#FFF',fontWeight:'900'},aiUtilityCard:{backgroundColor:COLORS.white,borderRadius:18,padding:15,borderWidth:1,borderColor:'#E2EBF3',marginTop:12},aiUtilityLink:{color:COLORS.blue,fontSize:13,fontWeight:'900',paddingVertical:10},aiDeleteLink:{color:'#B33434',fontSize:12,fontWeight:'800',paddingVertical:10},linkCard:{backgroundColor:COLORS.white,borderRadius:18,padding:15,borderWidth:1,borderColor:'#E2EBF3',marginBottom:12},
  bottomSpacer: { height: 8 },
});
