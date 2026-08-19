import React, { useMemo, useState } from 'react';
import {
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

// Your local API server. Keep the phone and computer on the same Wi-Fi.
// If the API is deployed later, replace this URL with the live HTTPS URL.
const API_URL = 'http://192.168.0.104:8080';
const PHONE = '9137007432';
const WHATSAPP = '919137007432';

const COLORS = {
  navy: '#0B2E4F',
  blue: '#1677D2',
  blue2: '#2B7DE9',
  pale: '#EAF5FF',
  bg: '#F5F9FC',
  text: '#18334D',
  muted: '#657789',
  border: '#DCE8F4',
  white: '#FFFFFF',
  green: '#20B96B',
};

const services = [
  ['Dental Check-up', 'Regular oral examination'],
  ['Scaling & Polishing', 'Remove plaque & stains'],
  ['Tooth Whitening', 'Brighter & whiter smile'],
  ['Dental Fillings', 'Tooth-coloured restorations'],
  ['Root Canal Treatment', 'Painless RCT care'],
  ['Dental Crowns', 'Protect damaged teeth'],
  ['Dental Bridges', 'Replace missing teeth'],
  ['Dental Implants', 'Permanent tooth replacement'],
  ['Tooth Extraction', 'Safe & gentle extractions'],
  ['Wisdom Tooth Removal', 'Pain-free removal of wisdom teeth'],
  ['Dentures', 'Complete & partial dentures'],
  ['Kids Dental Care', 'Specialized care for children'],
  ['Orthodontic Braces', 'Straighten your teeth'],
  ['Clear Aligners (Invisalign)', 'Invisible teeth alignment'],
  ['Gum Disease Treatment', 'Healthy gums, healthy smile'],
  ['Cosmetic Dentistry', 'Smile makeover solutions'],
  ['Veneers', 'Perfect smile makeover'],
  ['Full Mouth Rehabilitation', 'Complete dental restoration'],
  ['Dental Sealants', 'Protects from cavities'],
  ['Emergency Dental Care', 'Immediate care when you need it'],
];

const tabs = [
  ['Home', '⌂'],
  ['Services', '♢'],
  ['Appointment', '▣'],
  ['Gallery', '▧'],
  ['Contact', '☎'],
];

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

function ServiceCard({ name, desc }) {
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceIconWrap}><Text style={styles.serviceIcon}>♧</Text></View>
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
        {services.slice(0, 8).map(([name, desc]) => <ServiceCard key={name} name={name} desc={desc} />)}
      </View>
      <Pressable onPress={() => go('Services')} style={styles.viewAll}><Text style={styles.viewAllText}>View All Dental Services →</Text></Pressable>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function ServicesScreen() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Dental Services</Text>
      <Text style={styles.pageSub}>Comprehensive dental care for children and adults.</Text>
      <View style={styles.servicesGrid}>
        {services.map(([name, desc]) => <ServiceCard key={name} name={name} desc={desc} />)}
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
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Missing details', 'Please enter your name, phone, preferred date and time.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, date, time, reason }),
      });
      if (!response.ok) throw new Error('API error');
      Alert.alert('Appointment Requested', 'Your appointment request has been sent to the clinic.');
      setName(''); setPhone(''); setDate(''); setTime(''); setReason('');
    } catch {
      Alert.alert(
        'Connection problem',
        `The appointment API could not be reached at ${API_URL}. Keep the computer and phone on the same Wi-Fi and make sure the API is running.`
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
        <Field label="Preferred Date" value={date} onChangeText={setDate} placeholder="DD/MM/YYYY" />
        <Field label="Preferred Time" value={time} onChangeText={setTime} placeholder="e.g. 6:30 PM" />
        <Text style={styles.fieldLabel}>Reason for Visit</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          {services.slice(0, 8).map(([service]) => (
            <Pressable key={service} onPress={() => setReason(service)} style={[styles.chip, reason === service && styles.chipActive]}>
              <Text style={[styles.chipText, reason === service && styles.chipTextActive]}>{service}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Field label="Additional Message" value={reason} onChangeText={setReason} placeholder="Tell us anything important" multiline />
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
  const [tab, setTab] = useState('Home');
  const screen = useMemo(() => {
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
  bottomSpacer: { height: 8 },
});
