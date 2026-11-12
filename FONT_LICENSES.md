# Patient app font provenance

The Patient app uses Inter for all UI text. The previous Plus Jakarta Sans and Playfair Display variable-font files have been removed from the Patient asset tree and are no longer referenced by the app.

- Family: Inter
- Locally bundled weights: Regular 400, Medium 500, SemiBold 600, Bold 700, ExtraBold 800
- Upstream source: Google Fonts, https://github.com/google/fonts/tree/main/ofl/inter
- Pinned upstream metadata: Google Fonts Inter metadata version v20, lastModified 2025-09-10; full snapshot committed as licenses/Inter-Google-Fonts-metadata-v20.json
- Exact source files: static TTF URLs for the five weights are listed in the pinned metadata snapshot under files
- Integrity: each local TTF was downloaded from its exact Google Fonts v20 CDN URL and SHA-256 matched byte-for-byte
- Retrieval package: @expo-google-fonts/inter version 0.4.2 (used only to obtain static files; not required at runtime)
- Font licence: SIL Open Font License 1.1; full text is committed as licenses/Inter-OFL.txt
- Retrieval package licence: MIT; full text is committed as licenses/Expo-Google-Fonts-MIT.txt
- Runtime: fonts are bundled locally under assets/fonts and loaded by expo-font. No Google Fonts CSS, CDN request or runtime font download is used.
- Fallback: if any bundled font fails to load, the app continues with the Android/iOS platform system sans-serif font. The fallback path is explicit in FontReadyContext; it does not leave the app stuck on the font-loading screen.

## Bundled file SHA-256

| File | Weight | SHA-256 |
|---|---:|---|
| Inter-Regular.ttf | 400 | A414B48AA577EF2C62EBB135341DDEEF33EE26A4F5DC9F787F93C1AAB08EBB50 |
| Inter-Medium.ttf | 500 | F1738576525E86DB1D5CF63A6C1B56E0A7E2A2898B499AC93DB95F2E7A9F9CD5 |
| Inter-SemiBold.ttf | 600 | F30E9D2574C3BEC5144347FF965F9841C8F06857F0B7383000F8C9489A161841 |
| Inter-Bold.ttf | 700 | FBE825CBFC749317F57A1433D3905AA9D3F388732FD29B8E8A36F34845E3BC3E |
| Inter-ExtraBold.ttf | 800 | 1B9FAB96FFC7BCA31A9D4CD4D660CCE80B94695908EC7613AFDECE2B8CF803C2 |

Only these five Inter TTF files may remain in assets/fonts. The UI regression test checks the complete file list and every SHA-256 fingerprint.
