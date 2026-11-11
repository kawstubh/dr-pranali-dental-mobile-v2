# Patient app typography and font licensing

The Patient app bundles both typefaces locally. No Google Fonts CSS, runtime CDN request, or remote font download is used.

| Family | Use | Pinned source version | Licence |
|---|---|---|---|
| Plus Jakarta Sans | Body copy, labels, buttons and form controls | Google Fonts snapshot c30b221beb0c1da59d563feb91ec8656a1fa972a; upstream Tokotype commit 18d1cd2f7ea10481919d2f05c1f7064b7307fc26 | SIL Open Font License 1.1 |
| Playfair Display | Editorial page and section headings | Google Fonts snapshot c30b221beb0c1da59d563feb91ec8656a1fa972a; upstream commit 80a334101928546b04fa9e709ad4b2f11f8a9e10 | SIL Open Font License 1.1 |

## Bundled files

- assets/fonts/PlusJakartaSans-Variable.ttf — variable weight axis 200–800; SHA-256 89b3fb38aa0d275d7a731d0d817a4f1622b316b4d7fbdedcf02ee9099ff68bc8.
- assets/fonts/PlayfairDisplay-Variable.ttf — variable weight axis 400–900; SHA-256 c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6.
- assets/fonts/OFL-Plus-Jakarta-Sans.txt and assets/fonts/OFL-Playfair-Display.txt contain the upstream licence texts.
- The corresponding METADATA.pb files are retained beside the fonts for source and designer traceability.

Upstream source directories:

- https://github.com/google/fonts/tree/c30b221beb0c1da59d563feb91ec8656a1fa972a/ofl/plusjakartasans
- https://github.com/google/fonts/tree/c30b221beb0c1da59d563feb91ec8656a1fa972a/ofl/playfairdisplay

The app loads the bundled TTF files through expo-font. If a font fails to load, the app continues with platform system fonts (Roboto on Android and native system sans/serif families on iOS). The app does not fetch fonts over the network.

No other custom font files are included in the Patient app asset tree.

## Iconography

- The interface uses the Feather icon set through `@expo/vector-icons` version 15.1.1. The package bundles its icon assets locally; it does not request icon fonts from a CDN. The package is MIT-licensed (upstream Feather Icons are also MIT-licensed). These glyph assets are interface icons, not body or heading typefaces.

