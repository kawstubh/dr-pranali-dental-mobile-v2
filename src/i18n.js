import React, { createContext, useContext, useEffect, useState } from 'react';
import { Pressable, Text as NativeText, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translate } from './translations';

const LanguageContext = createContext({ language: 'en', setLanguage: () => {}, t: (s) => s });

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  useEffect(() => {
    AsyncStorage.getItem('dental-app-language')
      .then(value => { if (['en', 'mr', 'hi'].includes(value)) setLanguageState(value); })
      .catch(() => {});
  }, []);
  const setLanguage = value => {
    if (!['en', 'mr', 'hi'].includes(value)) return;
    setLanguageState(value);
    AsyncStorage.setItem('dental-app-language', value).catch(() => {});
  };
  return <LanguageContext.Provider value={{ language, setLanguage, t: value => translate(language, value) }}>{children}</LanguageContext.Provider>;
}

export function useTranslation() { return useContext(LanguageContext); }

export function LanguageSwitch() {
  const { language, setLanguage } = useTranslation();
  return <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 7 }}>
    {[['en', 'EN'], ['mr', 'मराठी'], ['hi', 'हिन्दी']].map(([code, label]) =>
      <Pressable key={code} accessibilityRole="button" accessibilityLabel={'Language ' + label} onPress={() => setLanguage(code)}
        style={{ paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, backgroundColor: language === code ? '#00C6C8' : '#EAF2F8', borderWidth: 1, borderColor: language === code ? '#00C6C8' : '#D6E2EC' }}>
        <NativeText style={{ fontSize: 11, fontWeight: '900', color: language === code ? '#073B5C' : '#23435E' }}>{label}</NativeText>
      </Pressable>)}
  </View>;
}
