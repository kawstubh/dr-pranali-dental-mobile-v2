# Desktop font provenance

The Oralyn desktop application bundles both families locally. Runtime font loading does not depend on Google Fonts, a third-party CDN, or an external font service.

| Role | Family | Exact bundled file | Source revision | License |
|---|---|---|---|---|
| Body, navigation, controls | Plus Jakarta Sans | `public/fonts/PlusJakartaSans-Variable.ttf` | Upstream `tokotype/PlusJakartaSans`, commit `18d1cd2f7ea10481919d2f05c1f7064b7307fc26` | SIL Open Font License 1.1 |
| Editorial/display headings | Playfair Display | `public/fonts/PlayfairDisplay-Variable.ttf` | Upstream `clauseggers/Playfair`, commit `80a334101928546b04fa9e709ad4b2f11f8a9e10` | SIL Open Font License 1.1 |

## Source and version evidence

- Plus Jakarta Sans upstream: https://github.com/tokotype/PlusJakartaSans
- Google Fonts distribution metadata: https://github.com/google/fonts/tree/main/ofl/plusjakartasans
- The bundled Plus Jakarta Sans metadata records designer Tokotype, source commit `18d1cd2f7ea10481919d2f05c1f7064b7307fc26`, and the variable weight axis 200–800.
- Playfair Display upstream: https://github.com/clauseggers/Playfair
- Google Fonts distribution metadata: https://github.com/google/fonts/tree/main/ofl/playfairdisplay
- The bundled Playfair Display metadata records source commit `80a334101928546b04fa9e709ad4b2f11f8a9e10` and the variable weight axis 400–900.
- Exact upstream metadata snapshots are bundled as `Plus-Jakarta-Sans-METADATA.pb` and `Playfair-Display-METADATA.pb`.
- Full SIL OFL 1.1 texts are bundled beside the font files as `OFL-Plus-Jakarta-Sans.txt` and `OFL-Playfair-Display.txt`.

## Integrity

SHA-256:

- `PlusJakartaSans-Variable.ttf`: `89B3FB38AA0D275D7A731D0D817A4F1622B316B4D7FBDEDCF02EE9099FF68BC8`
- `PlayfairDisplay-Variable.ttf`: `C40F2293766A503BC70CCE9E512EF844A4CCB7CBCDE792FE2EA31D191917D8D6`

CSS uses local `@font-face` declarations under `/fonts/`. If a font cannot be loaded, the existing Georgia and system sans-serif fallback stacks remain available. Do not replace these files with unpinned remote imports.
