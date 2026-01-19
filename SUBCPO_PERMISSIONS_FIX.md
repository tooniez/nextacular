# SUBCPO_PERMISSIONS_FIX.md

Changelog “phase 2” per rendere l’area SubCPO production‑grade:
- chiusura buchi cross‑tenant (members/domains)
- finance gating payouts coerente
- admin surface resa SuperAdmin‑only
- tenant boundary UI (UX guard)
- rimozione route accidentale `TariffTab` da `pages/`

## Fix applicati (con file)

### 1) Cross‑tenant leak: MEMBERS (HIGH) — CHIUSO

**Prima (bug)**: `GET /api/workspace/[workspaceSlug]/members` usava solo `validateSession` e filtrava per `workspace.slug` → SubCPO A poteva leggere membri di workspace B conoscendo lo slug.

**Dopo (fix)**:
- `src/pages/api/workspace/[workspaceSlug]/members.js`
  - aggiunto `verifyWorkspaceRole(..., PERMISSIONS.ADMIN)` (solo ADMIN/OWNER/SUPER_ADMIN)
  - handler ora ritorna **403 JSON** (non 500 HTML) su accesso non autorizzato
- `prisma/services/membership.js`
  - aggiunto `getMembersByWorkspaceId(workspaceId)` per filtrare per `workspaceId`

Rischio mitigato: **horizontal privilege escalation** via slug.

### 2) Cross‑tenant leak: DOMAINS (GET) (HIGH) — CHIUSO

**Prima (bug)**: `GET /api/workspace/[workspaceSlug]/domains` usava solo `validateSession` e filtrava per `workspace.slug`.

**Dopo (fix)**:
- `src/pages/api/workspace/[workspaceSlug]/domains.js`
  - aggiunto `verifyWorkspaceRole(..., PERMISSIONS.ADMIN)`
  - filtraggio su `workspaceId` via service
  - handler ritorna **403 JSON** su accesso non autorizzato
- `prisma/services/domain.js`
  - aggiunto `getDomainsByWorkspaceId(workspaceId)`

### 3) Dominio CRUD: limitare CREATE/DELETE/VERIFY (HIGH/MED) — CHIUSO

**Prima**: `POST/PUT/DELETE /api/workspace/[workspaceSlug]/domain` basato su session + membership nei servizi, senza gate di ruolo.

**Dopo**:
- `src/pages/api/workspace/[workspaceSlug]/domain.js`
  - aggiunto `verifyWorkspaceRole(..., PERMISSIONS.ADMIN)` su POST/PUT/DELETE
  - gestione errori: 401/403/500 con JSON consistente

### 4) Payouts: finance gating rotto (HIGH) — CHIUSO

**Prima (bug)**: diversi endpoint usavano `PERMISSIONS.FINANCE` che non esisteva in `require-workspace-role.js` → check potenzialmente sempre vero.

**Dopo (fix)**:
- `src/lib/server/require-workspace-role.js`
  - aggiunto `PERMISSIONS.FINANCE = ['FINANCE','ADMIN','OWNER','SUPER_ADMIN']`
  - aggiunto `SUPER_ADMIN` a `ROLE_HIERARCHY` e a tutte le `PERMISSIONS.*` principali
- Endpoint payouts ora restituiscono status corretti (403 per authz):
  - `src/pages/api/payouts/index.js`
  - `src/pages/api/payouts/preview.js`
  - `src/pages/api/payouts/[id]/issue.js`
  - `src/pages/api/payouts/[id]/mark-paid.js`
  - `src/pages/api/payouts/[id]/cancel.js`

### 5) Admin surface: restringere a Super Admin (HIGH) — CHIUSO

**Prima (bug/policy mismatch)**: vari endpoint in namespace `/api/admin/**` usavano `verifyOrganizationsPermission`, che consentiva anche OWNER/ADMIN di un workspace → accesso a dati globali.

**Dopo (fix)**: sostituito con `verifySuperAdmin` nei punti principali:
- `src/pages/api/admin/workspaces/index.js`
- `src/pages/api/admin/workspaces/[id].js`
- `src/pages/api/admin/workspaces/[id]/members.js`
- `src/pages/api/admin/workspaces/[id]/invite-member.js`
- `src/pages/api/admin/workspaces/[id]/update-member.js`
- `src/pages/api/admin/workspaces/[id]/competenze.js`
- Inoltre, la vista globale “organizations” è ora SA‑only:
  - `src/pages/api/account/organizations.js`

### 6) Tenant boundary UI (UX guard) — AGGIUNTO

**Prima**: un SubCPO poteva navigare a `/account/ALTRO_SLUG/...` e vedere pagina/layout (poi magari 403 dalle API).

**Dopo**:
- `src/layouts/AccountLayout.js`
  - se `workspaceSlug` in URL e `principal.workspaces` non contiene lo slug (e non SA) → toast “Workspace non autorizzato” + redirect a `/account`.

### 7) Route accidentale `TariffTab` (HIGH UX/Surface) — RIMOSSA

**Prima**: `src/pages/account/[workspaceSlug]/stations/[id]/TariffTab.js` era una route Next attiva “non voluta”.

**Dopo**:
- spostato componente in `src/components/account/TariffTab.js`
- aggiornato import in `src/pages/account/[workspaceSlug]/stations/[id]/index.js`
- eliminato il file sotto `pages/` (route non esiste più → 404)

## Checklist test manuali (min 12)

Eseguire questi test in browser (e/o con curl) prima di chiudere:

1) **Members cross-tenant**: login SubCPO (`subcpo@demo.local`) → `GET /api/workspace/est-workspace/members` deve dare **403**.
2) **Domains cross-tenant**: login SubCPO → `GET /api/workspace/est-workspace/domains` deve dare **403**.
3) **Domains list authorized**: login SubCPO OWNER su `demo-cpo` → `GET /api/workspace/demo-cpo/domains` deve dare **200**.
4) **Domains CRUD unauthorized**: login SubCPO ruolo basso (READONLY) → `POST /api/workspace/demo-cpo/domain` deve dare **403**.
5) **Payouts preview (READONLY)**: login `readonly@demo.local` → `POST /api/payouts/preview?workspaceSlug=demo-cpo` deve dare **403**.
6) **Payouts preview (OWNER/FINANCE)**: login SubCPO OWNER → deve dare **200** (se periodo valido / dati presenti).
7) **Payout issue/mark-paid/cancel (READONLY)**: chiamate devono dare **403**.
8) **Admin workspaces list**: login SubCPO → `GET /api/admin/workspaces` deve dare **403**.
9) **Organizations global**: login SubCPO → `GET /api/account/organizations` deve dare **403**.
10) **Tenant boundary UI**: login SubCPO → apri `/account/est-workspace/dashboard` → deve redirect a `/account` con toast.
11) **Route accidentale rimossa**: apri `/account/demo-cpo/stations/ANY/TariffTab` → deve dare **404**.
12) **Regressione menu**: login SubCPO READONLY → nel menu non devono comparire `Tariffe`, `Team`, `Dominio`; login OWNER → devono comparire.

