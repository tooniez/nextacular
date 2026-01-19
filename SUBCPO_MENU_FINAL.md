# SUBCPO_MENU_FINAL.md

Menu SubCPO “finale” (tenant-scoped) implementato con:
- definizione menu: `src/config/menu/index.js`
- gating coerente (UI): `src/lib/authz/menu.js` (filtraggio ricorsivo su `requiredPermission*`)
- rendering: `src/components/Sidebar/menu.js` (supporta gruppi annidati)

## Struttura menu (gruppi → voci → path)

### 1) Dashboard
- **Dashboard** → `/account/[workspaceSlug]/dashboard`

### 2) Operazioni
- **Stazioni** → `/account/[workspaceSlug]/stations`
- **Ricariche** → `/account/[workspaceSlug]/sessions`
- **Tariffe** → `/account/[workspaceSlug]/tariffs`
- **Andamento** → `/account/[workspaceSlug]/dashboard/revenue`

### 3) Finanza
- **Pagamenti** → `/account/[workspaceSlug]/payouts`

### 4) Impostazioni
- **Generali** → `/account/[workspaceSlug]/settings/general`
- **Team** → `/account/[workspaceSlug]/settings/team`
- **Dominio** → `/account/[workspaceSlug]/settings/domain`

### 5) App Conducente
- **App Conducente** → `/driver/map`

Regola rispettata: **1 voce = 1 destinazione univoca**, nessun duplicato di path con label diverse.

## Regole visibilità (permission model attuale)

Le permission sono quelle esistenti in `src/lib/authz/permissions.js` e vengono calcolate da `TeamRole` in `permissionsForWorkspaceRole(teamRole)`.

| Voce | requiredPermission | Note |
|---|---|---|
| Dashboard | `DASHBOARD_VIEW` | visibile per chi ha visibilità dashboard |
| Stazioni | `STATIONS_VIEW` | edit è demandato alle API (EDIT/DELETE) |
| Ricariche | `SESSIONS_VIEW` | |
| Tariffe | `SETTINGS_EDIT` | scelta conservativa: solo ADMIN/OWNER (e SA) |
| Andamento | `DASHBOARD_VIEW` | |
| Pagamenti | `PAYOUTS_VIEW` | azioni (issue/mark-paid/cancel) demandate alle API (FINANCE+) |
| Generali | `SETTINGS_VIEW` | salvataggi demandati alle API (EDIT/OWNER in UI) |
| Team | `USERS_MANAGE` | corrisponde a gestione utenti/team |
| Dominio | `SETTINGS_EDIT` | scelta conservativa: dominio è sensibile |
| App Conducente | nessun gating | visibile a utenti piattaforma autenticati |

## Note “IA” / scelte progettuali

- Il menu è **tenant-scoped**: tutte le route SubCPO sono sotto `/account/[workspaceSlug]/...`.
- Il gating UI è **unico punto**: `src/lib/authz/menu.js` filtra ricorsivamente (gruppi e voci).
- “Tariffe” e “Dominio” sono protette in modo più stretto (richiedono `SETTINGS_EDIT`) per ridurre superficie di rischio.
- “App Conducente” è sempre presente (anche nel menu “statico” quando non è selezionato un workspace) per garantire accesso rapido all’area driver.

