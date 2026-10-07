# Google Sign-In setup

Both apps now use the free Supabase Auth Google flow.

## Supabase project
The mobile clients are prepared for the Dental Supabase project:
- URL: https://jzxbeldubkhwnznrathu.supabase.co
- Patient redirect: `drpranali://auth/callback`
- Doctor redirect: `drpranali-doctor://auth/callback`

## Supabase Dashboard
1. Authentication -> Providers -> Google -> enable Google.
2. Create/configure the Google OAuth Web client in Google Cloud.
3. Add the Supabase Auth callback URL shown by the Google provider configuration to the Google OAuth client's Authorized redirect URIs.
4. Add these mobile redirects to Supabase Authentication -> URL Configuration:
   - `drpranali://auth/callback`
   - `drpranali-doctor://auth/callback`

## Doctor API
Set the server-only Render variable:
`DENTAL_GOOGLE_ALLOWED_EMAIL=<the clinic doctor's Google account email>`

The API validates the Supabase session and only creates a Dental API doctor session for that authorized email.

No Google client secret is stored in the mobile apps. The Supabase publishable key is the only client-side Supabase credential.
