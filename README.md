# Dr. Pranali Dental — AI-Ready Dental Care Platform

A React Native / Expo patient application for Dr. Pranali Dental Clinic, designed to connect with the Universal Intelligence Engine (UIE) for clinician-reviewed dental intelligence.

## Public status

This repository is **public** and intended for demonstration, pilot evaluation, and engineering collaboration.

### Current product scope

- Patient mobile experience
- Clinic profile and contact
- Dental services catalogue
- Appointment request workflow
- WhatsApp, calling and Maps actions
- Dental-domain intelligence adapter
- Patient-care planning contract
- Doctor intelligence contracts
- Clinical research and treatment research
- Product and supplier intelligence
- Practice and referral intelligence
- Clinician-review and patient-data authorization constraints

## Architecture

```
Patient App
    ↓
Dental Domain Adapter
    ↓
Universal Intelligence Engine
    ↓
Research / Reasoning / Evidence / Verification
    ↓
Clinician Review
```

The architecture is designed to support future Scano integration when the required external API/device integration becomes available.

## Safety

This software is an **AI-assisted clinical decision-support prototype/pilot**, not an autonomous diagnostic or treatment system.

The dental intelligence contracts explicitly require clinician review and prohibit autonomous diagnosis, treatment decisions, referrals and product purchases.

Do not commit real patient records, credentials, API keys, private certificates, or other secrets to this repository.

## Development

Requirements:

- Node.js
- npm
- Expo tooling

Install and run:

```bash
npm install
npx expo start
```

## API

The mobile client communicates with the clinic's HTTPS API for appointment requests. Production credentials and secrets must remain outside source control.

## Scano

Scano is an external integration dependency currently under discussion. The application is structured so that the integration can be added without replacing the core dental intelligence architecture.

## Disclaimer

This repository is provided for software development, demonstration and pilot purposes. Clinical workflows, patient data handling, regulatory requirements and deployment security must be reviewed before production use.

## License

License terms should be selected before external commercial redistribution.
