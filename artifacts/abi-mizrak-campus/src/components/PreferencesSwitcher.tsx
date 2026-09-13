import { Globe2, Moon, Sun } from "lucide-react";
import { usePreferences } from "@/i18n/runtime";
import type { Locale } from "@/i18n/types";

const locales: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
  { value: "es", label: "ES" },
  { value: "ar", label: "ع" },
];

export function PreferencesSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, theme, setLocale, setTheme, t } = usePreferences();
  return (
    <div className={`preferences-switcher ${compact ? "preferences-switcher-compact" : ""}`}>
      <div className="preferences-control" role="group" aria-label={t("language.label")}>
        <Globe2 size={14} aria-hidden="true" />
        <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t("language.label")}>
          {locales.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      <button
        type="button"
        className="preferences-theme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? t("theme.light") : t("theme.dark")}
        title={theme === "dark" ? t("theme.light") : t("theme.dark")}
      >
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        <span className="sr-only">{theme === "dark" ? t("theme.light") : t("theme.dark")}</span>
      </button>
    </div>
  );
}
