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

The app uses the deployed HTTPS Dental API and does not require the phone and computer to be on the same Wi-Fi.


## Intelligence architecture

The application is being connected to the standalone [Universal Intelligence Engine](https://github.com/kawstubh/universal-intelligence-engine) through a Dental domain adapter.

Planned doctor-only intelligence modules:
- Patient intelligence
- Clinical and treatment research
- Evidence/source explorer
- Dental product and material intelligence
- Supplier/distributor intelligence
- Inventory and practice intelligence
- Referral/facility research

Clinical AI is decision support only. Patient data must be authorized, and diagnosis, treatment, surgery, referral and hospital decisions remain under qualified clinician control.

The dental kit/care-package concept is part of the patient-care fulfilment layer: the system can generate treatment-linked care requirements for doctor review rather than making the clinic dependent on selling products.
