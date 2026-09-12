import { supportedLocales, type Direction, type Locale } from "./types";

export const defaultLocale: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return (supportedLocales as readonly unknown[]).includes(value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function getDirection(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}
