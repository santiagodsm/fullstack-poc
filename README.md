# Asparagus Operations Management — POC

> **Proof of Concept** — A prototype for managing asparagus supply chain operations and
> demonstrating that a full data lake architecture — raw storage, AI-powered ETL,
> structured serving, and browser-side analytics — can be built entirely on free Google
> services with no dedicated database or data warehouse.

---

## What This POC Proves

### 1. Clean full-stack separation

React UI never touches an API key, a credential, or a Google service directly.
All side effects live in the Express backend. The frontend is a pure consumer of
REST endpoints.

### 2. LLM as an ETL pipeline

An unstructured document (PDF or XML invoice) can be turned into structured,
validated JSON using GPT-4o-mini. The flow is:

```
upload PDF/XML → send to GPT with client/product context → get structured JSON
→ human reviews and corrects → save to Google Sheets
```

The LLM does the heavy extraction; a human provides the quality gate before data
lands in the lake.

### 3. Google Drive + Sheets as a data lake

You can build a real lake architecture on free infrastructure:

| Real Lake Concept | This POC |
|---|---|
| Raw / Landing Zone | Google Drive (date-partitioned folders) |
| ETL / Transform | GPT-4o-mini (PDF/XML → JSON) |
| Curated / Serving Zone | Google Sheets (HeaderFactura, DetalleFactura) |
| Data Catalog | LakeCatalog sheet + Catalog Explorer UI |
| Data Lineage | DriveFileId column linking Drive file → Sheets row |
| Query Engine | DuckDB WASM running SQL inside the browser |
| Analytics Layer | React dashboard + ad-hoc Query Lab |

### 4. Browser as the query engine

DuckDB WASM runs SQL in the browser tab. After a single `/lake-snapshot` HTTP
call loads the data, all filtering, aggregation, and joins happen locally — no
database server, no query API, no cost per query.

### 5. Real domain, real workflow

The architecture is tested against an actual asparagus supply chain (farmers,
clients, invoices, commissions). Not a toy.

---

## How It Works — End to End

### Full system diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            BROWSER (React)                               │
│                                                                          │
│  ┌───────────────┐  ┌───────────────────┐  ┌────────────────────────┐   │
│  │  Master Data  │  │   Data Entry      │  │   Data Lake            │   │
│  │               │  │                   │  │                        │   │
│  │  Agricultores │  │  Upload PDF/XML   │  │  Analytics Dashboard   │   │
│  │  Clientes     │  │  → GPT analyzes   │  │  Query Lab             │   │
│  │  Productos    │  │  → Human reviews  │  │  Catalog Explorer      │   │
│  │  Comisiones   │  │  → Save to Sheets │  │                        │   │
│  │  Cajas        │  │                   │  │  ┌──────────────────┐  │   │
│  └───────┬───────┘  └────────┬──────────┘  │  │  DuckDB WASM     │  │   │
│          │                   │             │  │  (in-browser SQL) │  │   │
│          │         hooks / services layer  │  └────────┬─────────┘  │   │
│          │                   │             │           │            │   │
│  ════════╪═══════════════════╪═════════════╪═══════════╪════════════╪═  │
│          │   axios HTTP      │             │    axios GET           │   │
└──────────┼───────────────────┼─────────────┼────────────────────────┼───┘
           │                   │             │                        │
           ▼                   ▼             ▼                        │
┌──────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS BACKEND (:4000)                          │
│                                                                          │
│  /read-sheet      /write-sheet     /update-sheet    /clear-sheet         │
│  /write-factura-inicial            /upload/:folderId                     │
│  /download/:fileId  /list-files    /chat-file                            │
│  /lake-snapshot  ← returns all lake data in one call                    │
└──────────┬───────────────────────────────────────┬───────────────────────┘
           │                                       │
┌──────────▼─────────────┐           ┌─────────────▼──────────────────────┐
│     GOOGLE DRIVE        │           │          GOOGLE SHEETS              │
│     (Raw Zone)          │           │          (Processed Zone)           │
│                         │           │                                     │
│  /invoices/             │           │  Master Spreadsheet:                │
│    2026/                │           │  • Agricultores                     │
│      01/ ← partition    │──lineage─▶│  • Clientes                        │
│        inv-001.pdf      │           │  • Producto_Esparrago               │
│        inv-002.xml      │           │  • Comisiones, Cajas                │
│      03/                │           │  • LakeCatalog (file metadata)      │
│        inv-003.pdf      │           │                                     │
│                         │           │  Invoice Spreadsheet:               │
│  Immutable after upload │           │  • HeaderFactura + DriveFileId      │
│                         │           │  • DetalleFactura                   │
└─────────────────────────┘           └─────────────────────────────────────┘
```

---

### Request flow — data entry

```
FacturaInicialPage
  → useFacturaInicial (hook — owns all async state)
    → facturaService (thin HTTP wrapper)
      → POST /upload/:folderId     — sends PDF/XML to Drive, logs to LakeCatalog
      → POST /chat-file            — sends file + context to GPT, returns JSON
      → POST /write-factura-inicial— saves header + detail rows to Sheets
                                     updates LakeCatalog status: raw → processed
```

### Request flow — analytics

```
AnalyticsDashboard / QueryLab / CatalogExplorer
  → useLakeData (hook)
    → GET /lake-snapshot           — one call: HeaderFactura + DetalleFactura + LakeCatalog
    → queryService.initDB()        — boots DuckDB WASM in browser (jsDelivr CDN)
    → queryService.registerTable() — loads each dataset as in-memory DuckDB table
    → CREATE VIEW joined AS ...    — joins header + detail by NoFactura

  → useQuery(db) (hook)
    → queryService.buildSQL(def)   — builds SQL from structured filter/groupby/metric def
    → db.connect().query(sql)      — runs SQL inside DuckDB WASM, returns typed rows
    → results render in charts / tables

  (all filtering and aggregation happens in the browser — zero additional backend calls)
```

---

### Lake data lifecycle

```
                  INGEST           TRANSFORM         SERVE           ANALYZE
                ──────────────────────────────────────────────────────────────
                     │                │                │                │
  User uploads    PDF/XML          GPT-4o-mini      Sheets           DuckDB WASM
  an invoice   ──────────▶        extracts    ──────▶ stores  ──────▶ queries in
  via browser     Drive             JSON               rows            browser
                     │                │                │                │
                     ▼                ▼                ▼                ▼
               LakeCatalog       validated         HeaderFactura    Dashboard
               row: status=raw   structured        DetalleFactura   Query Lab
                                 invoice data      LakeCatalog      CSV Export
                                                   status=processed
```

---

### Column-name sanitization

Google Sheets column headers often contain spaces and punctuation (`No. Factura`,
`Costo Aduanal`). Before registering a table in DuckDB, every column name is
sanitized so all SQL identifiers are safe:

```
"No. Factura"    →  "No_Factura"
"Costo Aduanal"  →  "Costo_Aduanal"
"Total Final"    →  "Total_Final"
```

Rule: replace runs of whitespace or `.` with `_`, strip remaining non-alphanumeric chars.

---

### Why `UNFORMATTED_VALUE` matters

The `/lake-snapshot` endpoint fetches Sheets data with `valueRenderOption: 'UNFORMATTED_VALUE'`.
Without this, the Sheets API returns numeric cells as their formatted display strings
(e.g. `$1,234.56`). DuckDB would then infer the column as `VARCHAR`, and
`SUM("Total")` would fail silently — every KPI would show `—`. Unformatted values
return raw numbers and DuckDB correctly infers `DOUBLE`.

---

## Features

### Master Data (CRUD)

| Entity | Fields |
|--------|--------|
| Agricultores (Farmers) | Clave, Nombre, Zona, Email, Teléfono, Dirección (Google Places), Orden |
| Clientes (Clients) | Clave, Nombre, Zona, Email, Teléfono, Dirección |
| Producto Esparrago | Código, Descripción, Precio base |
| Comisiones | Agricultor, Porcentaje |
| Cajas | Tipo, Capacidad |

All reads and writes go through `GET /read-sheet` / `POST /write-sheet` /
`POST /update-sheet` / `POST /clear-sheet` on the backend.

### Data Entry

- **Factura Inicial** — upload PDF or XML invoice → GPT extracts header + line items →
  user reviews and edits → save to `HeaderFactura` + `DetalleFactura` sheets +
  upload to Drive + log to `LakeCatalog`
- **Factura Final** — placeholder for processing final settlement invoices
- **Inventario** — placeholder for inventory entry

### Data Lake

- **Analytics Dashboard** — KPI cards (total revenue, invoice count, active clients,
  unique products), revenue by week (line chart), revenue by client (bar chart),
  product volume breakdown (pie chart), global week/client filter
- **Query Lab** — ad-hoc query builder: pick dataset, add group-by columns, metrics
  with aggregation (SUM/COUNT/AVG/MIN/MAX), filters with operators, order and limit;
  results table with CSV export
- **Catalog Explorer** — file browser (Drive files with status and partition path),
  lineage view (Drive file → HeaderFactura row → DetalleFactura rows), data quality
  panel (unprocessed files, missing fields, mismatched totals)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router, Axios |
| Charts | Recharts (LineChart, BarChart, PieChart) |
| Query Engine | DuckDB WASM (in-browser SQL) |
| Address Autocomplete | Google Maps Places API |
| Backend | Node.js, Express, Multer |
| Raw Storage | Google Drive (date-partitioned) |
| Structured Storage | Google Sheets (2 spreadsheets) |
| AI Extraction | OpenAI GPT-4o-mini |
| Auth | Google Service Account (credentials.json) |

---

## Project Structure

```
├── api/
│   ├── index.js              # All Express endpoints (Drive, Sheets, OpenAI)
│   ├── credentials.json      # Google service account key (gitignored)
│   └── uploads/              # Temp file buffer for multer
├── src/
│   ├── App.js                # All React Router routes
│   ├── pages/
│   │   ├── HomePage.js
│   │   ├── MasterDataPage.js
│   │   ├── IngresoDataPage.js
│   │   ├── LakePage.js
│   │   ├── masterdata/       # Agricultores, Clientes, Productos, Comisiones, Cajas
│   │   ├── ingresodata/      # FacturaInicialPage, FacturaFinalPage, InventarioPage
│   │   └── analytics/        # AnalyticsDashboard, QueryLab, CatalogExplorer
│   ├── hooks/
│   │   ├── useMasterData.js  # Fetch any Sheets tab by name
│   │   ├── useFacturaInicial.js  # Full invoice workflow state machine
│   │   ├── useLakeData.js    # Boot DuckDB, fetch /lake-snapshot, register tables
│   │   └── useQuery.js       # Run SQL against a DuckDB instance
│   ├── services/
│   │   ├── masterDataService.js  # /read-sheet calls
│   │   ├── facturaService.js     # analyzeInvoice, saveFactura, uploadDocument
│   │   └── queryService.js       # initDB, registerTable, query, buildSQL, exportCSV
│   └── utils/
│       ├── validators.js     # Phone, email, currency patterns
│       └── numberUtils.js    # Safe float parsing
└── public/
```

### One hook per workflow

Pages are thin. All async logic and state live in hooks. `useFacturaInicial` is the
reference: it manages file selection, GPT analysis, form editing, and saving as one
cohesive unit. Pages just render and delegate.

### Services are thin HTTP wrappers

No business logic in `services/`. They exist only to keep `axios` calls out of hooks.

---

## Setup

### 1. Install dependencies

```bash
npm install
cd api && npm install
```

### 2. Environment variables

```env
# .env (frontend root)
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

```env
# api/.env (backend)
OPENAI_API_KEY=
MASTER_SPREADSHEET_ID=
INVOICE_SPREADSHEET_ID=
LAKE_SPREADSHEET_ID=
MAIN_DRIVE_FOLDER_ID=
INVOICE_UPLOADS_FOLDER_ID=
PORT=4000
```

### 3. Google credentials

Place `api/credentials.json` (Google service account key) for Drive and Sheets access.
Obtain from Google Cloud Console. Never commit this file.

### 4. Run

```bash
# Terminal 1 — Express backend (port 4000)
cd api && node index.js

# Terminal 2 — React app (port 3000)
npm start
```

The React dev server proxies all relative-path API calls to `:4000`
via `"proxy": "http://localhost:4000"` in `package.json`.

---

## Data Layer

| Spreadsheet | Sheet | Contains |
|-------------|-------|---------|
| Master | Agricultores | Farmer reference data |
| Master | Clientes | Client reference data |
| Master | Producto_Esparrago | Product codes and prices |
| Master | Comisiones | Commission rates by farmer |
| Master | Cajas | Box types |
| Master | LakeCatalog | One row per Drive file (metadata + lineage + status) |
| Invoice | HeaderFactura | One row per invoice (15 fields + DriveFileId) |
| Invoice | DetalleFactura | One row per line item, joined by NoFactura |

### Drive structure

```
/Main Drive Folder/
  /Invoice Uploads/
    2026/
      01/
        inv-001.pdf      ← FileId stored in LakeCatalog + HeaderFactura
        inv-002.xml
      03/
        inv-003.pdf
```

Files are immutable after upload. Partitioned by `YYYY/MM`.

### Lineage

```
Drive file (FileId)
  ↓  stored in
LakeCatalog row  →  status: raw → processed
  ↓  same FileId stored in
HeaderFactura row (DriveFileId column)
  ↓  joined by NoFactura
DetalleFactura rows
```

---

## Key Backend Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/read-sheet` | Read any sheet range |
| POST | `/write-sheet` | Append rows |
| POST | `/update-sheet` | Update a row by range |
| POST | `/clear-sheet` | Delete a row |
| POST | `/write-factura-inicial` | Save invoice header + details atomically |
| POST | `/upload/:folderId` | Upload file to Drive, log to LakeCatalog |
| GET | `/download/:fileId` | Stream a Drive file |
| POST | `/chat-file` | Send file + prompt to GPT, return JSON |
| GET | `/lake-snapshot` | All lake data (header + detail + catalog) in one call |

---

## Cost Model

| Service | Usage | Monthly Cost |
|---------|-------|-------------|
| Google Drive | Raw file storage | Free (15 GB) |
| Google Sheets API | Read/write | Free (300 req/min quota) |
| Google Maps API | Address autocomplete | Free tier: 200 req/day |
| OpenAI GPT-4o-mini | ~500 invoices/month | ~$0.05–$0.15 |
| Node.js hosting | Railway / Render free tier | $0 |
| React hosting | Vercel / Netlify free tier | $0 |
| **Total** | | **~$0–$5/month** |

Comparison:

| Solution | Monthly Cost |
|----------|-------------|
| This POC | $0–$5 |
| AWS S3 + Athena + QuickSight | $50–$200 |
| Snowflake + Tableau | $400–$1,000+ |

The architecture proves the concept at roughly 1% of the cost of real lake tooling.
For a company processing a few hundred invoices per month, this may not just be a
POC — it may be the production system.

---

## What's Next

These are the logical next steps to evolve from POC to production:

### Near term

**1. Authentication & authorization**
Currently there is no auth. The obvious path is Google OAuth: users sign in with
their Google account, the backend exchanges for a token, and Drive/Sheets operations
run on behalf of the user instead of a service account. Row-level security
(e.g. farmer can only see their own invoices) can then be enforced in SQL at the
query layer.

**2. Factura Final + Procesar Data**
The `FacturaFinalPage` and "Procesar Data" section are placeholders. The next
meaningful workflow is settlement: matching a final invoice to its initial invoice,
computing commissions, generating a payout summary per farmer.

**3. Data quality alerting**
The Catalog Explorer already computes data quality checks in DuckDB SQL. The next
step is surfacing these as proactive alerts — e.g. a banner on the home screen
when unprocessed Drive files are detected or when header/detail totals diverge.

### Medium term

**4. Real database migration**
The Google Sheets layer works for hundreds of invoices. At a few thousand rows it
starts to show latency. The migration path is clear: PostgreSQL (hosted on Railway or
Supabase free tier) replaces the Sheets structured zone. The Express endpoints and
the `/lake-snapshot` response shape stay the same — only the persistence layer
changes. The React app and DuckDB query layer need zero changes.

**5. Automated ETL (no human trigger)**
Today a human clicks "Analizar" to trigger GPT extraction. The next step is a
webhook or Drive change-notification that fires automatically when a new file is
uploaded, runs the GPT extraction in the background, and writes to Sheets without
human involvement. Humans only intervene on error or low-confidence extractions.

**6. Persisted query history**
QueryLab queries currently disappear on page reload. Saving query definitions to
a `SavedQueries` sheet (or localStorage for a simpler start) would let users
build a library of named reports.

### Longer term

**7. Streaming / real-time layer**
For time-sensitive operations (e.g. monitoring inbound shipments), the batch
`/lake-snapshot` pattern becomes a bottleneck. The architecture extension is a
WebSocket endpoint on the Express backend that pushes Sheets row-change events
to the browser, triggering incremental DuckDB table updates without a full reload.

**8. Multi-tenant / multi-company**
The current POC is single-tenant. Multi-tenancy requires either separate Google
Workspace accounts per tenant (simple, high isolation) or a shared Sheets structure
with a tenant ID column and row-level filtering in every query. The latter is
achievable without changing the architecture — it's a convention change in `buildSQL`.

**9. Graduate to a real data warehouse**
If volume grows beyond Sheets limits (10M cells), the lake structure maps directly
to real warehouse concepts. The Drive raw zone maps to S3 or GCS. The Sheets serving
zone maps to BigQuery or Redshift tables. DuckDB WASM continues to work as the
client-side query engine for interactive analytics. The ETL pipeline (GPT → JSON →
structured store) is the same at any scale.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | React dev server (port 3000) |
| `npm run build` | Production build |
| `cd api && node index.js` | Express backend (port 4000) |

---

## License

Private.
