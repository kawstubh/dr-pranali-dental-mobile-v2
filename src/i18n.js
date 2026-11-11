import React, { createContext, useContext, useEffect, useState } from 'react';
import { Pressable, Text as NativeText, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext({ language: 'en', setLanguage: () => {}, t: (s) => s });
const dictionaries = {
  mr: {
    'Home':'मुख्यपृष्ठ','Services':'सेवा','Appointment':'अपॉइंटमेंट','Gallery':'गॅलरी','Contact':'संपर्क',
    'Book Appointment':'अपॉइंटमेंट बुक करा','WhatsApp Clinic':'क्लिनिक WhatsApp','Call Us':'कॉल करा',
    'Healthy Smiles':'निरोगी हास्य','Happier Lives':'आनंदी जीवन','Welcome':'स्वागत आहे',
    'Continue with Google':'Google द्वारे पुढे जा','Explore as a guest':'अतिथी म्हणून पहा',
    'Browse dental services':'दंतसेवा पहा','Dental Services':'दंतसेवा','Search dental services…':'दंतसेवा शोधा…',
    'All':'सर्व','Book this service':'ही सेवा बुक करा','Appointment Requested':'अपॉइंटमेंटची विनंती पाठवली',
    'Missing details':'माहिती अपूर्ण आहे','Please enter your name, phone, preferred date and time.':'कृपया नाव, फोन, पसंतीची तारीख आणि वेळ भरा.',
    'Doctor Login':'डॉक्टर लॉगिन','Clinic email':'क्लिनिक ईमेल','Password':'पासवर्ड','Secure doctor login':'सुरक्षित डॉक्टर लॉगिन',
    'Sign out':'साइन आउट','Appointments':'अपॉइंटमेंट्स','Patients':'रुग्ण','Dental Chart':'दंत चार्ट',
    'Save Periodontogram':'पीरिओडॉन्टोग्राम जतन करा','Saving…':'जतन होत आहे…','Refresh':'रिफ्रेश',
    'Retry':'पुन्हा प्रयत्न करा','Confirm':'पुष्टी करा','Complete':'पूर्ण','Call':'कॉल','Dismiss':'बंद करा',
    'English':'इंग्रजी','मराठी':'मराठी','हिन्दी':'हिंदी'
  },
  hi: {
    'Home':'होम','Services':'सेवाएँ','Appointment':'अपॉइंटमेंट','Gallery':'गैलरी','Contact':'संपर्क',
    'Book Appointment':'अपॉइंटमेंट बुक करें','WhatsApp Clinic':'क्लिनिक WhatsApp','Call Us':'कॉल करें',
    'Healthy Smiles':'स्वस्थ मुस्कान','Happier Lives':'खुशहाल जीवन','Welcome':'स्वागत है',
    'Continue with Google':'Google से जारी रखें','Explore as a guest':'अतिथि के रूप में देखें',
    'Browse dental services':'दंत सेवाएँ देखें','Dental Services':'दंत सेवाएँ','Search dental services…':'दंत सेवाएँ खोजें…',
    'All':'सभी','Book this service':'यह सेवा बुक करें','Appointment Requested':'अपॉइंटमेंट अनुरोध भेजा गया',
    'Missing details':'जानकारी अधूरी है','Please enter your name, phone, preferred date and time.':'कृपया नाम, फोन, पसंदीदा तारीख और समय भरें।',
    'Doctor Login':'डॉक्टर लॉगिन','Clinic email':'क्लिनिक ईमेल','Password':'पासवर्ड','Secure doctor login':'सुरक्षित डॉक्टर लॉगिन',
    'Sign out':'साइन आउट','Appointments':'अपॉइंटमेंट','Patients':'मरीज़','Dental Chart':'डेंटल चार्ट',
    'Save Periodontogram':'पीरियोडॉन्टोग्राम सेव करें','Saving…':'सेव हो रहा है…','Refresh':'रीफ़्रेश',
    'Retry':'फिर कोशिश करें','Confirm':'पुष्टि करें','Complete':'पूरा करें','Call':'कॉल','Dismiss':'बंद करें',
    'English':'अंग्रेज़ी','मराठी':'मराठी','हिन्दी':'हिंदी'
  }
};
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  useEffect(() => { AsyncStorage.getItem('dental-app-language').then(v => { if (['en','mr','hi'].includes(v)) setLanguageState(v); }).catch(()=>{}); }, []);
  const setLanguage = (value) => { setLanguageState(value); AsyncStorage.setItem('dental-app-language', value).catch(()=>{}); };
  const t = (value) => (typeof value === 'string' ? (dictionaries[language]?.[value] || value) : value);
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}
export function useTranslation() { return useContext(LanguageContext); }
export function LanguageSwitch() {
  const { language, setLanguage } = useTranslation();
  return <View style={{ flexDirection:'row', gap:5, alignItems:'center', justifyContent:'center', paddingVertical:7 }}>
    {[['en','EN'],['mr','मराठी'],['hi','हिन्दी']].map(([code,label]) =>
      <Pressable key={code} accessibilityRole="button" accessibilityLabel={'Language '+label} onPress={()=>setLanguage(code)}
        style={{paddingHorizontal:9,paddingVertical:6,borderRadius:9,backgroundColor:language===code?'#00C6C8':'#EAF2F8',borderWidth:1,borderColor:language===code?'#00C6C8':'#D6E2EC'}}>
        <NativeText style={{fontSize:11,fontWeight:'900',color:language===code?'#073B5C':'#23435E'}}>{label}</NativeText>
      </Pressable>)}
  </View>;
}
