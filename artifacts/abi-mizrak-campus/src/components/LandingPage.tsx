import { createElement, useEffect, useState } from "react";
import { ArrowRight, Globe2, Moon, ShieldCheck, Sparkles, Sun, UsersRound } from "lucide-react";
import { getDirection, resolveLocale, type Locale } from "@/i18n";

type Theme = "light" | "dark";

const copy = {
  en: { eyebrow: "Lycée Abi Mizrak · Bou Saâda", title: "A digital campus built for every school day.", body: "One trusted place for learning, collaboration, projects, events, and the people who make our school community thrive.", signIn: "Sign in", join: "Create account", explore: "Explore the campus", trusted: "Verified school community", connected: "Students and teachers, connected", location: "Bou Saâda, Algeria" },
  fr: { eyebrow: "Lycée Abi Mizrak · Bou Saâda", title: "Un campus numérique pensé pour chaque journée scolaire.", body: "Un espace de confiance pour apprendre, collaborer, créer des projets, suivre les événements et faire vivre notre communauté scolaire.", signIn: "Se connecter", join: "Créer un compte", explore: "Découvrir le campus", trusted: "Communauté scolaire vérifiée", connected: "Élèves et enseignants, réunis", location: "Bou Saâda, Algérie" },
  es: { eyebrow: "Lycée Abi Mizrak · Bou Saâda", title: "Un campus digital para cada día de aprendizaje.", body: "Un lugar de confianza para aprender, colaborar, crear proyectos, seguir eventos y fortalecer nuestra comunidad escolar.", signIn: "Iniciar sesión", join: "Crear cuenta", explore: "Explorar el campus", trusted: "Comunidad escolar verificada", connected: "Estudiantes y docentes, conectados", location: "Bou Saâda, Argelia" },
  ar: { eyebrow: "ثانوية أبي مزراق · بوسعادة", title: "فضاء رقمي يرافق كل يوم دراسي.", body: "مكان موثوق للتعلّم والتعاون والمشاريع والفعاليات، يجمع كل أفراد مجتمعنا المدرسي.", signIn: "تسجيل الدخول", join: "إنشاء حساب", explore: "اكتشف الحرم الرقمي", trusted: "مجتمع مدرسي موثّق", connected: "التلاميذ والأساتذة، معاً", location: "بوسعادة، الجزائر" },
} as const;

const languageLabels: Record<Locale, string> = { en: "EN", fr: "FR", ar: "AR", es: "ES" };

export function PublicPreferences() {
  const [locale, setLocale] = useState<Locale>(() => resolveLocale(localStorage.getItem("abi-locale")));
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem("abi-theme") === "dark" ? "dark" : "light");

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);
    localStorage.setItem("abi-locale", locale);
    window.dispatchEvent(new CustomEvent("abi-locale-change", { detail: locale }));
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("abi-theme", theme);
  }, [theme]);

  return (
    <div className="public-switchers" aria-label="Display preferences">
      <div className="language-switcher" aria-label="Language">
        <Globe2 size={16} aria-hidden="true" />
        {Object.entries(languageLabels).map(([value, label]) => (
          <button key={value} type="button" className={locale === value ? "active" : ""} aria-pressed={locale === value} onClick={() => setLocale(value as Locale)}>{label}</button>
        ))}
      </div>
      <button type="button" className="theme-switcher" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </div>
  );
}

export function PublicBrand() {
  return createElement(
    "a",
    { href: "/", className: "public-brand", "aria-label": "Lycée Abi Mizrak home" },
    <span className="public-brand-mark" aria-hidden="true" />,
    <span><strong>Lycée Abi Mizrak</strong><small>Bou Saâda · Digital Campus</small></span>,
  );
}

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>(() => resolveLocale(localStorage.getItem("abi-locale")));
  useEffect(() => {
    const listener = (event: Event) => setLocale((event as CustomEvent<Locale>).detail);
    window.addEventListener("abi-locale-change", listener);
    return () => window.removeEventListener("abi-locale-change", listener);
  }, []);
  const text = copy[locale];

  return (
    <main className="public-page landing-page">
      <div className="motion-orb orb-one" /><div className="motion-orb orb-two" /><div className="motion-streak" />
      <header className="public-header">
        <PublicBrand />
        <nav className="public-actions" aria-label="Public navigation">
          <PublicPreferences />
          {createElement("a", { href: "/sign-in", className: "public-sign-in" }, text.signIn)}
        </nav>
      </header>
      <section className="hero-shell">
        <div className="hero-copy">
          <div className="hero-eyebrow"><Sparkles size={15} />{text.eyebrow}</div>
          <h1>{text.title}</h1>
          <p className="hero-lede">{text.body}</p>
          <div className="hero-ctas">
            {createElement("a", { href: "/sign-up", className: "primary-cta" }, text.join, <ArrowRight key="arrow" size={18} />)}
            {createElement("a", { href: "/sign-in", className: "secondary-cta" }, text.explore)}
          </div>
          <div className="hero-proof"><span><ShieldCheck size={17} />{text.trusted}</span><span><UsersRound size={17} />{text.connected}</span></div>
        </div>
        <div className="hero-visual" aria-label="Abi Mizrak digital campus preview">
          <div className="preview-glow" />
          <div className="preview-card main-preview">
            <div className="preview-top"><span className="preview-logo" aria-hidden="true" /><span><small>WELCOME TO</small><strong>Abi Mizrak Campus</strong></span><span className="live-pill"><i /> LIVE</span></div>
            <div className="preview-grid"><div className="preview-feature green"><strong>Learning spaces</strong><small>Classes, resources, progress</small></div><div className="preview-feature gold"><strong>Projects</strong><small>Ideas built together</small></div></div>
            <div className="preview-community"><div className="avatar-stack"><span>A</span><span>M</span><span>S</span></div><p><strong>School community</strong><small>{text.location}</small></p><ArrowRight size={18} /></div>
          </div>
          <div className="floating-card floating-one"><ShieldCheck size={20} /><span><strong>Private &amp; verified</strong><small>School-first access</small></span></div>
          <div className="floating-card floating-two"><UsersRound size={20} /><span><strong>Always connected</strong><small>One shared campus</small></span></div>
        </div>
      </section>
      <footer className="public-footer"><span>© Lycée Abi Mizrak El-Mezrani</span><span>{text.location}</span></footer>
    </main>
  );
}
