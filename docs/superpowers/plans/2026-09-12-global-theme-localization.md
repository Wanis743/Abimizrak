# Global Theme and Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver persistent light and dark themes plus complete English, Arabic, French, and Spanish application localization with polished motion and correct Arabic RTL behavior across the Abi Mizrak campus website.

**Architecture:** A typed localization provider owns locale selection, document language/direction, interpolation, and localized formatting, while the existing `next-themes` package owns appearance persistence and root theme classes. Shared switcher controls live in the application shell, semantic CSS tokens remove light-only styling, and feature dictionaries localize application-owned copy without translating user or server content.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS, next-themes, Radix UI, Vitest-compatible project test tooling.

**Spec:** `docs/superpowers/specs/2026-09-12-global-theme-localization-design.md`

## Global Constraints

- Supported locales are exactly `en`, `ar`, `fr`, and `es`; English is the fallback.
- Arabic uses `rtl`; English, French, and Spanish use `ltr`.
- Application-owned copy is translated; user-generated and server-provided content stays unchanged.
- Appearance modes are exactly `light` and `dark`.
- Preferences are browser-local and must not require a Supabase migration.
- Use Inter Variable for Latin locales and Noto Sans Arabic Variable for Arabic, bundled locally.
- Frequent interaction motion stays within roughly 160 to 320 milliseconds and honors `prefers-reduced-motion`.
- Preserve existing authentication, authorization, API, and route behavior.
- Leave implementation changes uncommitted unless the user explicitly requests commits.

---

### Task 1: Establish typed locale primitives and dictionary parity

**Files:**
- Create: `artifacts/abi-mizrak-campus/src/i18n/types.ts`
- Create: `artifacts/abi-mizrak-campus/src/i18n/config.ts`
- Create: `artifacts/abi-mizrak-campus/src/i18n/messages/en.ts`
- Create: `artifacts/abi-mizrak-campus/src/i18n/messages/ar.ts`
- Create: `artifacts/abi-mizrak-campus/src/i18n/messages/fr.ts`
- Create: `artifacts/abi-mizrak-campus/src/i18n/messages/es.ts`
- Create: `artifacts/abi-mizrak-campus/src/i18n/index.ts`
- Test: `artifacts/abi-mizrak-campus/src/i18n/i18n.test.ts`
- Modify: `artifacts/abi-mizrak-campus/package.json`

**Interfaces:**
- Produces: `Locale = "en" | "ar" | "fr" | "es"`, `Direction = "ltr" | "rtl"`, `isLocale(value: unknown): value is Locale`, `resolveLocale(value: unknown): Locale`, `getDirection(locale: Locale): Direction`, `MessageKey`, and `messages`.
- Consumes: no application-specific interfaces.

- [ ] **Step 1: Add the project test command and write failing locale tests**

Add a `test` script using the repository's available Vitest runner, then test exact locale acceptance, English fallback, Arabic direction, LTR direction for the other three locales, interpolation, and equal dictionary key sets.

```ts
expect(resolveLocale("ar")).toBe("ar");
expect(resolveLocale("invalid")).toBe("en");
expect(getDirection("ar")).toBe("rtl");
expect(getDirection("fr")).toBe("ltr");
expect(Object.keys(messages.ar).sort()).toEqual(Object.keys(messages.en).sort());
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/i18n/i18n.test.ts`
Expected: FAIL because the locale modules do not exist.

- [ ] **Step 3: Implement locale types, guards, fallback, direction, interpolation, and initial dictionaries**

Use the English dictionary as the typed canonical shape and declare every other dictionary with `satisfies Record<MessageKey, string>`. Include global controls, language names, theme names, shell navigation, search, notification, loading, empty, error, and common action keys needed by subsequent tasks.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/i18n/i18n.test.ts`
Expected: PASS with all locale and dictionary parity assertions.

### Task 2: Build persistent localization and appearance providers

**Files:**
- Create: `artifacts/abi-mizrak-campus/src/i18n/I18nProvider.tsx`
- Create: `artifacts/abi-mizrak-campus/src/i18n/storage.ts`
- Create: `artifacts/abi-mizrak-campus/src/providers/AppProviders.tsx`
- Create: `artifacts/abi-mizrak-campus/src/providers/providers.test.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/main.tsx`

**Interfaces:**
- Consumes: `Locale`, `resolveLocale`, `getDirection`, `messages`, and `MessageKey` from Task 1.
- Produces: `I18nProvider`, `useI18n(): { locale; direction; setLocale; t; formatDate; formatNumber }`, `AppProviders`, `LOCALE_STORAGE_KEY`, and safe storage helpers.

- [ ] **Step 1: Write failing provider tests**

Cover persisted locale initialization, invalid-value fallback, storage exceptions, `lang` and `dir` updates, interpolation, localized date/number formatting, and theme wrapper configuration.

```tsx
render(<I18nProvider><Probe /></I18nProvider>);
await user.click(screen.getByRole("button", { name: "set Arabic" }));
expect(document.documentElement).toHaveAttribute("lang", "ar");
expect(document.documentElement).toHaveAttribute("dir", "rtl");
expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("ar");
```

- [ ] **Step 2: Run the provider tests and verify they fail**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/providers/providers.test.tsx`
Expected: FAIL because the providers and hooks do not exist.

- [ ] **Step 3: Implement the providers and wire them at the React root**

Configure `ThemeProvider` with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`, `enableColorScheme`, and the existing transition-flash safeguard. Initialize locale from guarded storage, update root `lang`, `dir`, and `data-locale` synchronously within a layout effect, and catch storage failures.

- [ ] **Step 4: Run provider and locale tests**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/providers/providers.test.tsx src/i18n/i18n.test.ts`
Expected: PASS.

### Task 3: Add locally bundled multilingual typography and semantic themes

**Files:**
- Modify: `artifacts/abi-mizrak-campus/package.json`
- Modify: `artifacts/abi-mizrak-campus/src/main.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/index.css`
- Test: `artifacts/abi-mizrak-campus/src/styles/theme.test.ts`

**Interfaces:**
- Consumes: root `.light`, `.dark`, `[lang="ar"]`, and `[dir="rtl"]` attributes from Task 2.
- Produces: complete semantic CSS variables and locale-aware font variables used by all later UI work.

- [ ] **Step 1: Write failing theme contract tests**

Read `index.css` as text and assert that explicit light and dark blocks define the required surface, text, border, focus, input, overlay, status, and shadow tokens, Arabic selects the Arabic font variable, and reduced-motion rules exist.

- [ ] **Step 2: Run the theme test and verify it fails**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/styles/theme.test.ts`
Expected: FAIL because the full token and typography contracts are absent.

- [ ] **Step 3: Bundle Inter Variable and Noto Sans Arabic Variable**

Add the appropriate local font packages to the workspace package and import their variable CSS from `main.tsx`. Do not introduce Google Fonts or another runtime font request.

- [ ] **Step 4: Implement explicit light and dark token sets and motion foundations**

Replace the `prefers-color-scheme`-only behavior with root-class-driven tokens. Add global transitions limited to color-bearing and surface properties, locale-content entry animation, direction-safe text defaults, Arabic line-height/letter-spacing, bidirectional isolation helpers, custom focus rings, scrollbars, and reduced-motion overrides.

- [ ] **Step 5: Run theme tests and a production build**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/styles/theme.test.ts && pnpm --filter @workspace/abi-mizrak-campus build`
Expected: PASS; the build emits `dist/public/index.html`.

### Task 4: Create accessible animated appearance and language controls

**Files:**
- Create: `artifacts/abi-mizrak-campus/src/components/preferences/AppearanceToggle.tsx`
- Create: `artifacts/abi-mizrak-campus/src/components/preferences/LanguageMenu.tsx`
- Create: `artifacts/abi-mizrak-campus/src/components/preferences/PreferenceControls.tsx`
- Test: `artifacts/abi-mizrak-campus/src/components/preferences/PreferenceControls.test.tsx`

**Interfaces:**
- Consumes: `useTheme()` and `useI18n()` from Tasks 1 and 2.
- Produces: `PreferenceControls({ compact?: boolean })`, shared by desktop and mobile layouts.

- [ ] **Step 1: Write failing interaction and accessibility tests**

Test keyboard activation, accessible names, active states, light/dark changes, all four locale selections, menu closure after selection, and translated control labels.

- [ ] **Step 2: Run the focused component test and verify it fails**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/components/preferences/PreferenceControls.test.tsx`
Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the controls with existing Radix primitives**

Use a two-state animated sun/moon button and a language menu listing native language names. Add clear focus states, `aria-pressed` or checked menu semantics, compact mobile rendering, icon rotation/scale, menu fade/scale, and no dependency on advanced animation APIs.

- [ ] **Step 4: Run the component and provider tests**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/components/preferences/PreferenceControls.test.tsx src/providers/providers.test.tsx`
Expected: PASS.

### Task 5: Integrate preferences and translated copy into the application shell

**Files:**
- Modify: `artifacts/abi-mizrak-campus/src/components/layout/LiquidCampusLayout.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/components/layout/ServerSidebar.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/components/layout/ChannelSidebar.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/App.tsx`
- Test: `artifacts/abi-mizrak-campus/src/components/layout/LiquidCampusLayout.test.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/i18n/messages/en.ts`
- Modify: `artifacts/abi-mizrak-campus/src/i18n/messages/ar.ts`
- Modify: `artifacts/abi-mizrak-campus/src/i18n/messages/fr.ts`
- Modify: `artifacts/abi-mizrak-campus/src/i18n/messages/es.ts`

**Interfaces:**
- Consumes: `PreferenceControls`, `useI18n`, semantic theme tokens, and existing routing/auth APIs.
- Produces: a globally reachable switcher and localized application shell on every authenticated route.

- [ ] **Step 1: Write failing shell tests**

Render representative shell states and assert translated navigation, search, notification, command palette, empty/error/loading copy, desktop controls, mobile controls, and RTL-aligned overlays.

- [ ] **Step 2: Run the focused shell test and verify it fails**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/components/layout/LiquidCampusLayout.test.tsx`
Expected: FAIL because shell copy and controls are not localized.

- [ ] **Step 3: Integrate controls and convert shell strings to typed keys**

Move navigation labels and command actions from hard-coded strings to translation keys. Render preference controls in the shared desktop header and mobile navigation. Replace physical left/right utility assumptions with logical or direction-conditional classes for drawers, notification panels, badges, and search results.

- [ ] **Step 4: Replace shell hard-coded theme colors**

Use semantic variables for overlays, notification backgrounds, active indicators, borders, and text. Mirror only directional icons under RTL.

- [ ] **Step 5: Run shell, preference, provider, and locale tests**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/components/layout/LiquidCampusLayout.test.tsx src/components/preferences/PreferenceControls.test.tsx src/providers/providers.test.tsx src/i18n/i18n.test.ts`
Expected: PASS.

### Task 6: Localize authentication, shared components, and public states

**Files:**
- Modify: `artifacts/abi-mizrak-campus/src/App.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/shared.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/not-found.tsx`
- Modify: relevant authentication/onboarding components discovered through `rg --files artifacts/abi-mizrak-campus/src`
- Test: `artifacts/abi-mizrak-campus/src/pages/public-localization.test.tsx`
- Modify: all four files under `artifacts/abi-mizrak-campus/src/i18n/messages/`

**Interfaces:**
- Consumes: `useI18n`, `t`, localized formatters, preference controls, and theme tokens.
- Produces: localized unauthenticated, shared, error, and not-found experiences.

- [ ] **Step 1: Inventory exact authentication and shared copy**

Run: `rg -n '"[^"]*[A-Za-z][^"]*"|>[^<{]*[A-Za-z][^<{]*<' artifacts/abi-mizrak-campus/src/App.tsx artifacts/abi-mizrak-campus/src/pages/shared.tsx artifacts/abi-mizrak-campus/src/pages/not-found.tsx`
Expected: a finite list of application-owned strings; exclude routes, class names, API paths, identifiers, and server content.

- [ ] **Step 2: Write failing representative localization tests**

Test English and at least one non-English locale for authentication actions, shared empty/error states, and not-found navigation, plus Arabic RTL at the document root.

- [ ] **Step 3: Run the focused test and verify it fails**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/pages/public-localization.test.tsx`
Expected: FAIL on untranslated English strings.

- [ ] **Step 4: Add typed dictionary keys and replace the inventoried strings**

Use interpolation for dynamic application values, localized formatters for application-generated dates/numbers, and preserve data returned from users or APIs verbatim.

- [ ] **Step 5: Run the public localization and dictionary parity tests**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/pages/public-localization.test.tsx src/i18n/i18n.test.ts`
Expected: PASS.

### Task 7: Localize core student and campus routes

**Files:**
- Modify: `artifacts/abi-mizrak-campus/src/pages/campus-home.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/activity.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/academic.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/events.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/portfolio.tsx`
- Test: `artifacts/abi-mizrak-campus/src/pages/core-localization.test.tsx`
- Modify: all four message dictionaries.

**Interfaces:**
- Consumes: `useI18n`, translation keys, localized formatters, direction, and theme tokens.
- Produces: localized dashboard, activity, academic, event, and portfolio routes.

- [ ] **Step 1: Inventory application-owned strings in the five routes**

Use `rg` to list text nodes, placeholders, labels, status descriptions, and toast content. Classify API/user content separately so it remains untranslated.

- [ ] **Step 2: Write failing route-level localization tests**

Assert representative headings, calls to action, empty states, filters, and formatted dates in French, Spanish, and Arabic.

- [ ] **Step 3: Run the focused test and verify it fails**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/pages/core-localization.test.tsx`
Expected: FAIL on hard-coded English copy.

- [ ] **Step 4: Add complete dictionary entries and replace the inventored copy**

Keep keys feature-scoped, avoid concatenated sentences, and use interpolation for counts and names. Replace light-only colors encountered in these files with semantic tokens.

- [ ] **Step 5: Run route and dictionary tests**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/pages/core-localization.test.tsx src/i18n/i18n.test.ts`
Expected: PASS.

### Task 8: Localize spaces, projects, and talent workflows

**Files:**
- Modify: `artifacts/abi-mizrak-campus/src/pages/spaces-directory.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/space-detail.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/projects-directory.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/project-detail.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/talent-graph.tsx`
- Modify: relevant channel/chat components under `artifacts/abi-mizrak-campus/src/components/`
- Test: `artifacts/abi-mizrak-campus/src/pages/collaboration-localization.test.tsx`
- Modify: all four message dictionaries.

**Interfaces:**
- Consumes: the localization and theme systems from prior tasks.
- Produces: localized collaboration directories, detail views, forms, chat chrome, and talent discovery.

- [ ] **Step 1: Inventory strings and hard-coded light colors**

Run `rg` across the listed files for visible text and `bg-white`, `text-[#`, `border-[#`, `left-`, `right-`, `text-left`, and `text-right`. Exclude user messages, names, project titles, and server data.

- [ ] **Step 2: Write failing workflow tests**

Cover directory filters, creation actions, detail tabs, chat controls, empty states, and Arabic direction-safe controls.

- [ ] **Step 3: Run the focused test and verify it fails**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/pages/collaboration-localization.test.tsx`
Expected: FAIL on untranslated or direction-unsafe UI.

- [ ] **Step 4: Translate the workflows and remove light-only/direction-fixed styling**

Add feature dictionaries, semantic colors, logical alignment, and bidirectional isolation for identifiers. Preserve API payloads and user-generated content exactly.

- [ ] **Step 5: Run workflow and dictionary tests**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/pages/collaboration-localization.test.tsx src/i18n/i18n.test.ts`
Expected: PASS.

### Task 9: Localize identity and administrator workflows

**Files:**
- Modify: `artifacts/abi-mizrak-campus/src/pages/identity.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/admin-center.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/admin-verification.tsx`
- Modify: relevant administration/facilities/settings components discovered under `artifacts/abi-mizrak-campus/src/components/`
- Test: `artifacts/abi-mizrak-campus/src/pages/admin-localization.test.tsx`
- Modify: all four message dictionaries.

**Interfaces:**
- Consumes: prior localization, formatting, RTL, switcher, and theme interfaces.
- Produces: translated identity, verification, facilities, settings, and administration UI without changing authorization.

- [ ] **Step 1: Inventory role-sensitive interface copy**

List headings, tabs, table headers, filters, dialogs, form labels, validation, audit labels, and actions. Keep database values, audit payloads, identities, and role codes untouched unless an existing UI mapping labels them.

- [ ] **Step 2: Write failing administrator localization tests**

Test representative role views, forms, tables, confirmation dialogs, validation text, and RTL alignment while mocking the existing authorization state.

- [ ] **Step 3: Run the focused test and verify it fails**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/pages/admin-localization.test.tsx`
Expected: FAIL on hard-coded English UI.

- [ ] **Step 4: Translate all inventoried application copy**

Add complete typed keys, use localized formatting for application-generated values, apply semantic tokens, and leave all Supabase/RLS and API behavior unchanged.

- [ ] **Step 5: Run administrator and dictionary tests**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/pages/admin-localization.test.tsx src/i18n/i18n.test.ts`
Expected: PASS.

### Task 10: Complete static coverage audits and direction-safe styling

**Files:**
- Modify: any remaining application source identified by the audits under `artifacts/abi-mizrak-campus/src/`
- Create: `artifacts/abi-mizrak-campus/src/i18n/coverage.test.ts`
- Modify: all four message dictionaries.

**Interfaces:**
- Consumes: every localization and theming interface created earlier.
- Produces: repository-wide evidence that application-owned copy, light-only styling, and critical physical-direction assumptions have been addressed.

- [ ] **Step 1: Write a failing dictionary and critical-string coverage test**

Assert dictionary parity and scan designated application files for an explicit denylist of migrated English phrases and light-only theme patterns. Keep the denylist precise so routes, code identifiers, API paths, and data field names do not create false positives.

- [ ] **Step 2: Run the coverage test and collect remaining failures**

Run: `pnpm --filter @workspace/abi-mizrak-campus test -- src/i18n/coverage.test.ts`
Expected: FAIL with exact remaining source locations.

- [ ] **Step 3: Replace remaining application-owned strings and theme violations**

For each reported location, either translate/tokenize it or document in the test allowlist why it is user data, a protocol value, route, API field, brand value, or other non-translatable source. Replace physical direction utilities that break Arabic with logical or conditional equivalents.

- [ ] **Step 4: Run the full automated test suite**

Run: `pnpm --filter @workspace/abi-mizrak-campus test`
Expected: PASS with dictionary parity and coverage assertions.

### Task 11: Verify production build and representative runtime behavior

**Files:**
- Modify: only files required to resolve failures found by verification.
- Evidence: existing project test output and generated Vite bundle under `artifacts/abi-mizrak-campus/dist/public/`.

**Interfaces:**
- Consumes: the completed implementation.
- Produces: final evidence for tests, type safety, production bundling, persistence, RTL, accessibility, theming, and motion behavior.

- [ ] **Step 1: Run static and production verification**

Run: `pnpm --filter @workspace/abi-mizrak-campus test && pnpm --filter @workspace/abi-mizrak-campus exec tsc --noEmit && pnpm --filter @workspace/abi-mizrak-campus build`
Expected: all commands exit 0 and `artifacts/abi-mizrak-campus/dist/public/index.html` exists.

- [ ] **Step 2: Run repository diff checks**

Run: `git diff --check && git status --short && git diff --stat`
Expected: no whitespace errors; generated public/dist files are not accidentally staged or modified as source.

- [ ] **Step 3: Start the application and inspect representative routes**

Inspect at least one public/auth state and authenticated student, teacher, and administrator route at desktop and mobile widths. For each, switch light/dark and `en/ar/fr/es`; verify no reload, persistence after refresh, Arabic RTL, readable fonts, no clipped controls, localized shell/page copy, intact interactions, and no console errors.

- [ ] **Step 4: Verify accessibility and reduced motion**

Operate both switchers by keyboard, verify visible focus and accessible names, emulate reduced motion, confirm decorative movement is removed, and spot-check text/background contrast in both themes.

- [ ] **Step 5: Report evidence without committing implementation**

Summarize exact PASS/FAIL results, remaining limitations, modified files, and untracked pre-existing generated artifacts. Do not claim complete site-wide translation or production readiness unless every required check has evidence.
