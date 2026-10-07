
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { requestPublicAppointment } from './src/api/dentalApi';
import {
  Button, Card, Chip, Input, BottomTabBar, ServiceTile, TimeSlot, CalendarStrip, ToothChart
} from './components/ui';
import { colors, spacing, typography, shadows } from './theme';

const PHONE = '9137007432';
const WHATSAPP = '919137007432';
const HERO_IMAGE = require('./assets/universal-dental-icon.png');
const DOCTOR_IMAGE = require('./assets/dr-pranali.jpg');

const services = [
  ['Dental Check-up','Complete oral examination','activity'],
  ['Scaling & Polishing','Remove plaque & stains','droplet'],
  ['Dental Fillings','Fix cavities','circle'],
  ['Root Canal Treatment','Save your natural tooth','activity'],
  ['Orthodontic Braces','Straighten your teeth','link-2'],
  ['Dental Implants','Restore your smile','plus-circle'],
  ['Tooth Whitening','Brighter, whiter smile','sun'],
  ['More','Explore all services','grid'],
];
const allServices = [
  ...services,
  ['Dental Crowns','Protect damaged teeth','award'],
  ['Dental Bridges','Replace missing teeth','git-merge'],
  ['Tooth Extraction','Safe, gentle extraction','minus-circle'],
  ['Wisdom Tooth Removal','Comfortable removal','activity'],
  ['Dentures','Complete & partial dentures','smile'],
  ['Kids Dental Care','Gentle pediatric care','heart'],
  ['Clear Aligners','Invisible alignment','layers'],
  ['Gum Disease Treatment','Healthy gums','activity'],
  ['Cosmetic Dentistry','Smile makeover','star'],
  ['Veneers','Natural-looking smile design','smile'],
  ['Full Mouth Rehabilitation','Complete restoration','target'],
  ['Emergency Dental Care','Immediate dental help','alert-circle'],
];

function ScreenBackground({children}) {
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
    <LinearGradient colors={[colors.backgroundStart,colors.backgroundEnd]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.screen}>{children}</LinearGradient>
  </ScrollView>;
}
function Brand({compact=false}) {
  return <View style={[styles.brand,compact&&styles.brandCompact]}>
    <Image source={HERO_IMAGE} style={styles.brandLogo} contentFit="contain"/>
    <View><Text style={styles.brandName}>Dr. Pranali</Text><Text style={styles.brandClinic}>DENTAL CLINIC</Text></View>
  </View>;
}
function WelcomeScreen({onStart}) {
 return <ScreenBackground>
   <View style={styles.onboardingTop}><Brand/><Pressable onPress={onStart} style={styles.skip}><Text style={styles.skipText}>Skip</Text></Pressable></View>
   <Text style={styles.heroHeading}>Beautiful Smile</Text><Text style={styles.heroHeadingBlue}>Confident You</Text>
   <Text style={styles.heroSub}>Expert dental care for a healthier, brighter smile</Text>
   <View style={styles.heroStage}><View style={styles.heroHalo}/><Image source={HERO_IMAGE} style={styles.heroImage} contentFit="contain"/></View>
   <Button title="Get Started" onPress={onStart}/>
   <Pressable onPress={()=>onStart('Services')} style={styles.explore}><Text style={styles.exploreText}>Explore Services</Text><Feather name="arrow-right" size={16} color={colors.primary}/></Pressable>
   <View style={styles.trust}><View><Text style={styles.trustValue}>20+</Text><Text style={styles.trustLabel}>Dental services</Text></View><View style={styles.trustDivider}/><View><Text style={styles.trustValue}>BDS</Text><Text style={styles.trustLabel}>Dental surgeon</Text></View><View style={styles.trustDivider}/><View><Text style={styles.trustValue}>AI</Text><Text style={styles.trustLabel}>Care support</Text></View></View>
   <Text style={styles.terms}>By continuing, you agree to our Terms & Privacy Policy</Text>
 </ScreenBackground>;
}
function HomeScreen({go}) {
 return <ScreenBackground>
   <View style={styles.homeGreeting}><View style={styles.greetingLeft}><Image source={DOCTOR_IMAGE} style={styles.avatar}/><View><Text style={styles.muted}>Good morning</Text><Text style={styles.greeting}>Welcome to your smile care</Text></View></View><View style={styles.bell}><Ionicons name="notifications-outline" size={20} color={colors.text}/><View style={styles.bellDot}/></View></View>
   <Input icon="search" placeholder="Search dental services..." style={styles.search}/>
   <LinearGradient colors={[colors.ctaStart,colors.ctaEnd]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.homeHero}>
     <View style={{flex:1}}><Text style={styles.homeHeroKicker}>YOUR SMILE MATTERS</Text><Text style={styles.homeHeroTitle}>Healthy Teeth{'\n'}Happier You</Text><Text style={styles.homeHeroSub}>Book your next dental visit in a few taps.</Text><Pressable onPress={()=>go('Appointment')} style={styles.heroBook}><Text style={styles.heroBookText}>Book Now</Text><Feather name="arrow-right" size={16} color={colors.primary}/></Pressable></View>
     <Image source={HERO_IMAGE} style={styles.homeHeroImage} contentFit="contain"/>
   </LinearGradient>
   <SectionHeader title="Explore Services" action="View all" onPress={()=>go('Services')}/>
   <View style={styles.serviceGrid}>{services.map(([title,sub,icon])=><ServiceTile key={title} title={title} subtitle={sub} icon={icon} compact onPress={()=>go('Services')}/>)}</View>
   <Card style={styles.offer}><View style={styles.offerCopy}><Text style={styles.offerKicker}>SPECIAL OFFER</Text><Text style={styles.offerTitle}>Professional{'\n'}Teeth Cleaning</Text><Text style={styles.offerSub}>Flat 25% OFF</Text><Pressable onPress={()=>go('Appointment')} style={styles.offerButton}><Text style={styles.offerButtonText}>Book Now</Text></Pressable></View><Image source={HERO_IMAGE} style={styles.offerImage} contentFit="contain"/></Card>
   <SectionHeader title="Your Care Journey"/>
   <View style={styles.journey}><JourneyItem icon="calendar" title="Next visit" value="Schedule your check-up"/><JourneyItem icon="shield" title="Dental health" value="Keep your smile protected"/><JourneyItem icon="message-circle" title="Need help?" value="Chat with the clinic"/></View>
 </ScreenBackground>;
}
function JourneyItem({icon,title,value}){return <View style={styles.journeyItem}><View style={styles.roundIcon}><Feather name={icon} size={17} color={colors.primary}/></View><View style={{flex:1}}><Text style={styles.journeyTitle}>{title}</Text><Text style={styles.journeyValue}>{value}</Text></View><Feather name="chevron-right" size={17} color={colors.muted}/></View>}
function SectionHeader({title,action,onPress}){return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action?<Pressable onPress={onPress}><Text style={styles.sectionAction}>{action}</Text></Pressable>:null}</View>}

function ServicesScreen({go}) {
 const [query,setQuery]=useState(''); const [category,setCategory]=useState('All');
 const filtered=allServices.filter(s=>s[0].toLowerCase().includes(query.toLowerCase()));
 return <ScreenBackground><View style={styles.pageHeader}><Text style={styles.pageTitle}>Services</Text><Text style={styles.pageSub}>Complete dental care, from preventive to cosmetic.</Text></View>
   <Input icon="search" placeholder="Search dental services..." value={query} onChangeText={setQuery}/>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{['All','General','Cosmetic','Restorative'].map(x=><Chip key={x} label={x} selected={category===x} onPress={()=>setCategory(x)}/>)}</ScrollView>
   <View style={{marginTop:8}}>{filtered.map(([title,sub,icon])=><ServiceTile key={title} title={title} subtitle={sub} icon={icon} onPress={()=>go('Appointment')}/>)}</View>
 </ScreenBackground>;
}
function AppointmentScreen({onBooked}) {
 const [name,setName]=useState(''); const [phone,setPhone]=useState(''); const [date,setDate]=useState(''); const [time,setTime]=useState(''); const [reason,setReason]=useState('Dental Check-up'); const [note,setNote]=useState(''); const [sending,setSending]=useState(false);
 const days=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return {key:d.toISOString().slice(0,10),week:d.toLocaleDateString('en-IN',{weekday:'short'}),num:d.getDate()};}),[]);
 const submit=async()=>{if(!name.trim()||phone.replace(/\D/g,'').length<10||!date||!time){Alert.alert('Missing details','Please complete your name, mobile number, date and time.');return;}setSending(true);try{const [y,m,d]=date.split('-');const match=time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);let h=Number(match?.[1]||10);const min=Number(match?.[2]||0);const ap=(match?.[3]||'AM');if(ap==='PM'&&h!==12)h+=12;if(ap==='AM'&&h===12)h=0;const starts_at=y+'-'+m+'-'+d+'T'+String(h).padStart(2,'0')+':'+String(min).padStart(2,'0')+':00+05:30';await requestPublicAppointment({name:name.trim(),phone:phone.trim(),starts_at,treatment_type:reason,note:note.trim()||null,intelligence_request:false});onBooked({name,phone,date,time,reason});}catch(e){Alert.alert('Connection problem',e.message||('Please call '+PHONE+' for immediate assistance.'));}finally{setSending(false);}};
 return <ScreenBackground><View style={styles.pageHeader}><Text style={styles.pageTitle}>Book Appointment</Text><Text style={styles.pageSub}>Choose a convenient time and the clinic will confirm it.</Text></View>
  <Card><Text style={styles.formLabel}>Patient details</Text><Input icon="user" placeholder="Full name" value={name} onChangeText={setName}/><View style={{height:10}}/><Input icon="phone" placeholder="10-digit mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={10}/></Card>
  <Card style={{marginTop:12}}><Text style={styles.formLabel}>Select date</Text><CalendarStrip days={days} selected={date||days[0].key} onSelect={setDate}/><Text style={[styles.formLabel,{marginTop:18}]}>Select time</Text><View style={styles.timeGrid}>{['10:00 AM','11:00 AM','12:00 PM','05:00 PM','06:00 PM','07:00 PM'].map(x=><TimeSlot key={x} label={x} selected={time===x} onPress={()=>setTime(x)}/>)}</View><Text style={[styles.formLabel,{marginTop:18}]}>Reason for visit</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{['Dental Check-up','Cleaning','Tooth Pain','RCT','Braces'].map(x=><Chip key={x} label={x} selected={reason===x} onPress={()=>setReason(x)}/>)}</ScrollView><Input icon="edit-3" placeholder="Anything the doctor should know? (optional)" value={note} onChangeText={setNote} style={{marginTop:12}}/><Button title={sending?'Sending request...':'Confirm Appointment'} onPress={submit} disabled={sending} icon="check-circle"/></Card>
 </ScreenBackground>;
}
function AppointmentBooked({booking,onBack}){return <ScreenBackground><View style={styles.booked}><LinearGradient colors={[colors.ctaStart,colors.ctaEnd]} style={styles.checkCircle}><Feather name="check" size={44} color={colors.white}/></LinearGradient><Text style={styles.bookedTitle}>Appointment Booked!</Text><Text style={styles.bookedSub}>Your appointment request has been sent to Dr. Pranali Dental Clinic.</Text><Card style={styles.bookingCard}><View style={styles.doctorRow}><Image source={DOCTOR_IMAGE} style={styles.doctorAvatar}/><View><Text style={styles.doctorName}>Dr. Pranali Chaudhari</Text><Text style={styles.doctorRole}>General & Cosmetic Dentist</Text></View></View><InfoRow icon="calendar" text={booking?.date||'Selected date'}/><InfoRow icon="clock" text={booking?.time||'Selected time'}/><InfoRow icon="map-pin" text="Dr. Pranali Dental Clinic • Taloja"/></Card><Button title="Back to Home" onPress={onBack} variant="outline" icon="home"/></View></ScreenBackground>;}
function InfoRow({icon,text}){return <View style={styles.infoRow}><Feather name={icon} size={17} color={colors.primary}/><Text style={styles.infoText}>{text}</Text></View>}
function AIDentalScreen(){const [module,setModule]=useState('Patient Intelligence');const modules=['Patient Intelligence','Scan Intelligence','Clinical Research','Treatment Research','Product & Supplier Intelligence','Practice Intelligence','Referral Intelligence'];return <ScreenBackground><View style={styles.aiHero}><Text style={styles.aiKicker}>DENTAL INTELLIGENCE</Text><Text style={styles.aiTitle}>Your AI Dental Care</Text><Text style={styles.aiSub}>Organize your dental journey and prepare better questions for your clinician.</Text></View><Card><Text style={styles.formLabel}>Dental health overview</Text><ToothChart/><View style={styles.aiChips}>{modules.map(x=><Chip key={x} label={x} selected={module===x} onPress={()=>setModule(x)}/>)}</View><View style={styles.aiResult}><Feather name="zap" size={20} color={colors.primary}/><Text style={styles.aiResultTitle}>{module}</Text><Text style={styles.aiResultText}>AI support organizes information and evidence for clinician review. It does not replace diagnosis or treatment decisions.</Text></View></Card></ScreenBackground>;}
function GalleryScreen(){return <ScreenBackground><View style={styles.pageHeader}><Text style={styles.pageTitle}>Smile Gallery</Text><Text style={styles.pageSub}>A visual place for treatment journeys and clinic updates.</Text></View><Card><Image source={HERO_IMAGE} style={styles.galleryImage} contentFit="contain"/><Text style={styles.galleryTitle}>Modern care. Confident smiles.</Text><Text style={styles.galleryText}>Treatment images can be added here as the clinic's approved media library grows.</Text></Card></ScreenBackground>;}
function ContactScreen(){return <ScreenBackground><View style={styles.pageHeader}><Text style={styles.pageTitle}>Contact Clinic</Text><Text style={styles.pageSub}>We are here when you need us.</Text></View><Card><View style={styles.contactBrand}><Image source={DOCTOR_IMAGE} style={styles.contactPhoto}/><View><Text style={styles.doctorName}>Dr. Pranali Dental Clinic</Text><Text style={styles.doctorRole}>Taloja, Navi Mumbai</Text></View></View><Pressable onPress={()=>Linking.openURL('tel:+'+PHONE)} style={styles.contactAction}><Feather name="phone" size={18} color={colors.primary}/><Text style={styles.contactActionText}>Call clinic</Text></Pressable><Pressable onPress={()=>Linking.openURL('https://wa.me/'+WHATSAPP)} style={styles.contactAction}><Ionicons name="logo-whatsapp" size={19} color={colors.success}/><Text style={styles.contactActionText}>WhatsApp clinic</Text></Pressable><View style={styles.address}><Feather name="map-pin" size={18} color={colors.primary}/><Text style={styles.addressText}>Taloja, Navi Mumbai{'\n'}10:00 AM – 2:00 PM and 5:00 PM – 9:00 PM</Text></View></Card></ScreenBackground>;}

export default function App(){
 const [started,setStarted]=useState(false); const [tab,setTab]=useState('Home'); const [booking,setBooking]=useState(null);
 if(!started) return <WelcomeScreen onStart={(nextTab)=>{setStarted(true);if(nextTab)setTab(nextTab);}}/>;
 const tabs=[{key:'Home',label:'Home',icon:'home'},{key:'Appointment',label:'Appointments',icon:'calendar'},{key:'Services',label:'Services',icon:'grid'},{key:'AI Dental',label:'AI Dental',icon:'zap'},{key:'Contact',label:'Profile',icon:'user'}];
 let screen;
 if(booking) screen=<AppointmentBooked booking={booking} onBack={()=>{setBooking(null);setTab('Home')}}/>;
 else if(tab==='Appointment') screen=<AppointmentScreen onBooked={setBooking}/>;
 else if(tab==='Services') screen=<ServicesScreen go={setTab}/>;
 else if(tab==='AI Dental') screen=<AIDentalScreen/>;
 else if(tab==='Contact') screen=<ContactScreen/>;
 else screen=<HomeScreen go={setTab}/>;
 return <SafeAreaView style={styles.root}><StatusBar style="dark"/><View style={styles.topbar}><Brand compact/><Pressable onPress={()=>Alert.alert('Dr. Pranali Dental','BDS – Dental Surgeon\n\nTaloja, Navi Mumbai\n'+PHONE)} style={styles.topIcon}><Feather name="more-horizontal" size={20} color={colors.text}/></Pressable></View><View style={styles.body}>{screen}</View><BottomTabBar items={tabs} active={tab} onChange={setTab}/></SafeAreaView>;
}

const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:colors.background},screen:{flexGrow:1,paddingHorizontal:spacing.screen,paddingTop:8,paddingBottom:22},scroll:{paddingBottom:8},
 onboardingTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},brand:{flexDirection:'row',alignItems:'center'},brandCompact:{gap:8},brandLogo:{width:42,height:42},brandName:{fontFamily:typography.family.bold,fontSize:16,fontWeight:'800',color:colors.text},brandClinic:{fontFamily:typography.family.bold,fontSize:8,letterSpacing:1.8,color:colors.primary,marginTop:1},skip:{backgroundColor:colors.white,borderWidth:1,borderColor:colors.border,borderRadius:spacing.pill,paddingHorizontal:14,paddingVertical:8},skipText:{fontFamily:typography.family.medium,fontSize:12,color:colors.body,fontWeight:'700'},
 heroHeading:{fontFamily:typography.family.bold,fontSize:34,lineHeight:38,fontWeight:'800',color:colors.text,textAlign:'center',marginTop:18},heroHeadingBlue:{fontFamily:typography.family.bold,fontSize:34,lineHeight:38,fontWeight:'800',color:colors.primary,textAlign:'center'},heroSub:{fontFamily:typography.family.regular,fontSize:14,lineHeight:20,color:colors.body,textAlign:'center',marginTop:9,paddingHorizontal:22},heroStage:{height:300,alignItems:'center',justifyContent:'center',position:'relative'},heroHalo:{position:'absolute',width:240,height:240,borderRadius:120,backgroundColor:colors.softBlue},heroImage:{width:260,height:260},explore:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingVertical:13},exploreText:{fontFamily:typography.family.medium,fontSize:13,fontWeight:'700',color:colors.text},trust:{backgroundColor:colors.white,borderWidth:1,borderColor:colors.border,borderRadius:spacing.radiusLg,paddingVertical:13,flexDirection:'row',justifyContent:'space-around',alignItems:'center',...shadows.card},trustValue:{fontFamily:typography.family.bold,fontSize:16,fontWeight:'800',color:colors.primary,textAlign:'center'},trustLabel:{fontFamily:typography.family.medium,fontSize:9,color:colors.body,textAlign:'center',marginTop:2},trustDivider:{width:1,height:30,backgroundColor:colors.border},terms:{fontFamily:typography.family.regular,fontSize:9,color:colors.muted,textAlign:'center',marginTop:12},
 topbar:{height:62,backgroundColor:colors.white,borderBottomWidth:1,borderBottomColor:colors.border,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},topIcon:{width:40,height:40,borderRadius:20,backgroundColor:colors.softBlue,alignItems:'center',justifyContent:'center'},body:{flex:1},homeGreeting:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:8},greetingLeft:{flexDirection:'row',alignItems:'center',flex:1},avatar:{width:44,height:44,borderRadius:22},muted:{fontFamily:typography.family.medium,fontSize:11,color:colors.muted},greeting:{fontFamily:typography.family.bold,fontSize:16,fontWeight:'800',color:colors.text,marginTop:2},bell:{width:42,height:42,borderRadius:21,backgroundColor:colors.white,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border},bellDot:{position:'absolute',top:9,right:10,width:7,height:7,borderRadius:4,backgroundColor:colors.danger},search:{marginVertical:8},
 homeHero:{minHeight:180,borderRadius:spacing.radiusXl,padding:18,flexDirection:'row',overflow:'hidden',...shadows.button},homeHeroKicker:{fontFamily:typography.family.bold,fontSize:9,letterSpacing:1,color:colors.white,opacity:.85},homeHeroTitle:{fontFamily:typography.family.bold,fontSize:24,lineHeight:28,fontWeight:'800',color:colors.white,marginTop:5},homeHeroSub:{fontFamily:typography.family.regular,fontSize:11,color:colors.white,lineHeight:16,opacity:.9,marginTop:7,maxWidth:190},heroBook:{marginTop:12,alignSelf:'flex-start',backgroundColor:colors.white,borderRadius:spacing.pill,paddingHorizontal:13,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:6},heroBookText:{fontFamily:typography.family.bold,fontSize:11,color:colors.primary,fontWeight:'800'},homeHeroImage:{width:125,height:125,alignSelf:'center',marginRight:-7},sectionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:20,marginBottom:10},sectionTitle:{fontFamily:typography.family.bold,fontSize:18,fontWeight:'800',color:colors.text},sectionAction:{fontFamily:typography.family.bold,fontSize:11,color:colors.primary,fontWeight:'800'},serviceGrid:{flexDirection:'row',flexWrap:'wrap',gap:7},offer:{marginTop:14,minHeight:150,flexDirection:'row',overflow:'hidden'},offerCopy:{flex:1},offerKicker:{fontFamily:typography.family.bold,fontSize:9,letterSpacing:1,color:colors.primary,fontWeight:'800'},offerTitle:{fontFamily:typography.family.bold,fontSize:17,lineHeight:21,color:colors.text,fontWeight:'800',marginTop:4},offerSub:{fontFamily:typography.family.bold,fontSize:13,color:colors.danger,fontWeight:'800',marginTop:5},offerButton:{alignSelf:'flex-start',backgroundColor:colors.primary,borderRadius:10,paddingHorizontal:12,paddingVertical:8,marginTop:10},offerButtonText:{fontFamily:typography.family.bold,fontSize:10,color:colors.white,fontWeight:'800'},offerImage:{width:135,height:135,alignSelf:'center'},journey:{gap:8},journeyItem:{backgroundColor:colors.white,borderWidth:1,borderColor:colors.border,borderRadius:spacing.radiusMd,padding:11,flexDirection:'row',alignItems:'center'},roundIcon:{width:38,height:38,borderRadius:12,backgroundColor:colors.softBlue,alignItems:'center',justifyContent:'center',marginRight:10},journeyTitle:{fontFamily:typography.family.bold,fontSize:12,color:colors.text,fontWeight:'800'},journeyValue:{fontFamily:typography.family.regular,fontSize:10,color:colors.body,marginTop:2},
 pageHeader:{paddingTop:8,paddingBottom:12},pageTitle:{fontFamily:typography.family.bold,fontSize:28,fontWeight:'800',color:colors.text},pageSub:{fontFamily:typography.family.regular,fontSize:13,color:colors.body,lineHeight:19,marginTop:4},chips:{gap:8,paddingVertical:12},timeGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},formLabel:{fontFamily:typography.family.bold,fontSize:13,color:colors.text,fontWeight:'800',marginBottom:9},
 booked:{alignItems:'center',paddingTop:35},checkCircle:{width:92,height:92,borderRadius:46,alignItems:'center',justifyContent:'center',...shadows.button},bookedTitle:{fontFamily:typography.family.bold,fontSize:25,fontWeight:'800',color:colors.text,marginTop:20},bookedSub:{fontFamily:typography.family.regular,fontSize:13,color:colors.body,textAlign:'center',lineHeight:19,marginTop:7,maxWidth:310},bookingCard:{width:'100%',marginTop:20},doctorRow:{flexDirection:'row',alignItems:'center',marginBottom:15},doctorAvatar:{width:48,height:48,borderRadius:24,marginRight:11},doctorName:{fontFamily:typography.family.bold,fontSize:14,fontWeight:'800',color:colors.text},doctorRole:{fontFamily:typography.family.regular,fontSize:10,color:colors.body,marginTop:2},infoRow:{flexDirection:'row',alignItems:'center',gap:9,paddingVertical:8,borderTopWidth:1,borderTopColor:colors.border},infoText:{fontFamily:typography.family.medium,fontSize:12,color:colors.body},
 aiHero:{backgroundColor:colors.primaryDark,borderRadius:spacing.radiusXl,padding:18,marginBottom:12},aiKicker:{fontFamily:typography.family.bold,fontSize:9,letterSpacing:1,color:colors.blue100},aiTitle:{fontFamily:typography.family.bold,fontSize:24,fontWeight:'800',color:colors.white,marginTop:4},aiSub:{fontFamily:typography.family.regular,fontSize:12,color:colors.white,lineHeight:18,opacity:.9,marginTop:5},aiChips:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:12},aiResult:{backgroundColor:colors.softBlue,borderRadius:spacing.radiusMd,padding:13,marginTop:12},aiResultTitle:{fontFamily:typography.family.bold,fontSize:14,fontWeight:'800',color:colors.text,marginTop:5},aiResultText:{fontFamily:typography.family.regular,fontSize:11,color:colors.body,lineHeight:17,marginTop:4},
 galleryImage:{width:'100%',height:220},galleryTitle:{fontFamily:typography.family.bold,fontSize:20,fontWeight:'800',color:colors.text,marginTop:8},galleryText:{fontFamily:typography.family.regular,fontSize:12,color:colors.body,lineHeight:18,marginTop:4},contactBrand:{flexDirection:'row',alignItems:'center',marginBottom:18},contactPhoto:{width:58,height:58,borderRadius:29,marginRight:12},contactAction:{height:50,borderRadius:spacing.radiusMd,borderWidth:1,borderColor:colors.border,flexDirection:'row',alignItems:'center',paddingHorizontal:15,marginTop:8,gap:10,backgroundColor:colors.white},contactActionText:{fontFamily:typography.family.bold,fontSize:13,color:colors.text,fontWeight:'800'},address:{marginTop:16,padding:13,borderRadius:spacing.radiusMd,backgroundColor:colors.softBlue,flexDirection:'row',gap:9},addressText:{fontFamily:typography.family.regular,fontSize:11,color:colors.body,lineHeight:17}
});
