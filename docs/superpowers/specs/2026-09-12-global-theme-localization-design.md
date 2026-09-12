# Global Theme and Localization Design

## Goal

Add a production-quality appearance and localization system across the Abi Mizrak campus website. Users can switch smoothly between light and dark themes and between English, Arabic, French, and Spanish without reloading the application.

## Scope

- Light and dark themes across every application route and shared component.
- English, Arabic, French, and Spanish for application-owned interface text.
- Complete right-to-left layout behavior for Arabic.
- Persistent user preferences with flash-free startup.
- Accessible, polished controls in desktop and mobile navigation.
- Coordinated transitions that respect reduced-motion preferences.
- Theme-safe replacement of hard-coded colors in application pages and layouts.

User-generated content, database records, names, uploaded documents, and server-provided notification bodies remain in their original language.

## Architecture

### Appearance provider

Use the existing `next-themes` dependency through a single application-level provider. The provider exposes explicit `light` and `dark` modes, persists the choice in local storage, updates the root theme class and browser color scheme, and disables unwanted transition flashes during initialization. A small pre-render initialization path ensures the saved theme is applied before the visible application renders.

### Localization provider

Introduce a typed, dependency-light localization module with:

- `en`, `ar`, `fr`, and `es` locale identifiers.
- English as the canonical dictionary and fallback.
- Locale dictionaries with matching typed keys.
- A `useI18n` hook exposing the current locale, locale setter, direction, formatter locale, and translation function.
- Safe interpolation for dynamic application values.
- Persistent locale selection in local storage.

The provider updates `document.documentElement.lang` and `document.documentElement.dir` immediately. Arabic uses `rtl`; English, French, and Spanish use `ltr`. Date, time, and number formatting use the active browser locale through `Intl`.

## Translation Coverage

All application-owned strings will move behind typed translation keys, including:

- Authentication and onboarding.
- Global navigation, sidebars, headers, menus, and route labels.
- Search, command palette, notifications, and activity controls.
- Dashboard headings, descriptions, metrics, empty states, and actions.
- Academic, people, spaces, projects, events, facilities, administration, identity, and settings pages.
- Forms, placeholders, validation text, dialogs, confirmations, loading states, and recoverable error messages.
- Shared UI labels, accessibility names, tooltips, and status text.

Translation keys will be grouped by feature to keep dictionaries maintainable. English remains the fallback if a localized value is absent, and development tests detect missing or extra keys.

## Typography

Use Inter Variable for English, French, and Spanish because it remains highly legible in dense dashboards, controls, tables, and display headings. Use Noto Sans Arabic Variable for Arabic because it provides broad Arabic glyph coverage, clear UI proportions, and compatible weight behavior. System sans-serif fonts remain the final fallback.

Font variables are applied at the document level so the entire interface, including portals and dialogs, changes consistently with the locale. Arabic receives language-aware line height and letter-spacing rules, while existing monospace content keeps the configured monospace stack. Fonts must be self-hosted or bundled through project dependencies so rendering does not depend on a third-party runtime request.

## Theme System

Expand the current CSS token set into explicit light and dark palettes covering:

- Page and elevated surface backgrounds.
- Liquid surfaces and panels.
- Text, muted text, borders, and focus rings.
- Primary, accent, success, warning, and destructive states.
- Inputs, menus, dialogs, tooltips, charts, shadows, overlays, and scrollbars.

Existing hard-coded white, slate, and hex colors in application pages and layout components will be replaced with semantic variables when they affect theme rendering. Brand colors may remain fixed only where contrast is valid in both themes.

## Switching Experience and Motion

Add a compact appearance control and language menu to the shared desktop header and mobile navigation. The active state is visually clear and announced to assistive technology. Controls remain keyboard accessible and close correctly after a selection.

Theme changes use coordinated transitions for background color, foreground color, borders, shadows, overlays, and icons. Language changes animate shared content with a short opacity and vertical movement sequence while updating direction atomically to avoid mixed-direction frames. Menus use subtle scale and fade motion, and switch icons use rotation and spring-like transforms.

Motion is intentionally polished rather than slow: frequent interactions remain within roughly 160 to 320 milliseconds. Under `prefers-reduced-motion: reduce`, decorative transforms and staged transitions are disabled or reduced to near-instant fades.

## RTL Behavior

Arabic switches the complete application shell to RTL. Implementation favors CSS logical properties and direction-aware utilities instead of duplicating layouts. Navigation, drawers, menus, forms, tables, breadcrumbs, notification panels, and command palette alignment follow the active direction. Directional icons are mirrored only when they communicate direction; universal icons are unchanged.

Mixed content such as email addresses, URLs, codes, timestamps, and identifiers receives explicit bidirectional isolation where necessary. User-generated text is not forcibly translated or reversed.

## Data Flow and Persistence

1. Before visible render, saved appearance and locale preferences are read safely.
2. The root theme class, `lang`, and `dir` attributes are applied.
3. Providers initialize React state from the same values.
4. A user selection updates state and the document immediately.
5. The valid selection is persisted for future visits.
6. Invalid or unavailable stored values fall back to English and a safe theme default without breaking startup.

No account schema or Supabase migration is required for this phase. Preferences are browser-local, which keeps the change independent of authentication state.

## Error Handling

- Storage access failures are caught and treated as non-fatal.
- Unknown locale values fall back to English.
- Missing translation keys fall back to the English value and are detected by tests.
- Font loading preserves readable fallback fonts and does not block application use.
- Switching remains usable if advanced browser animation APIs are unavailable.

## Testing and Verification

- Unit tests for valid locale detection, fallback behavior, translation interpolation, persistence, and document attribute updates.
- Component tests for appearance and language controls, keyboard behavior, accessible labels, and active states.
- RTL assertions for Arabic and LTR assertions for the other locales.
- Dictionary parity tests ensuring all four languages contain the complete key set.
- Theme checks for root classes and semantic color-token coverage.
- Production type-check and Vite build.
- Targeted visual/runtime checks on representative public, student, teacher, and administrator routes at desktop and mobile widths.
- Reduced-motion verification and basic contrast checks in both themes.

## Acceptance Criteria

- Every route exposes the same persistent theme and language choices.
- Light and dark themes render readable, coherent surfaces without hard-coded light-only blocks.
- English, Arabic, French, and Spanish cover all application-owned visible interface strings.
- Arabic changes the complete interface direction to RTL without broken navigation or clipped controls.
- Switching requires no reload, avoids startup flashes, and feels smooth on desktop and mobile.
- The selected settings survive a refresh.
- Keyboard and screen-reader users can identify and operate both controls.
- Reduced-motion users do not receive excessive animation.
- Type-checking, automated tests, and the production build pass before completion is claimed.

## Non-Goals

- Automatic translation of user-generated or database content.
- Machine translation at runtime.
- Account-synchronized preferences across devices.
- Adding languages beyond English, Arabic, French, and Spanish in this phase.
- Unrelated redesigns of application workflows or backend authorization.
