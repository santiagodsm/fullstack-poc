# CLAUDE.md — Asparagus Operations Management POC

Project context and conventions for Claude Code sessions.

---

## What This Project Is

A fullstack proof-of-concept for managing asparagus supply chain operations. The domain
is real (farmers, clients, invoices, commissions) and is used as a concrete vehicle to
explore two architectural ideas:

1. **Fullstack separation** — React frontend talks only to a Node/Express backend; no
   Google or OpenAI keys ever touch the browser.

2. **Google services as a data lake** — Google Drive as the raw document store, Google
   Sheets as the structured data layer, and GPT-4o-mini as the ETL/extraction pipeline.
   The full plan for advancing this into a proper lake architecture with a client-side
   query engine is in [`LAKE_ARCHITECTURE_PLAN.md`](./LAKE_ARCHITECTURE_PLAN.md).

---

## Running the Project

Two processes must run simultaneously:

```bash
# Terminal 1 — Express backend (port 4000)
cd api && node index.js

# Terminal 2 — React frontend (port 3000)
npm start
```

The React dev server proxies all `/api` and relative path calls to `localhost:4000`
(configured via `"proxy": "http://localhost:4000"` in root `package.json`).

---

## Environment Variables

### `api/.env` (backend)
```env
OPENAI_API_KEY=
MASTER_SPREADSHEET_ID=17g9aiOf0mK63tWyIfevKaen_8K_vZXzn078zKjzhq9E
INVOICE_SPREADSHEET_ID=1U3JF2AfkrQ1R9Q7mqy8xEDI0p0ZK4ba4-JoTWcgiyGQ
MAIN_DRIVE_FOLDER_ID=151IG_Rd4awTrElqgafxjTPXqWr3n-pzX
INVOICE_UPLOADS_FOLDER_ID=1h88VrnN8p_YTRFwj0bR4jP4gze8UmvVZ
PORT=4000
```

### `.env` (frontend root)
```env
REACT_APP_GOOGLE_MAPS_API_KEY=
```

### `api/credentials.json`
Google service account key file — required for Drive and Sheets access. This file is
in `.gitignore` and must never be committed. Obtain from Google Cloud Console under
the service account for this project.

---

## Project Structure

```
fullstack-poc/
├── api/
│   ├── index.js            # Express backend — all endpoints live here
│   ├── credentials.json    # Google service account key (gitignored)
│   ├── uploads/            # Temp file storage for multer (cleared periodically)
│   └── package.json
├── src/
│   ├── App.js              # React Router setup — all routes defined here
│   ├── pages/
│   │   ├── HomePage.js                      # Main nav hub
│   │   ├── MasterDataPage.js                # Master data section hub
│   │   ├── IngresoDataPage.js               # Data entry section hub
│   │   ├── masterdata/
│   │   │   ├── AgricultoresPage.js          # Farmers CRUD
│   │   │   ├── ClientesPage.js
│   │   │   ├── ProductosEsparragoPage.js
│   │   │   ├── ComisionesPage.js
│   │   │   └── CajasPage.js
│   │   └── ingresodata/
│   │       ├── FacturaInicialPage.js        # Invoice upload + AI extract + save
│   │       ├── FacturaFinalPage.js
│   │       └── InventarioPage.js
│   ├── components/
│   │   ├── AddressAutocomplete.js           # Google Places wrapper
│   │   ├── FacturaInicialHeaderForm.js
│   │   ├── FacturaInicialDetailForm.js
│   │   └── *List.js                         # Display tables for each entity
│   ├── hooks/
│   │   ├── useMasterData.js                 # Fetch any sheet by name
│   │   ├── useFacturaInicial.js             # Full invoice workflow state
│   │   ├── useForm.js                       # Generic controlled form state
│   │   └── usePlacesAutocomplete.js
│   ├── services/
│   │   ├── masterDataService.js             # read-sheet calls
│   │   └── facturaService.js                # analyzeInvoice, saveFactura, uploadDocument
│   └── utils/
│       ├── validators.js                    # Phone, email, currency patterns
│       └── numberUtils.js                   # Safe float parsing
├── LAKE_ARCHITECTURE_PLAN.md               # Full plan for lake POC build-out
└── CLAUDE.md                               # This file
```

---

## Architecture

### Request Flow

```
React Component
  → Hook (useForm / useMasterData / useFacturaInicial)
    → Service (masterDataService / facturaService)
      → axios HTTP (proxied to :4000)
        → Express endpoint (api/index.js)
          → Google API (Drive / Sheets) or OpenAI
```

No Google API calls, no API keys, and no credentials ever exist in the frontend code.
All external service calls happen exclusively in `api/index.js`.

### Data Layer

| Sheet / Resource | ID | Contains |
|------------------|----|---------|
| Master Spreadsheet | `MASTER_SPREADSHEET_ID` | Agricultores, Clientes, Producto_Esparrago, Comisiones, Cajas |
| Invoice Spreadsheet | `INVOICE_SPREADSHEET_ID` | HeaderFactura, DetalleFactura |
| Main Drive Folder | `MAIN_DRIVE_FOLDER_ID` | Top-level folder |
| Invoice Uploads Folder | `INVOICE_UPLOADS_FOLDER_ID` | Raw PDF/XML invoice files |

### Key Backend Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/read-sheet` | Read a range or sheet from any spreadsheet |
| POST | `/write-sheet` | Append rows to a sheet |
| POST | `/update-sheet` | Update a specific row by range |
| POST | `/clear-sheet` | Delete a row from a sheet |
| POST | `/write-factura-inicial` | Save invoice header + details in one call |
| POST | `/upload/:folderId` | Upload file to a specific Drive folder |
| GET | `/download/:fileId` | Stream a file from Drive |
| GET | `/list-files/:folderId` | List files in a folder |
| GET | `/list-folders` | List subfolders under main folder |
| POST | `/chat-file` | Send file + prompt to GPT, return structured JSON |
| GET | `/lake-snapshot` | *(planned)* Return HeaderFactura + DetalleFactura + LakeCatalog in one call |

---

## Conventions

### Frontend

- **One hook per workflow** — pages stay thin; hooks own all async logic and state.
  `useFacturaInicial` is the reference example: it manages file selection, analysis,
  editing, and saving as a single unit.

- **Services are thin HTTP wrappers** — no business logic in `services/`. They exist
  only to keep `axios` calls out of hooks.

- **Controlled forms via `useForm`** — all form inputs use `name` attributes and a
  single `handleChange` function. Avoid uncontrolled refs for form state.

- **No business logic in components** — components render and delegate. All
  decisions happen in hooks.

### Backend

- **All endpoints in `api/index.js`** — this is intentional for the POC. When the
  project grows, split into routers, but don't split prematurely.

- **Service account auth only** — all Google API calls use the service account from
  `credentials.json`. No OAuth user flow exists.

- **Multer for file uploads** — uploaded files land in `api/uploads/`. They are
  temporary; the `POST /clear-uploads` endpoint deletes them. Don't write code that
  assumes these files persist.

- **Spreadsheet IDs from env** — never hardcode spreadsheet or folder IDs in
  `api/index.js`. Always read from `process.env`.

### Data

- **Google Sheets rows are plain arrays** — the Sheets API returns `values: [[...], [...]]`.
  The first row is the header. When reading, always treat `values[0]` as column names
  and `values.slice(1)` as data rows.

- **Row deletion uses `deleteDimension`** — not cell clearing. Sheets rows are
  identified by their 0-based index in the sheet, not by any ID column. The
  `POST /clear-sheet` endpoint handles this.

- **Invoice detail rows are linked by `NoFactura`** — there is no foreign key
  constraint. If you delete a header row, the detail rows are orphaned. Handle
  this in application logic.

---

## Current Roadmap

See [`LAKE_ARCHITECTURE_PLAN.md`](./LAKE_ARCHITECTURE_PLAN.md) for the full plan.
Summary of next phases:

| Phase | What | Status |
|-------|------|--------|
| 1 | Drive partitioning, LakeCatalog sheet, lineage, env vars | Planned |
| 2 | Danfo.js query engine (`queryService`, `useLakeData`, `useQuery`) | Planned |
| 3 | Analytics dashboard (KPI cards, Recharts charts, date filter) | Planned |
| 4 | Query Lab (ad-hoc filter/groupby builder, CSV export) | Planned |
| 5 | Catalog Explorer (file browser, lineage view, data quality) | Planned |

When implementing lake phases, the new pages live under `src/pages/analytics/` and the
new hooks/services follow the same naming pattern as existing ones.

---

## Known Limitations (by design for POC)

- No authentication or authorization — demo only
- Google Sheets is not a production database — 10M cell limit, no transactions
- No real-time sync — data is fetched on demand, not pushed
- `FacturaFinalPage` and `InventarioPage` are placeholders
- The query engine for lake phases is `@duckdb/duckdb-wasm` (browser SQL). Do not use
  `danfojs` or `danfojs-node` — they have been replaced. Remove both from `package.json`
  if present.
