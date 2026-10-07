export const typography = {
  family: {
    regular: "System",
    medium: "System",
    semibold: "System",
    bold: "System",
  },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: "800" },
  h2: { fontSize: 25, lineHeight: 31, fontWeight: "800" },
  h3: { fontSize: 20, lineHeight: 26, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 21, fontWeight: "400" },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 1.15,
  },
} as const;
