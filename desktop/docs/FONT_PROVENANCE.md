# Oralyn desktop font provenance

The desktop app bundles both fonts locally. It does not fetch font CSS or font files from a runtime CDN.

| Family | Use | Pinned upstream source | Licence |
|---|---|---|---|
| Plus Jakarta Sans | Body copy, navigation, labels, buttons and form controls | Google Fonts repository snapshot `c30b221beb0c1da59d563feb91ec8656a1fa972a`; Tokotype upstream commit `18d1cd2f7ea10481919d2f05c1f7064b7307fc26` | SIL Open Font License 1.1 |
| Playfair Display | Selected editorial page headings only | Google Fonts repository snapshot `c30b221beb0c1da59d563feb91ec8656a1fa972a`; upstream commit `80a334101928546b04fa9e709ad4b2f11f8a9e10` | SIL Open Font License 1.1 |

## Bundled assets

- `public/fonts/PlusJakartaSans-Variable.ttf` — variable weights 200–800; SHA-256 `89b3fb38aa0d275d7a731d0d817a4f1622b316b4d7fbdedcf02ee9099ff68bc8`.
- `public/fonts/PlayfairDisplay-Variable.ttf` — variable weights 400–900; SHA-256 `c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6`.
- The upstream SIL OFL 1.1 licence texts and Google Fonts metadata files are retained beside the font files.

Upstream source directories:

- https://github.com/google/fonts/tree/c30b221beb0c1da59d563feb91ec8656a1fa972a/ofl/plusjakartasans
- https://github.com/google/fonts/tree/c30b221beb0c1da59d563feb91ec8656a1fa972a/ofl/playfairdisplay

The font files were copied from the already-reviewed Patient font bundle in the Dr. Pranali Dental mobile repository, preserving the exact byte hashes. If a custom font fails to load, the CSS stack falls back to the operating system's native sans-serif or serif font. No unknown or remotely loaded font files are used.
