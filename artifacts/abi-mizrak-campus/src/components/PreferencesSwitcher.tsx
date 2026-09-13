import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, Check } from "lucide-react";
import { usePreferences } from "@/i18n/runtime";
import type { Locale } from "@/i18n/types";

const locales: {
  value: Locale;
  label: string;
  flag: string;
}[] = [
  { value: "en", label: "EN", flag: "🇬🇧" },
  { value: "fr", label: "FR", flag: "🇫🇷" },
  { value: "es", label: "ES", flag: "🇪🇸" },
  { value: "ar", label: "ع", flag: "🇩🇿" },
];

export function PreferencesSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, theme, setLocale, setTheme, t } = usePreferences();

  return (
    <div className={`preferences-switcher ${compact ? "preferences-switcher-compact" : ""}`}>
      {/* Language switcher — animated pill buttons */}
      <div className="lang-switcher" role="group" aria-label={t("language.label")}>
        {locales.map((item) => {
          const active = locale === item.value;
          return (
            <button
              key={item.value}
              type="button"
              className={`lang-btn ${active ? "lang-btn-active" : ""}`}
              onClick={() => setLocale(item.value)}
              aria-label={t(`language.${item.value}` as "language.en")}
              aria-pressed={active}
            >
              <span className="lang-flag">{item.flag}</span>
              <span className="lang-code">{item.label}</span>
              {active && (
                <motion.span
                  layoutId="lang-active-bg"
                  className="lang-active-bg"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Theme toggle — animated sun/moon */}
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? t("theme.light") : t("theme.dark")}
        title={theme === "dark" ? t("theme.light") : t("theme.dark")}
      >
        <AnimatePresence mode="wait" initial={false}>
          {theme === "dark" ? (
            <motion.span
              key="sun"
              initial={{ rotate: -90, opacity: 0, scale: 0.3 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className="theme-icon-wrap"
            >
              <Sun size={16} />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ rotate: 90, opacity: 0, scale: 0.3 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className="theme-icon-wrap"
            >
              <Moon size={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
