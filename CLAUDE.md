# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `crm-front/`.

```
npm run dev        # Vite dev server on :5173
npm run build       # tsc -b && vite build
npm run lint         # eslint .
npm run preview      # preview the production build
```

There is no test runner configured (no Jest/Vitest/RTL, no test script) — this project currently has zero automated frontend tests. Don't assume a `npm test` command exists.

## Architecture

```
src/
  pages/          One file per route (Login, Dashboard, Deals, SalesFunnel, TicketFunnel, Companies,
                   Contacts, Tickets, Stages, UserSettings). Each page owns its own data fetching and
                   state — there's no global state manager (no Redux/Zustand), just useState + Context.
  components/     Shared, reusable components (flat, not grouped by feature): Layout, Modal, ConfirmModal,
                   Input, Textarea, DataTablePage (generic table+pagination+toolbar shell used by most
                   list pages), GenericCombobox and its CompanyCombobox/ContactCombobox/StageCombobox
                   specializations, DealModal, ColorPicker, ThemeSelector, LanguageSelector.
  contexts/       AuthContext (session state, backed by GET /api/auth/me — see below), LanguageContext.
  services/       api.ts is the single axios instance (baseURL http://localhost:8080/api,
                   withCredentials: true so the httpOnly auth cookie is sent). Domain-specific services
                   (parameterService, ticketService, ticketStageService) wrap it for specific endpoints;
                   most pages just call `api.get/post/delete` directly instead of going through a service.
  hooks/          useHealthCheck (backend online/offline indicator in the topbar), useFocusFirstInput,
                   useTranslation.
  locales/        pt-BR.json (default), en-US.json, es-ES.json. Hand-rolled i18n (no react-i18next) —
                   useTranslation() does a dotted-path lookup + {param} interpolation. Missing keys log a
                   console.warn and render the raw key.
  utils/          dateUtils/numberUtils (locale-aware formatting), themePreferences (light/dark, persisted
                   to localStorage, applied before React mounts in main.tsx to avoid a flash), 
                   animationPreferences (user-configurable animation toggle, see below).
```

## Auth state

The backend issues an httpOnly session cookie — the frontend never stores a token (not in `localStorage`, not in memory as a readable string). `AuthContext` calls `GET /api/auth/me` once on mount to determine whether a session exists and populate the user object; `ProtectedRoute` in `App.tsx` renders nothing until that check resolves (`isLoading`), then redirects to `/login` if unauthenticated. `signOut()` calls `POST /api/auth/logout` before clearing local state. When adding a new authenticated API call, you don't need to attach anything — `withCredentials: true` on the shared `api` instance handles it.

## Design system

Everything routes through CSS custom properties defined once in `src/index.css` under `:root` (light) and `:root[data-theme='dark']` (dark) — colors, spacing radii, shadows. `main.tsx` applies the stored theme preference (`utils/themePreferences.ts`) before the first render. There is no Tailwind/MUI/component library: styling is plain CSS, split between:
- `src/index.css` — design tokens + global utility classes shared across pages (`.btn-primary`, `.card`, `.data-table`, `.modal-*`, `.form-*`, `.funnel-*`, `.selector-*`, `.combobox-*`, etc.). These are relied on from many pages via plain `className="btn-primary"` strings, not CSS Modules.
- `src/animations.css` — all `@keyframes` plus a couple of motion utility classes. Also defines `.animations-disabled` (toggled on `<body>` by `utils/animationPreferences.ts` from a user setting stored as a backend `Parameter`) and a `prefers-reduced-motion` block.
- Per-component/page `*.module.css` — CSS Modules for anything not part of the shared vocabulary above.

When touching shared visual behavior, check both `index.css` (global classes) and the relevant `*.module.css` — component-local CSS Modules can define a same-named local class (e.g. `DataTablePage.module.css`'s `.pageHeader`) that silently shadows a global one of the same name; they don't inherit from each other.

Mobile layout: the sidebar in `Layout.tsx`/`Layout.module.css` collapses into a slide-in drawer below 880px width (see the `sidebarOpen` state and the `@media (max-width: 880px)` block at the bottom of `Layout.module.css`).
