# DRIVER_SSO_AND_UPLOAD.md

## Obiettivo

Consentire a un utente SubCPO (NextAuth / platform) di usare anche l’area `/driver/**` **senza seconda login** e di poter effettuare **upload** dall’area driver in modo sicuro e isolato per utente.

## 1) SSO (NextAuth → Driver) — come funziona

### Componenti

- **Driver session**: cookie `driver_session` (httpOnly) gestito da `src/lib/server/driver-session.js`
- **SSO bridge**: `src/lib/server/require-driver.js`
- **Driver identity endpoint**: `GET /api/driver/me` (`src/pages/api/driver/me.js`)

### Flusso

1) Il client driver chiama `GET /api/driver/me`.
2) L’API usa `requireDriver(req,res)`:
   - Se esiste `driver_session` → usa quello.
   - Se non esiste:
     - prova `getServerSession(req,res,authOptions)` (NextAuth)
     - se la sessione platform è valida:
       - trova o crea un record `EndUser` con la stessa email
       - emette un cookie `driver_session` (via `setDriverSessionCookie`)
       - ritorna `endUser` al client.

Risultato: un SubCPO autenticato con NextAuth entra in `/driver/**` senza re‑autenticazione e ottiene una sessione driver persistente per l’app driver.

## 2) Menu: “App Conducente”

- Nel menu SubCPO e nel menu statico (quando non è selezionato workspace) è presente:
  - **App Conducente** → `/driver/map`

File:
- `src/config/menu/index.js` (SubCPO)
- `src/config/menu/sidebar-static.js` (static)

## 3) Upload “come driver”

### Endpoint

Creato endpoint:
- `GET /api/driver/uploads` → lista file caricati per l’utente corrente
- `POST /api/driver/uploads` → upload file (data URL base64)

Handler:
- `src/pages/api/driver/uploads/index.js`

Autenticazione:
- Usa `requireDriver(req,res)` → quindi accetta **driver_session** oppure **NextAuth** (SSO).

Sicurezza / validazioni

- **Mime whitelist**: PNG/JPG/WEBP/PDF
- **Size limit**:
  - `bodyParser.sizeLimit = 10mb` (Next.js)
  - hard cap server-side: **8MB** (dopo decode base64)
- **Isolamento tenant**:
  - path storage per utente: `public/uploads/driver/<endUserId>/...`
  - `GET` lista solo la propria directory
  - `POST` scrive solo nella propria directory
- **Filename safety**: sanitizzazione nome file + suffix random + timestamp.

Storage

- filesystem locale sotto `public/uploads/driver/<endUserId>/`
- URL pubblica: `/uploads/driver/<endUserId>/<filename>`

### UI

UI minima aggiunta in:
- `src/pages/driver/profile/settings.js`

Funzionalità:
- input file (PNG/JPG/WEBP/PDF)
- upload via `POST /api/driver/uploads` (dataUrl)
- tabella lista file (da `GET /api/driver/uploads`) con link “Apri”

