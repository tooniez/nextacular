# STRUCTURE_POST_FIX.md

Snapshot generata da analisi statica del codice (Next.js Pages Router) **senza modifiche**.

## Scope A — Struttura post-fix (routing/layout/menu)

### A0) Mappa ad albero (high level)

- `src/pages/`
  - **SUPER ADMIN UI**: `src/pages/admin/**`
  - **SUBCPO UI (tenant)**: `src/pages/account/[workspaceSlug]/**`
  - **Piattaforma “account root”**: `src/pages/account/**` (selezione workspace + alcune pagine shared)
  - **DRIVER UI**: `src/pages/driver/**`
  - **AUTH UI (login unico)**: `src/pages/auth/**`
  - **PUBLIC**: `src/pages/index.js`, `src/pages/contact.js`, `src/pages/info.js`, `src/pages/404.js`, `src/pages/_error.js`
  - **API**: `src/pages/api/**`
- `src/layouts/`
  - `AccountLayout.js` (admin + account)
  - `DriverLayout.js` (driver; opzionale `requireAuth`)
  - `DriverPublicLayout.js` (driver login/register “solo guest”)
  - `AuthLayout.js` (auth area; redirect se già authed)
  - `LandingLayout.js` (landing)
  - `PublicLayout.js` (layout semplice)
- `src/lib/authz/` (principal + redirect + menu + permission model)
- `src/config/menu/index.js` (definizione menu base)
- `src/lib/server/` (middleware server-side usati dalle API: `validateSession`, `verifyWorkspaceRole`, `verifySuperAdmin`, ecc.)
- `prisma/services/**` (servizi DB usati dalle API)

### A1) Routing definitivo (UI)

Nota: **non risulta attivo alcun Next.js middleware** a livello di framework (vedi `.next/server/middleware-manifest.json`: `sortedMiddleware: []`). Le guardie sono implementate soprattutto via **layout** e **API middleware**.

Di seguito elenco delle principali route UI **per area** (derivate dai file in `src/pages/**`).

#### SUPER ADMIN (`/admin/**`)

Layout tipico: `AccountLayout` (es. `src/pages/admin/stations.js`, `src/pages/admin/sessions.js`).

Guard UI tipica: **client-side** via `useSuperAdmin()` (es. redirect a `/account` se non SA).

- `/admin/dashboard` → `src/pages/admin/dashboard.js` (re-export `src/pages/account/index.js`)
- `/admin/organizations` → `src/pages/admin/organizations.js` (re-export)
- `/admin/organizations/new` → `src/pages/admin/organizations/new.js` (re-export)
- `/admin/organizations/[id]` → `src/pages/admin/organizations/[id].js` (re-export)
- `/admin/stations` → `src/pages/admin/stations.js`
- `/admin/stations/new` → `src/pages/admin/stations/new.js`
- `/admin/stations/[id]` → `src/pages/admin/stations/[id]/index.js`
- `/admin/sessions` → `src/pages/admin/sessions.js`
- `/admin/payouts` → `src/pages/admin/payouts.js`
- `/admin/trend` → `src/pages/admin/trend.js`
- `/admin/users` → `src/pages/admin/users.js`
- `/admin/platform/settings` → `src/pages/admin/platform/settings.js`
- `/admin/workspaces` → `src/pages/admin/workspaces/index.js`
- `/admin/workspaces/[id]/settings` → `src/pages/admin/workspaces/[id]/settings.js`
- `/admin/ocpp-messages` → `src/pages/admin/ocpp-messages.js`
- `/admin/ocpp-server-logs` → `src/pages/admin/ocpp-server-logs.js`
- `/admin/error-logs` → `src/pages/admin/error-logs.js`
- `/admin/system-info` → `src/pages/admin/system-info.js`
- `/admin/blocked-ips` → `src/pages/admin/blocked-ips.js`
- `/admin/ops/dashboard` → `src/pages/admin/ops/dashboard.js`
- `/admin/rfid-cards` → `src/pages/admin/rfid-cards.js`
- `/admin/rfid-cards/[id]` → `src/pages/admin/rfid-cards/[id].js`
- `/admin/card-recharges` → `src/pages/admin/card-recharges.js`
- `/admin/card-recharges/new` → `src/pages/admin/card-recharges/new.js`
- `/admin/products` → `src/pages/admin/products.js`

Nota: esistono anche pagine legacy in `src/pages/admin/driver/**` (es. `mappa.js`, `pagamenti.js`, ecc.) che oggi **non sono nel menu**.

#### SUBCPO (`/account/[workspaceSlug]/**`)

Layout: `AccountLayout` (es. `src/pages/account/[workspaceSlug]/dashboard/index.js` usa `{ AccountLayout }`).

Guard UI: `AccountLayout` fa redirect a `/auth/login` se `useSession().status === 'unauthenticated'`. **Non** impone esplicitamente la membership sullo slug a livello UI (il confine tenant è demandato alle API e/o ai servizi).

Route principali:

- `/account/[workspaceSlug]` → `src/pages/account/[workspaceSlug]/index.js`
- `/account/[workspaceSlug]/dashboard` → `src/pages/account/[workspaceSlug]/dashboard/index.js`
- `/account/[workspaceSlug]/dashboard/revenue` → `src/pages/account/[workspaceSlug]/dashboard/revenue.js`
- `/account/[workspaceSlug]/stations` → `src/pages/account/[workspaceSlug]/stations/index.js`
- `/account/[workspaceSlug]/stations/new` → `src/pages/account/[workspaceSlug]/stations/new.js`
- `/account/[workspaceSlug]/stations/[id]` → `src/pages/account/[workspaceSlug]/stations/[id]/index.js`
- `/account/[workspaceSlug]/sessions` → `src/pages/account/[workspaceSlug]/sessions/index.js`
- `/account/[workspaceSlug]/sessions/[id]` → `src/pages/account/[workspaceSlug]/sessions/[id].js`
- `/account/[workspaceSlug]/payouts` → `src/pages/account/[workspaceSlug]/payouts/index.js`
- `/account/[workspaceSlug]/payouts/[id]` → `src/pages/account/[workspaceSlug]/payouts/[id].js`
- `/account/[workspaceSlug]/tariffs` → `src/pages/account/[workspaceSlug]/tariffs/index.js`
- `/account/[workspaceSlug]/tariffs/new` → `src/pages/account/[workspaceSlug]/tariffs/new.js`
- `/account/[workspaceSlug]/tariffs/[id]` → `src/pages/account/[workspaceSlug]/tariffs/[id]/index.js`
- `/account/[workspaceSlug]/settings/general` → `src/pages/account/[workspaceSlug]/settings/general.js`
- `/account/[workspaceSlug]/settings/advanced` → `src/pages/account/[workspaceSlug]/settings/advanced.js`
- `/account/[workspaceSlug]/settings/team` → `src/pages/account/[workspaceSlug]/settings/team.js`
- `/account/[workspaceSlug]/settings/domain` → `src/pages/account/[workspaceSlug]/settings/domain.js`

Anomalia rilevata:

- `/account/[workspaceSlug]/stations/[id]/TariffTab` → `src/pages/account/[workspaceSlug]/stations/[id]/TariffTab.js`
  - Sembra un componente “tab” ma è dentro `pages/`, quindi diventa una route pubblica del router. Va considerata **route attiva**.

#### Piattaforma “Account root” (`/account/**` senza slug)

- `/account` → `src/pages/account/index.js` (per SA effettua redirect client-side a `/admin/dashboard`)
- `/account/settings` → `src/pages/account/settings.js`
- `/account/billing` → `src/pages/account/billing.js`
- `/account/payment` → `src/pages/account/payment.js`
- `/account/organizations` → `src/pages/account/organizations.js`
- `/account/organizations/new` → `src/pages/account/organizations/new.js`
- `/account/organizations/[id]` → `src/pages/account/organizations/[id].js`

#### DRIVER (`/driver/**`)

Layout:
- `DriverLayout` per pagine driver (alcune pubbliche con `requireAuth=false`, altre protette con `requireAuth=true`)
- `DriverPublicLayout` per pagine di login/register driver (redirect a `/driver/map` se già autenticato)

Route (principali):
- `/driver` → `src/pages/driver/index.js`
- `/driver/map` → `src/pages/driver/map.js` (browse mode)
- `/driver/stations` → `src/pages/driver/stations/index.js` (browse mode)
- `/driver/stations/[id]` → `src/pages/driver/stations/[id].js` (browse mode)
- `/driver/charging` → `src/pages/driver/charging.js` (probabilmente richiede auth, dipende dal page component)
- `/driver/sessions` → `src/pages/driver/sessions/index.js`
- `/driver/sessions/[id]` → `src/pages/driver/sessions/[id].js`
- `/driver/activity` → `src/pages/driver/activity.js`
- `/driver/wallet` → `src/pages/driver/wallet.js`
- `/driver/support` → `src/pages/driver/support.js`
- `/driver/profile` → `src/pages/driver/profile/index.js`
- `/driver/profile/settings` → `src/pages/driver/profile/settings.js`
- `/driver/profile/personal` → `src/pages/driver/profile/personal.js`
- `/driver/profile/billing` → `src/pages/driver/profile/billing.js`
- `/driver/profile/consents` → `src/pages/driver/profile/consents.js`
- `/driver/profile/payment-method` → `src/pages/driver/profile/payment-method.js`
- `/driver/profile/favorites` → `src/pages/driver/profile/favorites.js`
- `/driver/login` → `src/pages/driver/login.js`
- `/driver/register` → `src/pages/driver/register.js`
- `/driver/charge/confirm` → `src/pages/driver/charge/confirm.js`
- `/driver/charge/stop` → `src/pages/driver/charge/stop.js`
- `/driver/charge/success` → `src/pages/driver/charge/success.js`

#### AUTH (`/auth/**`)

- `/auth/login` → `src/pages/auth/login.js` (login unico; redirect server-side se già autenticato)

#### PUBLIC / misc

- `/` → `src/pages/index.js` (landing, `LandingLayout`)
- `/contact` → `src/pages/contact.js` (usa `AccountLayout`)
- `/info` → `src/pages/info.js` (usa `AccountLayout`)
- `/404` → `src/pages/404.js`

### A2) Layout e contesti UI (layout → area)

- `AccountLayout` (`src/layouts/AccountLayout.js`)
  - **Aree**: SUPER ADMIN + SUBCPO + (in pratica anche alcune public “info/contact” che sono dentro l’area piattaforma)
  - **Guards**:
    - Redirect a `/auth/login` se `useSession().status === 'unauthenticated'` (eccetto driver session → `/driver/map`)
  - **Context menu**: chiama `useAuthzMe({ workspaceSlug: router.query.workspaceSlug })` e passa `principal` a `Sidebar`
- `DriverLayout` (`src/layouts/DriverLayout.js`)
  - **Aree**: DRIVER
  - **Guard**: se `requireAuth=true` e driver session mancante → redirect a `/auth/login?callbackUrl=...`
- `DriverPublicLayout` (`src/layouts/DriverPublicLayout.js`)
  - **Aree**: DRIVER login/register
  - **Guard**: se driver già autenticato → `/driver/map`
- `AuthLayout` (`src/layouts/AuthLayout.js`)
  - **Area**: AUTH
  - **Guard**: se già autenticato (NextAuth) → `/account`
  - Nota: la pagina `src/pages/auth/login.js` al momento usa un layout inline (non `AuthLayout`)
- `LandingLayout` (`src/layouts/LandingLayout.js`)
  - **Area**: public landing
- `PublicLayout` (`src/layouts/PublicLayout.js`)
  - **Area**: public/simple (non usata in tutte le pagine public; es. `contact/info` usano `AccountLayout`)

### A3) Menu (post-fix)

#### A3.1 Menu: source of truth e generazione

- **Source of truth menu**: `src/lib/authz/menu.js` (`getMenuForPrincipal()`)
  - Per **Super Admin**: forza `workspaceSlug=null` (menu stabile in `/admin/**`)
  - Aggiunge opzionalmente un gruppo “Vista organizzazione” solo se lo slug è esplicito nel route context
- **Base menu builder**: `src/config/menu/index.js`

#### A3.2 Menu SUPER ADMIN (definitivo)

Derivato da `src/config/menu/index.js` con `isSuperAdmin=true` e `workspaceSlug=null` (come fa `getMenuForPrincipal`).

- Dashboard → `/admin/dashboard`
- Organizzazioni → `/admin/organizations`
- Stazioni di Ricarica → `/admin/stations`
- Ricariche Veicoli → `/admin/sessions`
- Andamento → `/admin/trend`
- Pagamenti → `/admin/payouts`
- Utenti → `/admin/users`
- RFID (gruppo)
  - Carte RFID → `/admin/rfid-cards`
  - Ricariche carte → `/admin/card-recharges`
- Amministrazione (gruppo)
  - Monitoraggio (sottogruppo)
    - Messaggi OCPP → `/admin/ocpp-messages`
    - Log server OCPP → `/admin/ocpp-server-logs`
    - Log errori → `/admin/error-logs`
    - System info → `/admin/system-info`
    - IP bloccati → `/admin/blocked-ips`
    - Ops dashboard → `/admin/ops/dashboard`
  - Piattaforma (sottogruppo)
    - Impostazioni piattaforma → `/admin/platform/settings`
    - Workspaces → `/admin/workspaces`
    - Prodotti → `/admin/products`
- App Conducente → `/driver/map`
- Scrivici → `/contact`
- Info → `/info`

Verifica duplicati (statico):
- Nella definizione attuale in `src/config/menu/index.js` non risultano voci duplicate con stesso `path`.

#### A3.3 Menu SUBCPO (mappatura)

Menu “minimale” quando `!isSuperAdmin && workspaceSlug` (vedi `src/config/menu/index.js`):

- Dashboard → `/account/[workspaceSlug]/dashboard`
- Stazioni di Ricarica → `/account/[workspaceSlug]/stations`
- Ricariche Veicoli → `/account/[workspaceSlug]/sessions`
- Andamento → `/account/[workspaceSlug]/dashboard/revenue`
- Pagamenti → `/account/[workspaceSlug]/payouts`
- Impostazioni → `/account/[workspaceSlug]/settings/general`

Filtro per permessi applicato in `src/lib/authz/menu.js`:
- “Pagamenti” mostrato solo se `Permission.PAYOUTS_VIEW`
- “Impostazioni” mostrato solo se `Permission.SETTINGS_VIEW`
- “Utenti” mostrato solo se `Permission.USERS_MANAGE` (nota: non è nel menu minimale, quindi oggi il filtro è “ready” ma la voce non appare comunque)

### A4) Cosa è cambiato rispetto a prima (deducibile)

- **Namespace Super Admin stabilizzato** in `/admin/**` (post-login redirect in `src/lib/authz/redirects.js` verso `/admin/dashboard`).
- **Menu Super Admin** reso “non tenant” per default: `src/lib/authz/menu.js` ignora lo slug implicito e genera link `/admin/**`.
- **Decisione Super Admin unificata** lato UI: `useSuperAdmin()` usa `/api/authz/me` (principal unificato), evitando fonti multiple.

