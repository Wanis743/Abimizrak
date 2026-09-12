export const supportedLocales = ["en", "ar", "fr", "es"] as const;

export type Locale = (typeof supportedLocales)[number];
export type Direction = "ltr" | "rtl";
export type InterpolationValues = Record<string, string | number>;
