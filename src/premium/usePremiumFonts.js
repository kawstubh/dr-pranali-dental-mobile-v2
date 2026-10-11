import { useFonts } from '@expo-google-fonts/plus-jakarta-sans';

export function usePremiumFonts() {
  return useFonts({
    PlusJakartaSans_400Regular: require('@expo-google-fonts/plus-jakarta-sans/400Regular'),
    PlusJakartaSans_600SemiBold: require('@expo-google-fonts/plus-jakarta-sans/600SemiBold'),
    PlusJakartaSans_700Bold: require('@expo-google-fonts/plus-jakarta-sans/700Bold'),
    PlusJakartaSans_800ExtraBold: require('@expo-google-fonts/plus-jakarta-sans/800ExtraBold'),
  });
}
