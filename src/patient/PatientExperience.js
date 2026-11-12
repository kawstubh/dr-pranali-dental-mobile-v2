import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet,
  Text as NativeText, TextInput as NativeTextInput, useWindowDimensions, View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { useTranslation, LanguageSwitch } from '../i18n';
import { BRAND } from '../brandConstants';
import { DENTAL_SERVICES, DENTAL_SERVICE_CATEGORIES } from '../../shared/dentalServices';
import { signInWithGoogle, supabase } from '../auth/googleAuth';
import { DENTAL_API_URL, requestPublicAppointment } from '../api/dentalApi';

const C = {
  navy: '#0C3B82', blue: '#0A84E8', teal: '#00C6C8', ice: '#F4FBFF',
  white: '#FFFFFF', text: '#18334D', muted: '#657789', border: '#DCE8F4',
  softBlue: '#EAF4FF', softTeal: '#E8FAFA', green: '#16865D', red: '#B54747',
};
export const FontReadyContext = React.createContext(true);
const FONT_BY_WEIGHT = {
  '100': 'InterRegular', '200': 'InterRegular', '300': 'InterRegular',
  '400': 'InterRegular', '500': 'InterMedium', '600': 'InterSemiBold',
  '700': 'InterBold', '800': 'InterExtraBold', '900': 'InterExtraBold',
  normal: 'InterRegular', bold: 'InterBold',
};
function resolveTextStyle(style, fontReady) {
  const flattened = StyleSheet.flatten(style) || {};
  const weight = String(flattened.fontWeight || '400');
  const { fontWeight, fontFamily, ...rest } = flattened;
  return [rest, fontReady ? { fontFamily: FONT_BY_WEIGHT[weight] || 'InterRegular' } : {}];
}
const CLINIC_HOURS_LABEL = '10:00 AM – 2:00 PM and 5:00 PM – 9:00 PM';
const CLINIC_TIME_SLOTS = [
  '10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM',
  '5:00 PM','5:30 PM','6:00 PM','6:30 PM',
  '7:00 PM','7:30 PM','8:00 PM','8:30 PM',
];
const LOGO = require('../../assets/oralyn-logo.png');
const DOCTOR = require('../../assets/dr-pranali.jpg');
const SERVICE_IMAGES = {
  checkup: require('../../assets/services/checkup.png'),
  scaling: require('../../assets/services/scaling.png'),
  whitening: require('../../assets/services/whitening.png'),
  filling: require('../../assets/services/filling.png'),
  rct: require('../../assets/services/rct.png'),
  crowns: require('../../assets/services/crowns.png'),
  implants: require('../../assets/services/implants.png'),
  extraction: require('../../assets/services/extraction.png'),
  braces: require('../../assets/services/braces.png'),
  aligners: require('../../assets/services/aligners.png'),
  dentures: require('../../assets/services/dentures.png'),
  veneers: require('../../assets/services/veneers.png'),
  'gum-care': require('../../assets/services/gum-care.png'),
  kids: require('../../assets/services/kids.png'),
  emergency: require('../../assets/services/emergency.png'),
  sensitivity: require('../../assets/services/sensitivity.png'),
  sealants: require('../../assets/services/sealants.png'),
  hygiene: require('../../assets/services/hygiene.png'),
  'smile-makeover': require('../../assets/services/smile-makeover.png'),
  tmj: require('../../assets/services/tmj.png'),
};
const TABS = [
  { name: 'Home', icon: 'home' }, { name: 'Services', icon: 'grid' },
  { name: 'Appointment', icon: 'calendar' }, { name: 'Gallery', icon: 'image' },
  { name: 'Contact', icon: 'map-pin' },
];
const DESKTOP_TABS = [...TABS, { name: 'My Care', icon: 'folder' }];

function Text({ children, style, ...props }) {
  const { t } = useTranslation();
  const fontReady = React.useContext(FontReadyContext);
  const translated = React.Children.map(children, child => typeof child === 'string' ? t(child) : child);
  return <NativeText {...props} style={[styles.baseText, ...resolveTextStyle(style, fontReady)]}>{translated}</NativeText>;
}
function TextInput({ placeholder, style, ...props }) {
  const { t } = useTranslation();
  const fontReady = React.useContext(FontReadyContext);
  return <NativeTextInput {...props} placeholder={placeholder ? t(placeholder) : undefined} style={[styles.inputText, ...resolveTextStyle(style, fontReady)]} />;
}
function Icon({ name, size = 19, color = C.navy }) { return <Feather name={name} size={size} color={color} />; }
function SafeImage({ source, style, contentFit = 'cover', accessibilityLabel }) {
  const [failed, setFailed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(Boolean(value)); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription?.remove?.(); };
  }, []);
  if (failed) return <View style={[styles.imageFallback, style]}><Icon name="image" size={25} color={C.blue} /></View>;
  return <ExpoImage source={source} style={style} contentFit={contentFit} transition={reduceMotion ? 0 : 180} accessibilityLabel={accessibilityLabel} onError={() => setFailed(true)} />;
}
function ActionButton({ label, icon, onPress, variant = 'primary', disabled = false, loading = false }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [styles.actionButton, variant === 'soft' && styles.actionSoft, variant === 'secondary' && styles.actionSecondary, (pressed || disabled || loading) && { opacity: 0.7 }]}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? C.white : C.blue} /> : <>
        {!!icon && <Icon name={icon} size={17} color={variant === 'primary' ? C.white : C.blue} />}
        <Text style={[styles.actionText, variant !== 'primary' && styles.actionTextSecondary]}>{label}</Text>
      </>}
    </Pressable>
  );
}
function PageIntro({ eyebrow, title, subtitle }) {
  return <View style={styles.pageIntro}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.pageTitle}>{title}</Text><Text style={styles.pageSubtitle}>{subtitle}</Text></View>;
}
function EmptyState({ icon = 'search', title, message }) {
  return <View style={styles.emptyState}><View style={styles.emptyIcon}><Icon name={icon} size={23} color={C.blue} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyMessage}>{message}</Text></View>;
}
function ServiceCard({ service, onPress, desktop = false }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'View ' + service.name} onPress={onPress} style={[styles.serviceCard, desktop && styles.desktopServiceCard]}>
      <View style={[styles.serviceImageWrap, desktop && styles.desktopServiceImageWrap]}>
        <SafeImage source={SERVICE_IMAGES[service.image]} style={styles.serviceImage} accessibilityLabel={service.name} />
        <View style={styles.serviceImageBadge}><Icon name="arrow-up-right" size={14} color={C.navy} /></View>
      </View>
      <Text style={styles.serviceCategory}>{service.category}</Text>
      <Text style={styles.serviceName} numberOfLines={2}>{service.name}</Text>
      <Text style={styles.serviceDescription} numberOfLines={2}>{service.description}</Text>
    </Pressable>
  );
}

function WelcomeScreen({ onStart, desktop = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const googleLogin = async () => {
    setBusy(true); setError('');
    fetch(DENTAL_API_URL + '/health').catch(() => null);
    try { const session = await signInWithGoogle(); if (session) onStart('Home', session); }
    catch (e) { setError(e?.message || 'Google sign-in could not be completed. You can continue as a guest.'); }
    finally { setBusy(false); }
  };
  return (
    <SafeAreaView style={styles.welcomeSafe}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.welcomeContent, desktop && styles.desktopWelcomeContent]}>
        <View style={styles.welcomeHeader}>
          <View style={styles.brandLockup}>
            <SafeImage source={LOGO} style={styles.brandLogo} contentFit="contain" accessibilityLabel="Oralyn logo" />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.brandName}>Oralyn</Text>
              <Text style={styles.brandClinic}>DR. PRANALI DENTAL CLINIC</Text>
            </View>
          </View>
          <LanguageSwitch />
        </View>
        <View style={[styles.welcomeHero, desktop && styles.desktopWelcomeHero]}>
          <View style={styles.welcomeCopy}>
            <Text style={styles.eyebrow}>GENTLE DENTAL CARE</Text>
            <Text style={styles.welcomeTitle}>Healthy smiles begin with thoughtful care.</Text>
            <Text style={styles.welcomeSubtitle}>A welcoming dental experience for you and your family, led by Dr. Pranali.</Text>
            <Pressable onPress={() => onStart('Services')} style={styles.textLink}>
              <Text style={styles.textLinkText}>Explore dental services</Text><Icon name="arrow-right" size={16} color={C.blue} />
            </Pressable>
          </View>
          <SafeImage source={DOCTOR} style={styles.welcomeDoctor} accessibilityLabel="Dr. Pranali" />
        </View>
        <View style={[styles.signInCard, desktop && styles.desktopSignInCard]}>
          <Text style={styles.signInTitle}>Welcome to Oralyn</Text>
          <Text style={styles.signInSubtitle}>Book a visit, explore treatment options and stay connected with your clinic.</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={googleLogin} style={styles.googleButton}>
            {busy ? <ActivityIndicator color={C.blue} /> : <><View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View><Text style={styles.googleButtonText}>Continue with Google</Text></>}
          </Pressable>
          {!!error && <Text style={styles.errorMessage}>{error}</Text>}
          <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>OR</Text><View style={styles.orLine} /></View>
          <ActionButton label="Explore as a guest" icon="arrow-right" variant="soft" onPress={() => onStart('Home')} />
          <Text style={styles.guestNote}>Browse services and request an appointment without signing in.</Text>
        </View>
        <View style={[styles.trustRow, desktop && styles.desktopTrustRow]}>
          <View style={styles.trustItem}><Icon name="calendar" size={20} color={C.blue} /><Text style={styles.trustLabel}>Easy appointments</Text></View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}><Icon name="heart" size={20} color={C.teal} /><Text style={styles.trustLabel}>Family-friendly care</Text></View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}><Icon name="shield" size={20} color={C.blue} /><Text style={styles.trustLabel}>Patient-first approach</Text></View>
        </View>
        <Text style={[styles.termsNote, desktop && styles.desktopTermsNote]}>Your clinic account and appointment details remain protected by the clinic's existing sign-in and service settings.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeScreen({ clinic, onBook, onServices, onContact, onCare, desktop = false }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageContent, desktop && styles.desktopPageContent]}>
      <View style={[styles.homeHero, desktop && styles.desktopHomeHero]}>
        <View style={styles.homeHeroCopy}>
          <Text style={styles.homeEyebrow}>DR. PRANALI DENTAL CLINIC</Text>
          <Text style={styles.homeTitle}>Care that puts your smile first.</Text>
          <Text style={styles.homeSubtitle}>Gentle, modern dental care for every stage of life.</Text>
          <ActionButton label="Book an appointment" icon="calendar" onPress={onBook} />
        </View>
        <SafeImage source={DOCTOR} style={[styles.homeDoctor, desktop && styles.desktopHomeDoctor]} accessibilityLabel="Dr. Pranali" />
      </View>
      <View style={styles.clinicInfoCard}>
        <View style={styles.clinicInfoHeader}>
          <View style={styles.clinicIcon}><Icon name="map-pin" size={18} color={C.blue} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.clinicInfoTitle}>{clinic.name}</Text>
            <Text style={styles.clinicInfoAddress}>{clinic.address}</Text>
          </View>
        </View>
        <View style={styles.clinicDivider} />
        <View style={styles.hoursRow}>
          <Icon name="clock" size={16} color={C.teal} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hoursText}>10:00 AM – 2:00 PM</Text>
            <Text style={styles.hoursText}>5:00 PM – 9:00 PM</Text>
          </View>
        </View>
        <Text style={styles.hoursNote}>By appointment only</Text>
      </View>
      <View style={styles.quickActions}>
        <Pressable onPress={onServices} style={styles.quickCard}><View style={styles.quickIcon}><Icon name="grid" size={19} color={C.blue} /></View><Text style={styles.quickTitle}>Explore services</Text><Text style={styles.quickSub}>Find the care you need</Text></Pressable>
        <Pressable onPress={onContact} style={styles.quickCard}><View style={[styles.quickIcon, styles.quickIconTeal]}><Icon name="message-circle" size={19} color={C.navy} /></View><Text style={styles.quickTitle}>Contact the clinic</Text><Text style={styles.quickSub}>Location and clinic details</Text></Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="My care and shared records" onPress={onCare} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, borderRadius: 14, backgroundColor: C.softBlue, marginTop: 12 }}><Icon name="folder" size={18} color={C.blue} /><Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: C.navy }}>View my care and shared records</Text><Icon name="arrow-right" size={15} color={C.blue} /></Pressable>
      <View style={styles.sectionHeader}>
        <View><Text style={styles.eyebrow}>PERSONALISED CARE</Text><Text style={styles.sectionTitle}>Popular services</Text></View>
        <Pressable onPress={onServices} style={styles.viewAll}><Text style={styles.viewAllText}>View all</Text><Icon name="arrow-right" size={14} color={C.blue} /></Pressable>
      </View>
      <View style={[styles.servicesGrid, desktop && styles.desktopServicesGrid]}>{DENTAL_SERVICES.slice(0, 4).map(service => <ServiceCard key={service.id} service={service} desktop={desktop} onPress={() => onBook(service.name)} />)}</View>
      <View style={styles.careNote}><View style={styles.careNoteIcon}><Icon name="heart" size={21} color={C.teal} /></View><View style={{ flex: 1 }}><Text style={styles.careNoteTitle}>Comfort comes first</Text><Text style={styles.careNoteText}>Your dentist will explain suitable treatment options after an examination and answer your questions before care begins.</Text></View></View>
    </ScrollView>
  );
}

function ServicesScreen({ onBook, initialQuery = '', desktop = false }) {
  const [query, setQuery] = useState(initialQuery);
  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const visible = useMemo(() => DENTAL_SERVICES.filter(service =>
    (category === 'All' || service.category === category) &&
    (service.name + ' ' + service.description + ' ' + service.category).toLowerCase().includes(query.trim().toLowerCase())
  ), [category, query]);
  if (selected) return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageContent, desktop && styles.desktopPageContent]}>
      <Pressable onPress={() => setSelected(null)} style={styles.backLink}><Icon name="arrow-left" size={16} color={C.blue} /><Text style={styles.backLinkText}>All services</Text></Pressable>
      <View style={styles.detailCard}>
        <SafeImage source={SERVICE_IMAGES[selected.image]} style={styles.detailImage} accessibilityLabel={selected.name} />
        <Text style={styles.detailCategory}>{selected.category}</Text>
        <Text style={styles.detailTitle}>{selected.name}</Text>
        <Text style={styles.detailDescription}>{selected.description}</Text>
        <View style={styles.detailNote}><Icon name="info" size={17} color={C.blue} /><Text style={styles.detailNoteText}>Your dentist will confirm the appropriate treatment after an examination.</Text></View>
        <ActionButton label="Book this service" icon="calendar" onPress={() => onBook(selected.name)} />
      </View>
    </ScrollView>
  );
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageContent, desktop && styles.desktopPageContent]} keyboardShouldPersistTaps="handled">
      <View style={styles.pageIntro}><Text style={styles.eyebrow}>CARE OPTIONS</Text><Text style={styles.pageTitle}>Dental services</Text><Text style={styles.pageSubtitle}>Explore treatment options and choose a reason for your visit.</Text></View>
      <View style={styles.searchWrap}><Icon name="search" size={18} color={C.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search dental services" placeholderTextColor={C.muted} style={styles.searchInput} returnKeyType="search" />{!!query && <Pressable onPress={() => setQuery('')}><Icon name="x-circle" size={18} color={C.muted} /></Pressable>}</View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
        {DENTAL_SERVICE_CATEGORIES.map(item => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, category === item && styles.categoryChipActive]}><Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text></Pressable>)}
      </ScrollView>
      {visible.length ? <View style={[styles.servicesGrid, desktop && styles.desktopServicesGrid]}>{visible.map(service => <ServiceCard key={service.id} service={service} desktop={desktop} onPress={() => setSelected(service)} />)}</View> : <EmptyState title="No matching services" message="Try a different search term or choose another category." />}
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }) {
  return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} keyboardType={keyboardType} multiline={multiline} style={[styles.fieldInput, multiline && styles.fieldMultiline]} /></View>;
}

function AppointmentScreen({ initialReason, clinic, desktop = false }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState(initialReason || '');
  const [note, setNote] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  useEffect(() => { if (initialReason) setReason(initialReason); }, [initialReason]);

  const dateValue = () => {
    if (!date) return new Date();
    const p = date.split('/').map(Number);
    return p.length === 3 ? new Date(p[2], p[1] - 1, p[0]) : new Date();
  };
  const submit = async () => {
    setMessage(''); setMessageType('');
    if (!name.trim() || !phone.trim() || !date.trim() || !time.trim()) {
      setMessage('Please enter your name, phone number, preferred date and time.'); setMessageType('error'); return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setMessage('Please enter a valid phone number with at least 10 digits.'); setMessageType('error'); return;
    }
    if (!CLINIC_TIME_SLOTS.includes(time)) {
      setMessage('Please choose one of the available clinic time slots.'); setMessageType('error'); return;
    }
    setSending(true);
    try {
      const parts = date.split('/');
      const t = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (parts.length !== 3 || !t) throw new Error('Please choose a valid date and clinic time slot.');
      let hour = Number(t[1]); const minute = Number(t[2]); const period = t[3].toUpperCase();
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      const requestedDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), hour, minute, 0, 0);
      if (Number.isNaN(requestedDate.getTime()) || requestedDate.getTime() < Date.now()) throw new Error('Please choose a future appointment time.');
      const startsAt = parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0') + 'T' + String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ':00+05:30';
      await requestPublicAppointment({ name: name.trim(), phone: phone.trim(), starts_at: startsAt, treatment_type: reason.trim() || 'Dental consultation', note: note.trim() || null });
      setMessage('Your appointment request has been sent. The clinic will contact you to confirm the visit.');
      setMessageType('success');
      setName(''); setPhone(''); setDate(''); setTime(''); setReason(''); setNote('');
    } catch (error) {
      setMessage(error?.message || ('The appointment service could not be reached.' + (clinic?.phone ? ' Please call ' + clinic.phone + '.' : ' Please try again later.')));
      setMessageType('error');
    } finally { setSending(false); }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageContent, desktop && styles.desktopPageContent]} keyboardShouldPersistTaps="handled">
      <View style={styles.pageIntro}><Text style={styles.eyebrow}>PLAN YOUR VISIT</Text><Text style={styles.pageTitle}>Book an appointment</Text><Text style={styles.pageSubtitle}>Share your preferred time. The clinic will contact you to confirm availability.</Text></View>
      <View style={[styles.formCard, desktop && styles.desktopFormCard]}>
        <View style={styles.formIntro}><View style={styles.formIcon}><Icon name="calendar" size={21} color={C.blue} /></View><View style={{ flex: 1 }}><Text style={styles.formIntroTitle}>Request a clinic visit</Text><Text style={styles.formIntroText}>A few details help the clinic plan your appointment.</Text></View></View>
        <Field label="Full name" value={name} onChangeText={setName} placeholder="Enter your full name" />
        <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" keyboardType="phone-pad" />
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Preferred date</Text>
          <Pressable onPress={() => setShowDate(true)} style={styles.pickerButton}><Icon name="calendar" size={17} color={C.blue} /><Text style={[styles.pickerText, !date && styles.placeholder]}>{date || 'Choose a date'}</Text><Icon name="chevron-down" size={16} color={C.muted} /></Pressable>
          {showDate && <DateTimePicker value={dateValue()} mode="date" minimumDate={new Date()} onChange={(event, value) => { setShowDate(false); if (value) setDate(String(value.getDate()).padStart(2, '0') + '/' + String(value.getMonth() + 1).padStart(2, '0') + '/' + value.getFullYear()); }} />}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Preferred time</Text>
          <Text style={styles.timeSlotHint}>Choose a slot during clinic hours: {CLINIC_HOURS_LABEL}.</Text>
          <View style={styles.timeSlotGrid}>
            {CLINIC_TIME_SLOTS.map(slot => (
              <Pressable key={slot} accessibilityRole="button" accessibilityLabel={slot} accessibilityState={{ selected: time === slot }} onPress={() => setTime(slot)} style={[styles.timeSlotChip, time === slot && styles.timeSlotChipActive]}>
                <Text style={[styles.timeSlotText, time === slot && styles.timeSlotTextActive]}>{slot}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Reason for visit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reasonList}>
            {DENTAL_SERVICES.slice(0, 8).map(service => <Pressable key={service.id} onPress={() => setReason(service.name)} style={[styles.reasonChip, reason === service.name && styles.reasonChipActive]}><Text style={[styles.reasonText, reason === service.name && styles.reasonTextActive]}>{service.name}</Text></Pressable>)}
          </ScrollView>
          {!!reason && <Text style={styles.selectedReason}>Selected: {reason}</Text>}
        </View>
        <Field label="Additional message (optional)" value={note} onChangeText={setNote} placeholder="Anything you would like the clinic to know" multiline />
        {!!message && <View style={[styles.formMessage, messageType === 'success' ? styles.formSuccess : styles.formError]}><Icon name={messageType === 'success' ? 'check-circle' : 'alert-circle'} size={18} color={messageType === 'success' ? C.green : C.red} /><Text style={styles.formMessageText}>{message}</Text></View>}
        <ActionButton label="Send appointment request" icon="arrow-right" onPress={submit} loading={sending} />
        <Text style={styles.formFootnote}>Your preferred slot is a request, not a confirmed appointment. The clinic will confirm availability with you.</Text>
      </View>
    </ScrollView>
  );
}

function GalleryScreen({ desktop = false }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageContent, desktop && styles.desktopPageContent]}>
      <View style={styles.pageIntro}><Text style={styles.eyebrow}>MEET YOUR DENTIST</Text><Text style={styles.pageTitle}>A familiar, friendly face</Text><Text style={styles.pageSubtitle}>Get to know the dentist caring for your smile.</Text></View>
      <View style={[styles.galleryCard, desktop && styles.desktopNarrowCard]}><SafeImage source={DOCTOR} style={styles.galleryImage} accessibilityLabel="Dr. Pranali, BDS Dental Surgeon" /><View style={styles.galleryCopy}><Text style={styles.galleryName}>Dr. Pranali</Text><Text style={styles.galleryRole}>BDS · Dental Surgeon</Text><Text style={styles.galleryDescription}>Patient-focused dental care with a gentle approach, clear explanations and attention to comfort.</Text></View></View>
      <View style={styles.galleryNote}><Icon name="camera" size={18} color={C.blue} /><Text style={styles.galleryNoteText}>Clinic photographs and treatment-gallery updates will be added here as verified clinic images become available.</Text></View>
    </ScrollView>
  );
}

function ContactScreen({ clinic, desktop = false }) {
  const openMaps = () => Linking.openURL('https://www.google.com/maps/search/?api=1&query=Taloja%20Navi%20Mumbai');
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageContent, desktop && styles.desktopPageContent]}>
      <View style={styles.pageIntro}><Text style={styles.eyebrow}>WE ARE HERE TO HELP</Text><Text style={styles.pageTitle}>Contact the clinic</Text><Text style={styles.pageSubtitle}>Find the clinic and plan your visit.</Text></View>
      <View style={[styles.contactCard, desktop && styles.desktopNarrowCard]}>
        <View style={styles.contactBrand}><SafeImage source={LOGO} style={styles.contactLogo} contentFit="contain" /><View style={{ flex: 1 }}><Text style={styles.contactName}>{clinic.name}</Text><Text style={styles.contactDoctor}>Dr. Pranali · BDS Dental Surgeon</Text></View></View>
        <View style={styles.contactDivider} />
        <View style={styles.contactLine}><View style={styles.contactIcon}><Icon name="map-pin" size={18} color={C.blue} /></View><View style={{ flex: 1 }}><Text style={styles.contactLabel}>Clinic location</Text><Text style={styles.contactValue}>{clinic.address}</Text></View></View>
        <View style={styles.contactLine}><View style={styles.contactIcon}><Icon name="clock" size={18} color={C.blue} /></View><View style={{ flex: 1 }}><Text style={styles.contactLabel}>Clinic hours</Text><Text style={styles.contactValue}>{CLINIC_HOURS_LABEL}</Text><Text style={styles.contactMuted}>By appointment only</Text></View></View>
        <ActionButton label="Open directions in Google Maps" icon="navigation" onPress={openMaps} />
        <Text style={styles.contactFootnote}>For urgent dental pain, swelling, bleeding or injury, seek prompt professional advice. Appointment requests are not an emergency service.</Text>
      </View>
      <View style={styles.contactHelp}><Icon name="message-circle" size={20} color={C.teal} /><View style={{ flex: 1 }}><Text style={styles.contactHelpTitle}>Need help with a booking?</Text><Text style={styles.contactHelpText}>Send an appointment request and the clinic will contact you to confirm the visit.</Text></View></View>
    </ScrollView>
  );
}


function MyCareScreen({ session, onContact, onBook, onConnectAccount, desktop = false }) {
  const user = session?.user || null;
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Patient';
  const signedIn = Boolean(user?.id);
  const panel = { flex: 1, minWidth: desktop ? 300 : '100%', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.white };
  const panelTitle = { fontSize: 14, fontWeight: '800', color: C.navy, marginBottom: 8 };
  const panelCopy = { fontSize: 11, lineHeight: 17, color: C.muted, marginTop: 5 };
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageContent, desktop && styles.desktopPageContent]}>
      <PageIntro eyebrow="YOUR CLINIC ACCOUNT" title="My care" subtitle="A calm place to keep track of your visits, shared records and clinic communication." />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, marginBottom: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="user" size={22} color={C.blue} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.navy }}>{signedIn ? name : 'Guest visitor'}</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{signedIn ? (user.email || 'Clinic account connected') : 'Connect your clinic account to associate this space with your profile.'}</Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: signedIn ? C.softTeal : C.softBlue }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: signedIn ? C.green : C.blue }}>{signedIn ? 'ACCOUNT CONNECTED' : 'GUEST MODE'}</Text>
        </View>
      </View>
      {!signedIn && <View style={{ padding: 15, borderRadius: 16, backgroundColor: C.softBlue, borderWidth: 1, borderColor: C.border, marginBottom: 14 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: C.navy }}>Connect your clinic profile</Text>
        <Text style={panelCopy}>Sign in with the clinic's existing Google account to associate your patient portal session. Your clinic must still share records separately.</Text>
        <ActionButton label="Continue with clinic sign-in" icon="log-in" variant="soft" onPress={onConnectAccount} />
      </View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 13 }}>
        <View style={panel}>
          <Text style={panelTitle}>Treatment journey</Text>
          <EmptyState icon="activity" title="No visit history yet" message="Visit summaries and treatment milestones shared by the clinic will appear here." />
        </View>
        <View style={panel}>
          <Text style={panelTitle}>Clinical records</Text>
          <EmptyState icon="file-text" title="No records shared yet" message="Reports and documents released by your clinic will appear here." />
        </View>
        <View style={panel}>
          <Text style={panelTitle}>Invoices</Text>
          <EmptyState icon="credit-card" title="No invoices shared yet" message="Billing statements shared by the clinic will appear here." />
        </View>
        <View style={panel}>
          <Text style={panelTitle}>Clinic communication</Text>
          <Text style={panelCopy}>For appointment changes, treatment questions or help with your records, contact the clinic team directly.</Text>
          <View style={{ marginTop: 12 }}>
            <ActionButton label="Contact the clinic" icon="message-circle" variant="soft" onPress={onContact} />
            <ActionButton label="Request a visit" icon="calendar" onPress={onBook} />
          </View>
        </View>
      </View>
      <Text style={{ fontSize: 10, lineHeight: 15, color: C.muted, marginTop: 14 }}>Only information shared by Dr. Pranali Dental Clinic is shown here. This portal does not provide automated diagnosis or replace a dental examination.</Text>
    </ScrollView>
  );
}

export default function PatientExperience() {
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState('Home');
  const [selectedReason, setSelectedReason] = useState('');
  const [patientSession, setPatientSession] = useState(null);
  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setPatientSession(session || null);
      if (session) setStarted(true);
    });
    const restoreSession = async () => {
      let restored = null;
      if (Platform.OS === 'web') {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          restored = data?.session || null;
          url.searchParams.delete('code');
          window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        }
      }
      if (!restored) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        restored = data?.session || null;
      }
      if (!active) return;
      setPatientSession(restored);
      if (restored) setStarted(true);
    };
    restoreSession().catch(error => {
      if (active) console.warn('[Oralyn Patient] Session restore is unavailable; guest browsing remains available.', error);
    });
    return () => {
      active = false;
      subscription?.unsubscribe?.();
    };
  }, []);
  const [globalSearch, setGlobalSearch] = useState('');
  const { width: viewportWidth } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && viewportWidth >= 1100;
  const clinic = useMemo(() => ({ name: 'Dr. Pranali Dental Clinic', address: 'Taloja, Navi Mumbai' }), []);
  const start = (next, session = null) => { setPatientSession(session); setStarted(true); if (next) setTab(next); };
  const book = reason => { setSelectedReason(reason || ''); setTab('Appointment'); };
  const pageTitle = {
    Home: 'Your care home',
    Services: 'Dental services',
    Appointment: 'Request an appointment',
    Gallery: 'Meet your dentist',
    Contact: 'Contact the clinic',
    'My Care': 'Your care journey',
  }[tab] || 'Your care home';
  if (!started) return <WelcomeScreen onStart={start} desktop={desktop} />;

  const currentScreen = (
    <>
      {tab === 'Home' && <HomeScreen clinic={clinic} desktop={desktop} onBook={() => book('')} onServices={() => setTab('Services')} onContact={() => setTab('Contact')} onCare={() => setTab('My Care')} />}
      {tab === 'Services' && <ServicesScreen onBook={book} initialQuery={globalSearch} desktop={desktop} />}
      {tab === 'Appointment' && <AppointmentScreen initialReason={selectedReason} clinic={clinic} desktop={desktop} />}
      {tab === 'Gallery' && <GalleryScreen desktop={desktop} />}
      {tab === 'Contact' && <ContactScreen clinic={clinic} desktop={desktop} />}
      {tab === 'My Care' && <MyCareScreen session={patientSession} desktop={desktop} onContact={() => setTab('Contact')} onBook={() => book('')} onConnectAccount={() => setStarted(false)} />}
    </>
  );

  if (desktop) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.desktopShell}>
          <View style={styles.desktopSidebar}>
            <View style={styles.desktopSidebarBrand}>
              <SafeImage source={LOGO} style={styles.desktopSidebarLogo} contentFit="contain" accessibilityLabel="Oralyn logo" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.desktopSidebarName}>Oralyn</Text>
                <Text style={styles.desktopSidebarClinic}>DR. PRANALI DENTAL CLINIC</Text>
              </View>
            </View>
            <Text style={styles.desktopNavCaption}>PATIENT PORTAL</Text>
            {DESKTOP_TABS.map(item => {
              const active = tab === item.name;
              const hints = { Home: 'Your clinic overview', Services: 'Explore available care', Appointment: 'Choose a preferred visit', Gallery: 'Meet your dentist', Contact: 'Location and support', 'My Care': 'Records and communication' };
              return (
                <Pressable key={item.name} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setTab(item.name)} style={[styles.desktopNavItem, active && styles.desktopNavItemActive]}>
                  <View style={[styles.desktopNavIcon, active && styles.desktopNavIconActive]}><Icon name={item.icon} size={17} color={active ? C.blue : C.muted} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.desktopNavLabel, active && styles.desktopNavLabelActive]}>{item.name}</Text>
                    <Text style={styles.desktopNavHint}>{hints[item.name]}</Text>
                  </View>
                </Pressable>
              );
            })}
            <View style={{ flex: 1 }} />
            <View style={styles.desktopSidebarHelp}>
              <Text style={styles.desktopSidebarHelpTitle}>Need a hand?</Text>
              <Text style={styles.desktopSidebarHelpText}>Our clinic team can help with booking questions and visit details.</Text>
              <Pressable onPress={() => setTab('Contact')} style={styles.desktopSidebarHelpAction}><Text style={styles.desktopSidebarHelpActionText}>Contact the clinic</Text></Pressable>
            </View>
            <Text style={styles.desktopGuestNote}>Guest browsing · Secure clinic sign-in remains available</Text>
          </View>
          <View style={styles.desktopMain}>
            <View style={styles.desktopTopbar}>
              <View style={{ minWidth: 190 }}>
                <Text style={styles.desktopTopbarEyebrow}>ORALYN PATIENT PORTAL</Text>
                <Text style={styles.desktopTopbarTitle}>{pageTitle}</Text>
              </View>
              <View style={styles.desktopSearchWrap}>
                <Icon name="search" size={17} color={C.muted} />
                <TextInput value={globalSearch} onChangeText={value => { setGlobalSearch(value); setTab('Services'); }} placeholder="Search dental services" placeholderTextColor={C.muted} style={styles.desktopSearchInput} />
                {!!globalSearch && <Pressable onPress={() => setGlobalSearch('')} accessibilityLabel="Clear search"><Icon name="x-circle" size={17} color={C.muted} /></Pressable>}
              </View>
              <LanguageSwitch />
            </View>
            <View style={styles.desktopBody}>{currentScreen}</View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.appHeader}>
        <View style={styles.headerBrand}><SafeImage source={LOGO} style={styles.headerLogo} contentFit="contain" /><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.headerTitle}>{BRAND.name}</Text><Text style={styles.headerSubtitle}>Dr. Pranali Dental Clinic</Text></View></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Contact clinic" onPress={() => setTab('Contact')} style={styles.headerHelp}><Icon name="help-circle" size={21} color={C.blue} /></Pressable>
      </View>
      <View style={styles.body}>{currentScreen}</View>
      <View style={styles.bottomNav}>
        {TABS.map(item => {
          const active = tab === item.name;
          return <Pressable key={item.name} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={item.name} onPress={() => setTab(item.name)} style={styles.navItem}>
            <View style={[styles.navIcon, active && styles.navIconActive]}><Icon name={item.icon} size={19} color={active ? C.blue : C.muted} /></View>
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.name}</Text>
          </Pressable>;
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  baseText: { color: C.text },
  inputText: { color: C.text },
  safe: { flex: 1, backgroundColor: C.ice },
  body: { flex: 1, minHeight: 0 },
  welcomeSafe: { flex: 1, backgroundColor: C.ice },
  welcomeContent: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28 },
  pageContent: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30 },
  welcomeHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  brandLogo: { width: 52, height: 52, borderRadius: 14 },
  brandName: { fontSize: 22, fontWeight: '800', color: C.navy, letterSpacing: -0.4 },
  brandClinic: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: C.blue, marginTop: 2 },
  welcomeHero: { width: '100%', marginTop: 20, padding: 15, borderRadius: 23, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 11 },
  welcomeCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.25, color: C.blue, textTransform: 'uppercase' },
  welcomeTitle: { fontSize: 26, lineHeight: 32, fontWeight: '700', color: C.navy, marginTop: 8 },
  welcomeSubtitle: { fontSize: 11.5, lineHeight: 17, color: C.muted, marginTop: 7 },
  welcomeDoctor: { width: 96, height: 130, borderRadius: 16, backgroundColor: C.softBlue },
  textLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13, alignSelf: 'flex-start' },
  textLinkText: { fontSize: 11.5, fontWeight: '800', color: C.blue },
  signInCard: { width: '100%', marginTop: 13, padding: 17, borderRadius: 21, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  signInTitle: { fontSize: 22, fontWeight: '700', color: C.navy },
  signInSubtitle: { fontSize: 11.5, lineHeight: 17, color: C.muted, marginTop: 5, marginBottom: 13 },
  googleButton: { width: '100%', minHeight: 49, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  googleMark: { width: 25, height: 25, borderRadius: 13, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center' },
  googleMarkText: { fontSize: 15, fontWeight: '800', color: '#4285F4' },
  googleButtonText: { fontSize: 12.5, fontWeight: '800', color: C.text },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 13 },
  orLine: { height: 1, flex: 1, backgroundColor: C.border },
  orText: { fontSize: 9, fontWeight: '800', color: C.muted },
  guestNote: { fontSize: 10, lineHeight: 15, color: C.muted, textAlign: 'center', marginTop: 9 },
  trustRow: { width: '100%', marginTop: 13, paddingVertical: 13, paddingHorizontal: 7, borderRadius: 17, backgroundColor: C.softTeal, borderWidth: 1, borderColor: '#CFEFEF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trustItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: 5, paddingHorizontal: 2 },
  trustLabel: { fontSize: 8.5, fontWeight: '700', color: C.navy, textAlign: 'center' },
  trustDivider: { width: 1, height: 29, backgroundColor: '#CFE5E9' },
  termsNote: { fontSize: 9, lineHeight: 14, color: C.muted, textAlign: 'center', marginTop: 12 },
  appHeader: { minHeight: 66, paddingHorizontal: 17, paddingVertical: 8, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  headerLogo: { width: 41, height: 41, borderRadius: 11 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.navy },
  headerSubtitle: { fontSize: 10, color: C.muted, marginTop: 1 },
  headerHelp: { width: 39, height: 39, borderRadius: 20, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center' },
  pageIntro: { marginBottom: 15 },
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: C.navy, marginTop: 3 },
  pageSubtitle: { fontSize: 12, lineHeight: 19, color: C.muted, marginTop: 5 },
  homeHero: { width: '100%', padding: 16, borderRadius: 23, backgroundColor: C.navy, flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeHeroCopy: { flex: 1, minWidth: 0 },
  homeEyebrow: { fontSize: 8.5, letterSpacing: 1.1, color: '#9ADFEA', fontWeight: '800' },
  homeTitle: { fontSize: 24, lineHeight: 30, color: C.white, fontWeight: '700', marginTop: 7 },
  homeSubtitle: { fontSize: 10.5, lineHeight: 16, color: '#D8E9F7', marginTop: 7, marginBottom: 7 },
  homeDoctor: { width: 91, height: 124, borderRadius: 15, backgroundColor: '#DDEBF6' },
  actionButton: { minHeight: 43, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: C.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 8 },
  actionSoft: { width: '100%', backgroundColor: C.softTeal, borderWidth: 1, borderColor: '#CDECEC', justifyContent: 'center' },
  actionSecondary: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  actionText: { fontSize: 11.5, fontWeight: '800', color: C.white },
  actionTextSecondary: { color: C.navy },
  clinicInfoCard: { width: '100%', marginTop: 12, padding: 14, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  clinicInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clinicIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center' },
  clinicInfoTitle: { fontSize: 12.5, fontWeight: '800', color: C.navy },
  clinicInfoAddress: { fontSize: 10.5, color: C.muted, marginTop: 3 },
  clinicDivider: { height: 1, backgroundColor: C.border, marginVertical: 11 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hoursText: { fontSize: 10.5, lineHeight: 15, color: C.text },
  hoursNote: { fontSize: 9.5, color: C.muted, marginLeft: 24, marginTop: 3 },
  quickActions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  quickCard: { flex: 1, minWidth: 0, padding: 12, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  quickIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickIconTeal: { backgroundColor: C.softTeal },
  quickTitle: { fontSize: 10.5, fontWeight: '800', color: C.navy },
  quickSub: { fontSize: 9, lineHeight: 14, color: C.muted, marginTop: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 20, marginBottom: 11, gap: 8 },
  sectionTitle: { fontSize: 21, lineHeight: 26, fontWeight: '700', color: C.navy, marginTop: 3 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  viewAllText: { fontSize: 10, fontWeight: '800', color: C.blue },
  servicesGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 11 },
  serviceCard: { width: '48.5%', minWidth: 0, padding: 8, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  serviceImageWrap: { width: '100%', height: 108, borderRadius: 11, overflow: 'hidden', backgroundColor: C.ice, position: 'relative' },
  serviceImage: { width: '100%', height: '100%' },
  serviceImageBadge: { position: 'absolute', top: 6, right: 6, width: 25, height: 25, borderRadius: 13, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  serviceCategory: { fontSize: 8, letterSpacing: 0.6, textTransform: 'uppercase', color: C.blue, fontWeight: '800', marginTop: 8 },
  serviceName: { fontSize: 10.5, lineHeight: 15, fontWeight: '800', color: C.navy, marginTop: 3 },
  serviceDescription: { fontSize: 9, lineHeight: 13, color: C.muted, marginTop: 4 },
  careNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 17, backgroundColor: C.softTeal, borderWidth: 1, borderColor: '#CDECEC', marginTop: 15 },
  careNoteIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  careNoteTitle: { fontSize: 11.5, fontWeight: '800', color: C.navy },
  careNoteText: { fontSize: 9.5, lineHeight: 15, color: C.muted, marginTop: 4 },
  searchWrap: { minHeight: 46, paddingHorizontal: 12, borderRadius: 13, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 9, fontSize: 11.5, color: C.text },
  categoryList: { gap: 7, paddingVertical: 12 },
  categoryChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 19, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  categoryChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  categoryText: { fontSize: 9.5, fontWeight: '700', color: C.text },
  categoryTextActive: { color: C.white },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 5, marginBottom: 10 },
  backLinkText: { fontSize: 11, fontWeight: '800', color: C.blue },
  detailCard: { width: '100%', padding: 13, borderRadius: 21, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  detailImage: { width: '100%', height: 185, borderRadius: 15, backgroundColor: C.ice },
  detailCategory: { alignSelf: 'flex-start', borderRadius: 11, backgroundColor: C.softBlue, color: C.blue, fontSize: 9, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, marginTop: 12, overflow: 'hidden' },
  detailTitle: { fontSize: 23, lineHeight: 29, fontWeight: '700', color: C.navy, marginTop: 8 },
  detailDescription: { fontSize: 11.5, lineHeight: 18, color: C.muted, marginTop: 6 },
  detailNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderRadius: 12, backgroundColor: C.ice, marginTop: 12, marginBottom: 5 },
  detailNoteText: { flex: 1, fontSize: 9.5, lineHeight: 15, color: C.text },
  formCard: { width: '100%', padding: 15, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  formIntro: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 },
  formIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center' },
  formIntroTitle: { fontSize: 12, fontWeight: '800', color: C.navy },
  formIntroText: { fontSize: 9.5, lineHeight: 14, color: C.muted, marginTop: 3 },
  fieldGroup: { marginTop: 11 },
  fieldLabel: { fontSize: 10.5, fontWeight: '800', color: C.navy, marginBottom: 6 },
  fieldInput: { width: '100%', minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: C.border, backgroundColor: '#FAFCFE', paddingHorizontal: 11, paddingVertical: 10, fontSize: 11.5, color: C.text },
  fieldMultiline: { minHeight: 82, textAlignVertical: 'top' },
  pickerButton: { width: '100%', minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: C.border, backgroundColor: '#FAFCFE', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerText: { flex: 1, fontSize: 11.5, color: C.text },
  timeSlotHint: { fontSize: 9.5, lineHeight: 15, color: C.muted, marginTop: 2 },
  timeSlotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  timeSlotChip: { width: '23.7%', minHeight: 38, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#FAFCFE', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  timeSlotChipActive: { backgroundColor: C.blue, borderColor: C.blue },
  timeSlotText: { fontSize: 9.5, fontWeight: '800', color: C.navy },
  timeSlotTextActive: { color: C.white },
  placeholder: { color: C.muted },
  reasonList: { gap: 7, paddingVertical: 4 },
  reasonChip: { maxWidth: 185, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 17, backgroundColor: C.ice, borderWidth: 1, borderColor: C.border },
  reasonChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  reasonText: { fontSize: 9, color: C.text, fontWeight: '700' },
  reasonTextActive: { color: C.white },
  selectedReason: { fontSize: 9.5, color: C.blue, marginTop: 5, fontWeight: '700' },
  formMessage: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderRadius: 12, marginTop: 12 },
  formSuccess: { backgroundColor: '#E8F8F1' },
  formError: { backgroundColor: '#FDF0EF' },
  formMessageText: { flex: 1, fontSize: 9.5, lineHeight: 15, color: C.text },
  formFootnote: { fontSize: 8.5, lineHeight: 14, color: C.muted, textAlign: 'center', marginTop: 10 },
  errorMessage: { fontSize: 10, lineHeight: 15, color: C.red, marginTop: 8 },
  galleryCard: { width: '100%', padding: 11, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  galleryImage: { width: '100%', height: 270, borderRadius: 14, backgroundColor: C.ice },
  galleryCopy: { padding: 5, paddingTop: 11 },
  galleryName: { fontSize: 22, fontWeight: '700', color: C.navy },
  galleryRole: { fontSize: 10.5, fontWeight: '800', color: C.blue, marginTop: 3 },
  galleryDescription: { fontSize: 10.5, lineHeight: 17, color: C.muted, marginTop: 7 },
  galleryNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: 16, backgroundColor: C.softBlue, marginTop: 12 },
  galleryNoteText: { flex: 1, fontSize: 9.5, lineHeight: 15, color: C.text },
  contactCard: { width: '100%', padding: 15, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  contactBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactLogo: { width: 54, height: 54, borderRadius: 13 },
  contactName: { fontSize: 12, fontWeight: '800', color: C.navy },
  contactDoctor: { fontSize: 9.5, color: C.blue, marginTop: 3 },
  contactDivider: { height: 1, backgroundColor: C.border, marginVertical: 13 },
  contactLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 13 },
  contactIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 9, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  contactValue: { fontSize: 10.5, color: C.text, marginTop: 4, lineHeight: 16 },
  contactMuted: { fontSize: 9, color: C.muted, marginTop: 3 },
  contactFootnote: { fontSize: 8.5, lineHeight: 14, color: C.muted, marginTop: 12 },
  contactHelp: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: 16, backgroundColor: C.softTeal, marginTop: 12 },
  contactHelpTitle: { fontSize: 10.5, fontWeight: '800', color: C.navy },
  contactHelpText: { fontSize: 9.5, lineHeight: 15, color: C.muted, marginTop: 3 },
  emptyState: { alignItems: 'center', padding: 24, borderRadius: 17, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  emptyIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.navy, marginTop: 10 },
  emptyMessage: { fontSize: 9.5, lineHeight: 15, color: C.muted, textAlign: 'center', marginTop: 5 },
  bottomNav: { minHeight: 69, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', paddingHorizontal: 3, paddingTop: 5, paddingBottom: Platform.OS === 'ios' ? 9 : 5 },
  navItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navIcon: { width: 32, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  navIconActive: { backgroundColor: C.softBlue },
  navLabel: { fontSize: 8.5, fontWeight: '700', color: C.muted },
  navLabelActive: { color: C.blue, fontWeight: '800' },
  desktopShell: { flex: 1, flexDirection: 'row', backgroundColor: C.ice },
  desktopSidebar: { width: 252, paddingHorizontal: 18, paddingTop: 24, paddingBottom: 18, backgroundColor: C.white, borderRightWidth: 1, borderRightColor: C.border },
  desktopSidebarBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 30 },
  desktopSidebarLogo: { width: 46, height: 46, borderRadius: 13 },
  desktopSidebarName: { fontSize: 20, fontWeight: '900', color: C.navy },
  desktopSidebarClinic: { fontSize: 8, letterSpacing: 1, fontWeight: '900', color: C.blue, marginTop: 2 },
  desktopNavCaption: { fontSize: 9, letterSpacing: 1, fontWeight: '900', color: C.muted, marginBottom: 10 },
  desktopNavItem: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 12, marginBottom: 5 },
  desktopNavItemActive: { backgroundColor: C.softBlue },
  desktopNavIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F3F7FB', alignItems: 'center', justifyContent: 'center' },
  desktopNavIconActive: { backgroundColor: '#DDEEFF' },
  desktopNavLabel: { fontSize: 12, fontWeight: '800', color: C.text },
  desktopNavLabelActive: { color: C.navy },
  desktopNavHint: { fontSize: 9, color: C.muted, marginTop: 2 },
  desktopSidebarHelp: { marginTop: 18, padding: 13, borderRadius: 14, backgroundColor: C.softTeal, borderWidth: 1, borderColor: '#CDECEC' },
  desktopSidebarHelpTitle: { fontSize: 11, fontWeight: '900', color: C.navy },
  desktopSidebarHelpText: { fontSize: 9, lineHeight: 14, color: C.muted, marginTop: 4 },
  desktopSidebarHelpAction: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: C.white, marginTop: 10 },
  desktopSidebarHelpActionText: { fontSize: 9, fontWeight: '900', color: C.blue },
  desktopGuestNote: { fontSize: 8, lineHeight: 13, color: C.muted, marginTop: 12 },
  desktopMain: { flex: 1, minWidth: 0, backgroundColor: C.ice },
  desktopTopbar: { minHeight: 84, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18 },
  desktopTopbarTitle: { fontSize: 20, fontWeight: '900', color: C.navy },
  desktopTopbarEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.1, color: C.blue, marginBottom: 4 },
  desktopSearchWrap: { flex: 1, maxWidth: 430, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: '#F7FAFD', borderWidth: 1, borderColor: C.border },
  desktopSearchInput: { flex: 1, minWidth: 0, fontSize: 11.5, paddingVertical: 4, color: C.text },
  desktopBody: { flex: 1, minHeight: 0, backgroundColor: C.ice },
  desktopPageContent: { width: '100%', maxWidth: 1320, alignSelf: 'center', paddingHorizontal: 30, paddingTop: 25, paddingBottom: 42 },
  desktopWelcomeContent: { width: '100%', maxWidth: 1220, alignSelf: 'center', paddingHorizontal: 30, paddingTop: 28, paddingBottom: 36, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'space-between', gap: 20 },
  desktopWelcomeHero: { width: '55%', minHeight: 330, marginTop: 0, padding: 28, borderRadius: 26, gap: 22 },
  desktopTermsNote: { width: '100%', textAlign: 'left', marginTop: 0, paddingHorizontal: 4 },
  desktopSignInCard: { width: '40%', minWidth: 340, marginTop: 0, padding: 25, borderRadius: 24, justifyContent: 'center' },
  desktopTrustRow: { width: '100%', marginTop: 0, paddingVertical: 18, paddingHorizontal: 18 },
  desktopHomeHero: { minHeight: 250, padding: 28, borderRadius: 26, gap: 24 },
  desktopHomeDoctor: { width: 160, height: 210, borderRadius: 20 },
  desktopServicesGrid: { justifyContent: 'flex-start', gap: 16 },
  desktopServiceCard: { width: '23.5%', padding: 11, borderRadius: 18 },
  desktopServiceImageWrap: { height: 150, borderRadius: 13 },
  desktopFormCard: { maxWidth: 760, alignSelf: 'flex-start', padding: 22, borderRadius: 22 },
  desktopNarrowCard: { maxWidth: 820, alignSelf: 'flex-start', padding: 22, borderRadius: 22 },
  imageFallback: { backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
