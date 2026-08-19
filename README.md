# Dr. Pranali Dental Mobile App

Expo React Native mobile app for Dr. Pranali Dental Clinic.

## Included
- Premium white/blue mobile UI
- Dr. Pranali profile photo and BDS – Dental Surgeon
- Phone 9137007432
- WhatsApp and direct calling
- Home, Services, Appointment, Gallery and Contact tabs
- 20 dental services
- Appointment form connected to the existing API
- Google Maps location button

## Run
1. Open this folder in PowerShell.
2. Run `npm install` if dependencies are not installed.
3. Run `npx expo start --lan`.
4. Open the QR code with Expo Go.

## API
The appointment form currently uses:
`http://192.168.0.104:8080`

The computer running the API and the phone should be on the same Wi-Fi. If the computer's LAN IP changes, edit `API_URL` at the top of `App.js`.
