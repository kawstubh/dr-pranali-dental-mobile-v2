import React from 'react';
import { ActivityIndicator, Text as NativeText, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { LanguageProvider } from './src/i18n';
import PatientExperience from './src/patient/PatientExperience';

function FontLoadingScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4FBFF', alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar style="dark" />
      <ActivityIndicator size="large" color="#0A84E8" />
      <NativeText style={{ marginTop: 12, fontSize: 13, color: '#657789' }}>Preparing your dental care home...</NativeText>
    </SafeAreaView>
  );
}

class PatientAppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[Oralyn Patient] Unhandled render error', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F4FBFF', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#DCE8F4' }}>
            <NativeText style={{ fontSize: 21, fontWeight: '700', color: '#0C3B82' }}>We could not open Oralyn</NativeText>
            <NativeText style={{ fontSize: 13, lineHeight: 20, color: '#657789', marginTop: 8 }}>The app encountered a display error. Your clinic account and appointment data have not been changed.</NativeText>
            <NativeText onPress={() => this.setState({ error: null })} accessibilityRole="button" style={{ color: '#0A84E8', fontWeight: '800', marginTop: 16 }}>Try again</NativeText>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function AppRoot() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans: require('./assets/fonts/PlusJakartaSans-Variable.ttf'),
    PlayfairDisplay: require('./assets/fonts/PlayfairDisplay-Variable.ttf'),
  });
  React.useEffect(() => {
    if (fontError) console.warn('[Oralyn Patient] Local font load failed; using system fallback.', fontError);
  }, [fontError]);
  return (
    <SafeAreaProvider>
      <PatientAppErrorBoundary>
        {fontsLoaded || fontError ? <LanguageProvider><PatientExperience /></LanguageProvider> : <FontLoadingScreen />}
      </PatientAppErrorBoundary>
    </SafeAreaProvider>
  );
}

export default function App() {
  return <AppRoot />;
}
