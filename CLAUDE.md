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

## Reports (PDF)

`pages/Reports.tsx` (route `/reports`, nav icon `FileText`) — a single page covering all 5 report types (Empresas, Contatos por Empresa, Tickets por Contato e Empresa, Negócios por Empresa, Agenda do Dia) via a type selector plus a filter form that swaps fields per type, reusing `CompanyCombobox`/`ContactCombobox`/`StageCombobox` and native `<input type="date">`/`<select>` (same as everywhere else — no date-picker or select library). No dedicated `reportService.ts` — the page calls `api` directly like most pages do.

"Gerar PDF" calls `api.get('/reports/<type>', { params, responseType: 'blob' })`, builds an object URL, and opens it in a preview `Modal` (`contentClassName` — `Modal.tsx` grew this optional prop specifically so this one modal could be wider/taller than the default 500px) instead of downloading immediately. Only on the actual download/print action does it touch the filesystem:
- **Desktop** (or any browser reporting `navigator.pdfViewerEnabled === true`): an `<iframe src={blobUrl}>` renders the PDF inline, with "Imprimir" (`iframe.contentWindow.print()`) and "Baixar" (`<a download>`) buttons.
- **Mobile fallback (gotcha)**: most mobile browsers have no PDF viewer registered for `<iframe>` content — instead of the PDF, the user sees raw bytes as text with the browser's own generic "open" fallback. `supportsInlinePdf()` in `Reports.tsx` detects this *before* rendering the iframe (via `navigator.pdfViewerEnabled` where available — Chrome/Edge/Firefox — otherwise a mobile-UA regex fallback for Safari/older browsers) and swaps in a `previewUnavailable` message with "Abrir em nova aba" (`window.open(blobUrl)`) and "Baixar" buttons instead. Don't try to reactively detect a broken render (no reliable error event fires for "wrong content type") — the proactive check is the only thing that works here.

`pages/Reports.module.css` holds the page-local layout (filter grid, type-selector row, `.previewModal`/`.previewFrame`/`.previewUnavailable`).

## Tasks / checklists

`services/taskService.ts` wraps `/api/tasks`. Consumption points:

- **`components/TaskWidget.tsx`** — embedded directly in the detail pane of Deals, Contacts, Companies, and Tickets (see the `<TaskWidget entityType="..." entityId={id} />` block near the end of each page's `detailPane`/`RecordPane` children). Shows that record's tasks with a small progress ring, quick-add input, and an expandable checklist per task. Reuses global classes (`card`, `btn-secondary`) plus its own `TaskWidget.module.css`.
- **`pages/MyDay.tsx`** (route `/my-day`, nav icon `CheckSquare`) — **Kanban-only**, no list view: a 3-column board (`PENDING`/`IN_PROGRESS`/`DONE`, i.e. A fazer/Fazendo/Concluído) using the same native HTML5 drag-and-drop as `TicketsKanbanView.tsx` (no DnD library), reusing `Funnel.module.css`. There's deliberately no `ViewToggle`/list mode and no inline quick-add form on this page — task creation happens exclusively through the global capture flow below (`components/QuickAddTask.tsx`) or the per-entity `TaskWidget`. `utils/taskDueBucket.ts` still drives the overdue/today color-coding on each card.
- **`utils/taskEvents.ts`** — a tiny `window.dispatchEvent`/`addEventListener` pub-sub (`emitTaskChanged`/`subscribeTaskChanged`). Tasks can be created or change status from several disconnected places at once (`QuickAddTask`, `TaskWidget`, `NotificationBell`) with no shared state/context between them — each calls `emitTaskChanged()` after a successful mutation, and `MyDay.tsx` subscribes to refetch its board. Without this, e.g. creating a task from the global quick-add bar while looking at the Kanban wouldn't show the new card until a manual reload.

**Fase 2 (implemented)**: `services/notificationService.ts` wraps `/api/notifications`. `components/NotificationBell.tsx` sits in `Layout.tsx`'s topbar next to the search button — polls `unread-count` every 30s (same `isCheckingRef`-guarded interval pattern as `useHealthCheck`), and when the count increases, fires a browser `Notification` (only if permission was already granted; the dropdown shows an inline "enable" banner otherwise, since permission can only be requested from a user gesture). Each item in the dropdown resolves the underlying task directly (`Concluir`/`Adiar 1 dia`, reusing `taskService`) rather than just marking the notification read. The opt-out preference (`taskNotifyOverdue`) needs no bespoke settings UI — it's a global `Parameter` seeded server-side (see `crm-api/CLAUDE.md`) and shows up automatically in the existing generic "preferences" screen (`pages/UserPreferences.tsx`), labeled via `settings.taskNotifyOverdue` in the locale files.

**Fase 3 (implemented)**:
- **`utils/naturalLanguageDate.ts`** — parses relative dates/times out of free text per locale (pt-BR/en-US/es-ES: "hoje"/"amanhã"/weekday names/"em X dias" plus "15h30"/"15:30"/"3pm"), stripping the matched phrase from the returned title. Locale comes from `useLanguage()` (`LanguageContext`), so the parser switches automatically with the user's language — not hardcoded to Portuguese.
- **`utils/entityMentionSearch.ts`** — fires the same 4 `/search` endpoints `CommandPalette.tsx` already uses (deals/contacts/companies/tickets) to resolve `@mention` candidates.
- **`components/QuickAddTask.tsx`** — single-line capture bar (visually modeled on `CommandPalette.tsx`: `createPortal` + `modal-overlay`), opened via the global `T` keyboard shortcut (ignored while typing in any input/textarea, wired in `Layout.tsx`) or the floating action button (`quickAddStyles.fab`, rendered fixed bottom-right in `Layout.tsx` — this is the *only* way to create an unlinked/global task from the UI now, `MyDay.tsx` has no form of its own). Live-previews the parsed due date as a chip; typing `@query` shows a dropdown of matching Deal/Contact/Company/Ticket records to link (only one entity per task, matching the backend's single `entityType`/`entityId`).

## Design system

Everything routes through CSS custom properties defined once in `src/index.css` under `:root` (light) and `:root[data-theme='dark']` (dark) — colors, spacing radii, shadows. `main.tsx` applies the stored theme preference (`utils/themePreferences.ts`) before the first render. There is no Tailwind/MUI/component library: styling is plain CSS, split between:
- `src/index.css` — design tokens + global utility classes shared across pages (`.btn-primary`, `.card`, `.data-table`, `.modal-*`, `.form-*`, `.funnel-*`, `.selector-*`, `.combobox-*`, etc.). These are relied on from many pages via plain `className="btn-primary"` strings, not CSS Modules.
- `src/animations.css` — all `@keyframes` plus a couple of motion utility classes. Also defines `.animations-disabled` (toggled on `<body>` by `utils/animationPreferences.ts` from a user setting stored as a backend `Parameter`) and a `prefers-reduced-motion` block.
- Per-component/page `*.module.css` — CSS Modules for anything not part of the shared vocabulary above.

When touching shared visual behavior, check both `index.css` (global classes) and the relevant `*.module.css` — component-local CSS Modules can define a same-named local class (e.g. `DataTablePage.module.css`'s `.pageHeader`) that silently shadows a global one of the same name; they don't inherit from each other.

Mobile layout: the sidebar in `Layout.tsx`/`Layout.module.css` collapses into a slide-in drawer below 880px width (see the `sidebarOpen` state and the `@media (max-width: 880px)` block at the bottom of `Layout.module.css`).
