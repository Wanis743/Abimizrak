import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDirection, resolveLocale } from "./config";
import { interpolate, messages, type MessageKey } from "./index";
import type { Locale } from "./types";

type Theme = "light" | "dark";
type PreferencesContextValue = {
  locale: Locale;
  theme: Theme;
  direction: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readStored<T extends string>(key: string, fallback: T, valid: readonly T[]) {
  try {
    const value = window.localStorage.getItem(key) as T | null;
    return value && valid.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences still work when storage is unavailable.
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    resolveLocale(typeof window === "undefined" ? "en" : readStored("abi-locale", "en", ["en", "ar", "fr", "es"])),
  );
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === "undefined" ? "light" : readStored("abi-theme", "light", ["light", "dark"]),
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);
    document.documentElement.dataset.locale = locale;
    writeStored("abi-locale", locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("abi-theme", theme);
  }, [theme]);

  const value = useMemo<PreferencesContextValue>(() => ({
    locale,
    theme,
    direction: getDirection(locale),
    setLocale: setLocaleState,
    setTheme: setThemeState,
    t: (key, values) => interpolate(messages[locale][key] ?? messages.en[key], values),
  }), [locale, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used within PreferencesProvider");
  return context;
}
