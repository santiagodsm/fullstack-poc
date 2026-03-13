# Data Lake Architecture — POC Build Plan

> Advancing the Google Drive + Sheets fullstack POC into a demonstrable
> data lake architecture with a client-side query and analytics layer.

---

## Table of Contents

1. [Vision & Goals](#1-vision--goals)
2. [Current State](#2-current-state)
3. [Target Architecture](#3-target-architecture)
4. [Lake Zone Model](#4-lake-zone-model)
5. [Phase 1 — Lake Organization](#5-phase-1--lake-organization)
6. [Phase 2 — Client-Side Query Engine](#6-phase-2--client-side-query-engine)
7. [Phase 3 — Analytics Dashboard](#7-phase-3--analytics-dashboard)
8. [Phase 4 — Query Lab](#8-phase-4--query-lab)
9. [Phase 5 — Lake Catalog Explorer](#9-phase-5--lake-catalog-explorer)
10. [Navigation & Routing](#10-navigation--routing)
11. [New File Map](#11-new-file-map)
12. [Dependencies](#12-dependencies)
13. [Build Order & Effort](#13-build-order--effort)
14. [Cost Model](#14-cost-model)

---

## 1. Vision & Goals

### The Idea

Small companies can't afford Redshift, Snowflake, or a data engineering team. This POC
proves that a functional data lake architecture — raw storage, transformation, structured
serving, and analytics — can be built entirely on **free or near-free Google services**,
with the query engine running **inside the browser**.

### Design Principles

- **No new paid infrastructure** — Drive, Sheets, and the existing Node backend are enough
- **Query layer lives in the client** — DuckDB WASM runs SQL in the browser; no database server needed
- **Demonstrable end-to-end** — a non-technical user should be able to follow the full data journey from raw PDF to business insight
- **Extendable** — the architecture maps 1:1 to real lake concepts (zones, catalog, lineage, serving layer), so graduating to a real lake later is a refactor, not a rewrite

### What "Lake" Means Here

| Real Data Lake Concept | This POC Implementation |
|------------------------|------------------------|
| Raw / Landing Zone | Google Drive folders (partitioned by date) |
| ETL / Transform Layer | OpenAI GPT-4o-mini (PDF/XML → structured JSON) |
| Curated / Processed Zone | Google Sheets (HeaderFactura, DetalleFactura) |
| Data Catalog | LakeCatalog sheet + Catalog Explorer UI |
| Query Engine | DuckDB WASM running SQL in the browser |
| Serving / Analytics Layer | React dashboard + Query Lab |
| Data Lineage | DriveFileId column linking Drive → Sheets rows |

---

## 2. Current State

### What's Already Built

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT APP (React)                        │
│                                                                  │
│   Master Data CRUD          Data Entry / Invoice Upload          │
│   (Agricultores, Clientes,  (Upload PDF/XML → GPT extract →     │
│    Productos, Comisiones,    review → save to Sheets)            │
│    Cajas)                                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Axios HTTP (proxy → :4000)
┌───────────────────────────▼─────────────────────────────────────┐
│                      EXPRESS BACKEND (:4000)                     │
│                                                                  │
│  /read-sheet   /write-sheet   /update-sheet   /clear-sheet      │
│  /write-factura-inicial                                          │
│  /upload  /upload/:folderId  /download/:fileId                   │
│  /list-files  /list-folders  /delete-files  /share-files        │
│  /chat  /chat-file  /df-sum  /drive-info                        │
└───────┬───────────────────────────────────────┬─────────────────┘
        │                                       │
┌───────▼────────────┐               ┌──────────▼──────────────┐
│   GOOGLE DRIVE     │               │     GOOGLE SHEETS        │
│                    │               │                          │
│  Flat folder:      │               │  Master Spreadsheet:     │
│  /invoices/  ──────┼── no lineage  │  • Agricultores          │
│   (all files flat) │               │  • Clientes              │
│                    │               │  • Producto_Esparrago    │
│                    │               │  • Comisiones, Cajas     │
│                    │               │                          │
│                    │               │  Invoice Spreadsheet:    │
│                    │               │  • HeaderFactura         │
│                    │               │  • DetalleFactura        │
└────────────────────┘               └─────────────────────────┘
```

### Gaps

| Gap | Impact |
|-----|--------|
| Drive files are in a flat folder | No partitioning, hard to reason about volume over time |
| No link between Drive file and Sheets row | No lineage — can't trace "which PDF produced this invoice" |
| Danfo.js installed but unused | Query capability sitting idle |
| No analytics layer | Data goes in but nothing comes back out as insight |
| No data catalog | No way to know what's in the lake at a glance |
| Spreadsheet IDs hardcoded in source | Can't have staging vs. production environments |

---

## 3. Target Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                          CLIENT APP (React)                            │
│                                                                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Lake Catalog    │  │   Query Lab      │  │ Analytics Dashboard  │  │
│  │ Explorer        │  │   (Ad-hoc)       │  │                      │  │
│  │                 │  │                  │  │ KPI Cards            │  │
│  │ • File browser  │  │ • Dimension pick │  │ Revenue over time    │  │
│  │ • Lineage view  │  │ • Metric pick    │  │ Revenue by client    │  │
│  │ • Data quality  │  │ • Filter builder │  │ Product breakdown    │  │
│  │                 │  │ • Results table  │  │ Global date filter   │  │
│  │                 │  │ • CSV export     │  │                      │  │
│  └────────┬────────┘  └───────┬──────────┘  └──────────┬───────────┘  │
│           │                   │                         │              │
│  ╔════════▼═══════════════════▼═════════════════════════▼═══════════╗  │
│  ║              DUCKDB WASM CLIENT-SIDE QUERY ENGINE                ║  │
│  ║                                                                  ║  │
│  ║  useLakeData()  →  db (DuckDB instance with tables registered)  ║  │
│  ║  useQuery()     →  run(sql) or run({ filters, groupBy... })     ║  │
│  ║  queryService   →  initDB / registerTable / query / exportCSV   ║  │
│  ╚══════════════════════════════════════╤══════════════════════════╝  │
└─────────────────────────────────────────┼────────────────────────────┘
                                          │ Axios HTTP
┌─────────────────────────────────────────▼────────────────────────────┐
│                         EXPRESS BACKEND (:4000)                       │
│                                                                       │
│  (existing endpoints)          NEW:                                   │
│                                GET  /lake-snapshot                    │
│                                POST /ensure-partition                 │
│                                (upload auto-logs to LakeCatalog)     │
└──────────────────┬────────────────────────────────┬──────────────────┘
                   │                                │
┌──────────────────▼──────────┐      ┌──────────────▼──────────────────┐
│       GOOGLE DRIVE          │      │         GOOGLE SHEETS            │
│       RAW ZONE              │      │         PROCESSED ZONE           │
│                             │      │                                  │
│  /invoices/                 │      │  Master Spreadsheet:             │
│    2025/                    │      │  • Agricultores                  │
│      01/  ← partition       │ ─────│▶ • Clientes                     │
│        inv-001.pdf          │      │  • Producto_Esparrago            │
│        inv-002.xml          │      │  • Comisiones, Cajas             │
│      02/                    │ link │  • LakeCatalog  ← NEW           │
│        inv-003.pdf          │      │                                  │
│    2026/                    │      │  Invoice Spreadsheet:            │
│      01/                    │      │  • HeaderFactura + DriveFileId   │
│        ...                  │      │  • DetalleFactura                │
└─────────────────────────────┘      └──────────────────────────────────┘
          RAW / LANDING                    CURATED / SERVING
```

---

## 4. Lake Zone Model

```
                         DATA LIFECYCLE

  INGEST              TRANSFORM            SERVE              ANALYZE
─────────────────────────────────────────────────────────────────────
     │                    │                   │                  │
  PDF/XML              GPT-4o-mini         Sheets            Danfo.js
  uploaded  ────────▶  extracts    ──────▶  stores  ──────▶  queries
  to Drive             JSON                 rows              in browser
     │                    │                   │                  │
     ▼                    ▼                   ▼                  ▼
 LakeCatalog           validated          HeaderFactura      Dashboard
 row written           structured         DetalleFactura     Query Lab
 (metadata)            invoice data       LakeCatalog        CSV Export
```

### Zone Responsibilities

#### Raw Zone — Google Drive
- **Immutable** — files are never modified after upload
- **Partitioned** by `YYYY/MM` subfolders
- **Every file** has a catalog entry in `LakeCatalog` sheet
- Files: PDF invoices, XML invoices (future: CSVs, images, contracts)

#### Transform Layer — GPT-4o-mini
- Triggered on demand (user clicks "Analizar")
- Input: raw file bytes + client/product context
- Output: structured JSON with header + line items
- Errors surface to user for manual correction

#### Processed Zone — Google Sheets
- **HeaderFactura**: one row per invoice (15 columns + DriveFileId)
- **DetalleFactura**: one row per line item, linked by NoFactura
- **LakeCatalog**: one row per Drive file (metadata + lineage + status)
- Master data sheets: Agricultores, Clientes, Productos, etc.

#### Serving / Query Layer — DuckDB WASM in Browser
- Initializes an in-memory DuckDB instance on demand
- Registers Sheets data as in-memory tables (`header`, `detail`, `catalog`, `joined`)
- Runs SQL queries (filter, groupby, join, sort, aggregation) locally — no backend needed
- Results rendered as charts and tables

---

## 5. Phase 1 — Lake Organization

> **Goal:** Give the lake proper structure so queries have something real to traverse.
> **Blockers none** — can be built independently.

### 5a. Partitioned Drive Folders

Change upload behavior from flat folder to date-partitioned subfolders:

```
Before:
  /invoices/
    inv-001.pdf
    inv-002.xml
    inv-003.pdf

After:
  /invoices/
    2025/
      01/
        inv-001.pdf
        inv-002.xml
      03/
        inv-003.pdf
    2026/
      01/
        inv-004.pdf
```

**Backend changes — `api/index.js`:**

```
POST /ensure-partition
  Body: { year: "2025", month: "01" }
  Logic:
    1. List folders under MAIN_FOLDER_ID
    2. Find or create folder named year (e.g. "2025")
    3. Find or create subfolder named month (e.g. "01") under year folder
    4. Return { folderId, path: "2025/01" }

POST /upload/:folderId  (modify existing)
  After upload succeeds:
    → auto-call ensure-partition with current date
    → upload to partition folder instead of flat folder
    → return { fileId, partitionPath, folderId }
```

### 5b. LakeCatalog Sheet

New sheet added to the master spreadsheet. Every Drive upload appends one row automatically.

**Schema:**

| Column | Type | Description |
|--------|------|-------------|
| FileId | string | Google Drive file ID |
| FileName | string | Original file name |
| FileType | string | `PDF` or `XML` |
| FileSizeMB | number | Size in megabytes |
| PartitionPath | string | e.g. `2025/01` |
| DriveFolder | string | Drive folder ID |
| UploadedAt | datetime | ISO timestamp |
| UploadedBy | string | User identifier (free text for now) |
| LinkedInvoice | string | NoFactura once processed |
| Status | string | `raw` → `processed` → `error` |
| ExtractedAt | datetime | When GPT processed it |
| Notes | string | Error messages or manual notes |

**Backend changes — `api/index.js`:**

After every successful upload, append a row to `LakeCatalog`:
```
sheets.spreadsheets.values.append({
  spreadsheetId: LAKE_SPREADSHEET_ID,
  range: 'LakeCatalog',
  values: [[fileId, name, type, sizeMB, partitionPath, folderId,
            uploadedAt, uploadedBy, '', 'raw', '', '']]
})
```

When a factura is saved (`/write-factura-inicial`), update the catalog row:
```
Status: 'raw' → 'processed'
LinkedInvoice: NoFactura
ExtractedAt: now
```

### 5c. DriveFileId in HeaderFactura

Add column `DriveFileId` at the end of the `HeaderFactura` sheet. This is the lineage link.

**Frontend change — `src/services/facturaService.js`:**

`saveFacturaInicial()` already receives the upload response. Thread the returned `fileId`
through to the Sheets write so it lands in `HeaderFactura`.

### 5d. Move Hardcoded IDs to Environment

**`api/.env`:**
```env
MASTER_SPREADSHEET_ID=17g9aiOf0mK63tWyIfevKaen_8K_vZXzn078zKjzhq9E
INVOICE_SPREADSHEET_ID=1U3JF2AfkrQ1R9Q7mqy8xEDI0p0ZK4ba4-JoTWcgiyGQ
LAKE_SPREADSHEET_ID=<dedicated lake spreadsheet — separate from master data>
MAIN_DRIVE_FOLDER_ID=151IG_Rd4awTrElqgafxjTPXqWr3n-pzX
INVOICE_UPLOADS_FOLDER_ID=1h88VrnN8p_YTRFwj0bR4jP4gze8UmvVZ
OPENAI_API_KEY=...
PORT=4000
```

**Phase 1 Deliverable:**
Drive has organized partitions. Every file is cataloged in `LakeCatalog`. Lineage exists
from Drive file → Sheets invoice row. No more hardcoded IDs in source code.

---

## 6. Phase 2 — Client-Side Query Engine

> **Goal:** Load Sheets data into DuckDB WASM and make them queryable with SQL.
> This is the core query layer — everything in Phases 3-5 depends on it.
> **Blocker:** Phase 1 must be complete (LakeCatalog must exist).

### 6a. New Backend Endpoint

```
GET /lake-snapshot
  Returns all three datasets in one HTTP call:
  {
    header: [ [...row], [...row] ],        // HeaderFactura rows
    detail: [ [...row], [...row] ],        // DetalleFactura rows
    catalog: [ [...row], [...row] ],       // LakeCatalog rows
    columns: {
      header: ['Fecha', 'Semana', ...],
      detail: ['NoFactura', 'Codigo_Esparrago', ...],
      catalog: ['FileId', 'FileName', ...]
    }
  }
```

Single call replaces 3 separate `/read-sheet` calls. Reduces latency on dashboard load.

### 6b. Query Service

**`src/services/queryService.js`**

```javascript
// Initialize a DuckDB WASM instance (call once, reuse)
initDB()                                // → Promise<AsyncDuckDB>

// Register a Sheets dataset as an in-memory DuckDB table
// rows: [[...], [...]]  columns: ['Col1', 'Col2', ...]
registerTable(db, tableName, rows, columns)   // → Promise<void>
// Tables registered: 'header', 'detail', 'catalog'
// 'joined' is created via SQL VIEW:
//   CREATE VIEW joined AS SELECT * FROM header JOIN detail USING (NoFactura)

// Run arbitrary SQL against the in-memory DB
query(db, sql)                          // → Promise<Array<Object>>

// Build SQL from a structured query definition (used by Query Lab)
buildSQL({
  table:    'header',                   // 'header' | 'detail' | 'catalog' | 'joined'
  filters: [
    { column: 'Cliente',  op: '=',   value: 'Walmart' },
    { column: 'Fecha',    op: '>=',  value: '2025-01-01' },
    { column: 'Total',    op: '>',   value: 1000 }
  ],
  groupBy:  ['Cliente', 'Semana'],      // optional
  metrics: [
    { column: 'Total',     agg: 'SUM'   },
    { column: 'NoFactura', agg: 'COUNT' },
    { column: 'Total',     agg: 'AVG'   }
  ],
  orderBy:  { column: 'Total', direction: 'DESC' },
  limit:    100
})
// → SQL string, e.g.:
//   SELECT Cliente, Semana, SUM(Total), COUNT(NoFactura), AVG(Total)
//   FROM header
//   WHERE Cliente = 'Walmart' AND Fecha >= '2025-01-01' AND Total > 1000
//   GROUP BY Cliente, Semana
//   ORDER BY Total DESC
//   LIMIT 100

// Export results to CSV (triggers browser download)
exportCSV(results, filename)            // → void
```

**Supported aggregations:** `SUM`, `COUNT`, `AVG`, `MIN`, `MAX`

**Supported filter operators:** `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`

### 6c. Lake Data Hook

**`src/hooks/useLakeData.js`**

```javascript
const {
  db,       // AsyncDuckDB instance — tables 'header', 'detail', 'catalog', view 'joined' ready
  loading,
  error,
  refresh   // re-fetch from Sheets and re-register tables
} = useLakeData()
```

- Calls `GET /lake-snapshot` once on mount
- Calls `queryService.initDB()` to boot DuckDB WASM
- Registers all three datasets as tables via `queryService.registerTable()`
- Creates a `joined` VIEW via `CREATE VIEW joined AS SELECT * FROM header JOIN detail USING (NoFactura)`
- Caches the `db` instance in a module-level ref (survives re-renders, replaced on refresh)
- Exposes `refresh()` so users can pull fresh Sheets data and reload all tables

### 6d. Query Hook

**`src/hooks/useQuery.js`**

```javascript
const { run, results, columns, loading, error, exportCSV } = useQuery(db)

// Run raw SQL directly:
run(`SELECT Cliente, SUM(Total) as Revenue
     FROM header
     GROUP BY Cliente
     ORDER BY Revenue DESC`)
// results → [{ Cliente: 'Walmart', Revenue: 45200 }, ...]
// columns → ['Cliente', 'Revenue']

// Or run a structured query definition (Query Lab uses this):
run(queryService.buildSQL({
  table:   'header',
  groupBy: ['Semana'],
  metrics: [{ column: 'Total', agg: 'SUM' }],
  orderBy: { column: 'Total', direction: 'DESC' },
  limit:   50
}))
```

**Phase 2 Deliverable:**
Any component can call `useLakeData()` to get a ready DuckDB instance, then `useQuery(db)`
to run SQL. All computation happens in the browser. No new backend endpoints are needed
for queries — just the one `/lake-snapshot` call.

---

## 7. Phase 3 — Analytics Dashboard

> **Goal:** Pre-built views that demonstrate the lake delivering business value.
> **Blocker:** Phase 2 must be complete.

### New Dependency

```bash
npm install recharts
```

Recharts is React-native, composable, and requires no additional configuration.

### New File: `src/pages/analytics/AnalyticsDashboard.js`

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ANALYTICS DASHBOARD                          [↻ Refresh Data]   │
│                                                                  │
│  Filter:  From [Week 1 ▾] To [Week 52 ▾]  Client [All ▾]       │
│                                                                  │
├────────────┬────────────┬────────────┬────────────┬─────────────┤
│ 💰          │ 📄          │ 👥          │ 📦          │             │
│ Total Rev  │ Invoices   │ Clients    │ Top Product│             │
│ $284,500   │ 47         │ 12 active  │ ESP-A4     │             │
└────────────┴────────────┴────────────┴────────────┴─────────────┘
│                                                                  │
│  REVENUE BY WEEK                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  $60k ─                                        ╭──╮        │  │
│  │  $40k ─              ╭──╮          ╭──╮  ╭────╯  ╰──╮     │  │
│  │  $20k ─  ╭──╮  ╭────╯  ╰────╮ ╭──╯  ╰──╯            ╰──  │  │
│  │      └──╯  ╰──╯             ╰╯                             │  │
│  │       W1   W2   W3   W4   W5   W6   W7   W8   W9  W10     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  REVENUE BY CLIENT              PRODUCT VOLUME                   │
│  ┌────────────────────┐         ┌───────────────────────────┐   │
│  │ Walmart     ████████│         │  ESP-A4  ████████  42%    │   │
│  │ Costco      ██████  │         │  ESP-B2  █████     28%    │   │
│  │ HEB         ████    │         │  ESP-C1  ████      19%    │   │
│  │ Trader Joe  ██      │         │  Other   ██        11%    │   │
│  └────────────────────┘         └───────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

#### Components

| Component | Chart Type | Data Source | Query Used |
|-----------|-----------|-------------|------------|
| KPI Cards | Stat display | headerDf | sum/count/max |
| Revenue by Week | LineChart | headerDf | groupby Semana → sum Total |
| Revenue by Client | BarChart (horizontal) | headerDf | groupby Cliente → sum Total |
| Product Volume | BarChart or PieChart | joinedDf | groupby Codigo_Esparrago → sum Cantidad |

#### Global Filter State

```javascript
const [filters, setFilters] = useState({
  weekFrom: null,
  weekTo: null,
  client: 'All'
})
```

All four chart components subscribe to `filters`. When filter changes, `useQuery(db).run(sql)`
reruns with new SQL — no extra network calls, DuckDB re-queries the in-memory tables locally.

**Phase 3 Deliverable:**
A live dashboard reading from the lake, with 4 KPI cards, 3 charts, and a working date/client
filter. Visually compelling and demonstrable to non-technical stakeholders.

---

## 8. Phase 4 — Query Lab

> **Goal:** Let a user build their own query — this is what makes it feel like a real lake,
> not just a dashboard.
> **Blocker:** Phase 2 must be complete.

### New File: `src/pages/analytics/QueryLab.js`

#### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  QUERY LAB                                                          │
├──────────────────────────────────────┬──────────────────────────────┤
│  BUILDER                             │  RESULTS                     │
│                                      │                              │
│  Dataset                             │  47 rows  [⬇ Export CSV]    │
│  ┌────────────────────────────────┐  │                              │
│  │ ○ Invoices (HeaderFactura)     │  │  Cliente  │ Semana │ Total   │
│  │ ● Invoices + Details (joined)  │  │ ─────────────────────────── │
│  │ ○ Catalog (LakeCatalog)        │  │  Walmart  │   12   │ $45,200 │
│  └────────────────────────────────┘  │  Costco   │   12   │ $38,100 │
│                                      │  Walmart  │   13   │ $41,800 │
│  Group By                            │  HEB      │   11   │ $29,300 │
│  [Cliente ▾] [Semana ▾]  [+ add]    │  ...                         │
│                                      │                              │
│  Metrics                             │                              │
│  [Total ▾ → SUM ▾]  [+ add]         │                              │
│  [NoFactura ▾ → COUNT ▾]            │                              │
│                                      │                              │
│  Filters                             │                              │
│  [Fecha ▾] [>= ▾] [2025-01-01]  ✕  │                              │
│  [Cliente ▾] [== ▾] [Walmart   ]  ✕ │                              │
│  [+ Add Filter]                      │                              │
│                                      │                              │
│  Order By  [Total ▾] [DESC ▾]       │                              │
│  Limit     [100 ▾]                  │                              │
│                                      │                              │
│            [▶ Run Query]             │                              │
└──────────────────────────────────────┴──────────────────────────────┘
```

#### Query State Model

```javascript
const [queryDef, setQueryDef] = useState({
  dataset: 'header',        // 'header' | 'joined' | 'catalog'
  groupBy: [],              // string[]
  metrics: [],              // [{ column, agg }]
  filters: [],              // [{ column, op, value }]
  orderBy: { column: '', direction: 'desc' },
  limit: 100
})
```

The `Run Query` button passes `queryDef` to `queryService.buildSQL(queryDef)`, then
`useQuery(db).run(sql)`. Results render in the table. CSV export calls `queryService.exportCSV(results)`.

#### Available Dimensions (Group By options)

From `headerDf`: `Fecha`, `Semana`, `Cliente`, `Ingresado Por`
From `joinedDf` (adds): `Codigo_Esparrago`
From `catalogDf`: `PartitionPath`, `FileType`, `Status`

#### Available Metrics

| Column | Available Aggregations |
|--------|----------------------|
| Total | sum, mean, min, max |
| NoFactura | count |
| Cantidad | sum, mean, min, max |
| Precio | mean, min, max |
| FileSizeMB | sum, mean |

**Phase 4 Deliverable:**
A non-developer can explore the data lake without writing code. The query builder produces
live results from the same DataFrames used by the dashboard. CSV export allows handoff
to Excel-familiar users.

---

## 9. Phase 5 — Lake Catalog Explorer

> **Goal:** Show the raw zone, what's in Drive, and the lineage back to processed data.
> Make the lake observable.
> **Blocker:** Phase 1 (LakeCatalog) must be complete.

### New File: `src/pages/analytics/CatalogExplorer.js`

#### Tab 1 — Files

```
┌──────────────────────────────────────────────────────────────────┐
│  CATALOG EXPLORER    [Files]  [Lineage]  [Data Quality]          │
├──────────────────────────────────────────────────────────────────┤
│  Filter: Type [All ▾]  Status [All ▾]  Date [All ▾]             │
│                                                                  │
│  FileName          │ Type │ Size  │ Partition │ Status    │ Date  │
│  ──────────────────────────────────────────────────────────────  │
│  inv-001.pdf       │ PDF  │ 0.4MB │ 2025/01   │ ✅ processed│ Jan 5│
│  inv-002.xml       │ XML  │ 0.1MB │ 2025/01   │ ✅ processed│ Jan 8│
│  inv-003.pdf       │ PDF  │ 0.5MB │ 2025/02   │ ⚠️ raw      │ Feb 2│
│  inv-004.pdf       │ PDF  │ 0.3MB │ 2025/02   │ ✅ processed│ Feb 9│
│                                                                  │
│  Totals: 4 files | 3 processed | 1 unprocessed | 1.3 MB total   │
└──────────────────────────────────────────────────────────────────┘
```

Clicking a row opens a side panel with full metadata and the lineage chain.

#### Tab 2 — Lineage

```
┌──────────────────────────────────────────────────────────────────┐
│  LINEAGE   Select file: [inv-001.pdf ▾]                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📄 inv-001.pdf                                          │    │
│  │  Google Drive · 2025/01 · 0.4 MB · Uploaded Jan 5       │    │
│  └─────────────────────┬───────────────────────────────────┘    │
│                         │ GPT-4o-mini extracted on Jan 5         │
│  ┌─────────────────────▼───────────────────────────────────┐    │
│  │  📊 HeaderFactura row                                    │    │
│  │  NoFactura: INV-001 · Cliente: Walmart                   │    │
│  │  Semana: 1 · Total: $45,200 · Fecha: 2025-01-05          │    │
│  └─────────────────────┬───────────────────────────────────┘    │
│                         │ 8 line items                           │
│  ┌─────────────────────▼───────────────────────────────────┐    │
│  │  📋 DetalleFactura rows (8)                              │    │
│  │  ESP-A4  × 500  @ $42.00  = $21,000                     │    │
│  │  ESP-B2  × 300  @ $38.50  = $11,550                     │    │
│  │  ESP-C1  × 200  @ $35.00  = $7,000                      │    │
│  │  ...                                                     │    │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

#### Tab 3 — Data Quality

Auto-computed from the DataFrames. No backend calls needed.

```
┌──────────────────────────────────────────────────────────────────┐
│  DATA QUALITY                                                    │
│                                                                  │
│  ✅  45 invoices fully processed                                 │
│  ⚠️   2 Drive files not yet processed (still in raw status)      │
│  ❌   1 HeaderFactura row with no matching DetalleFactura rows   │
│  ⚠️   3 invoices missing Cliente value                           │
│  ⚠️   1 invoice where detail totals don't match header Total     │
│                                                                  │
│  UNPROCESSED FILES                                               │
│  inv-003.pdf · 2025/02 · uploaded Feb 2  [Analyze Now →]        │
│                                                                  │
│  MISMATCHED TOTALS                                               │
│  INV-023 · Header: $12,400 · Detail sum: $11,900 · Δ $500       │
└──────────────────────────────────────────────────────────────────┘
```

"Analyze Now" deep-links back to `FacturaInicialPage` with the file pre-selected.

**Quality checks implemented via DuckDB SQL — all client-side:**
- `SELECT * FROM catalog LEFT JOIN header ON catalog.LinkedInvoice = header.NoFactura WHERE header.NoFactura IS NULL` → unprocessed files
- `SELECT * FROM header LEFT JOIN detail USING (NoFactura) WHERE detail.NoFactura IS NULL` → invoices with no detail rows
- `SELECT * FROM header WHERE Cliente IS NULL OR Cliente = ''` → missing client
- `SELECT h.NoFactura, h.Total, SUM(d.Total) as DetailSum FROM header h JOIN detail d USING (NoFactura) GROUP BY h.NoFactura, h.Total HAVING ABS(h.Total - DetailSum) > 0.01` → mismatched totals

**Phase 5 Deliverable:**
The lake is observable. Any stakeholder can see what's stored, where it came from, and whether
the data is trustworthy — without touching Google Drive or Sheets directly.

---

## 10. Navigation & Routing

### Updated `src/App.js` routes

```
/                           → HomePage
/master-data                → MasterDataPage
  /master-data/agricultores
  /master-data/clientes
  /master-data/productos-esparrago
  /master-data/comisiones
  /master-data/cajas
/ingreso-data               → IngresoDataPage
  /ingreso-data/factura-inicial
  /ingreso-data/factura-final
  /ingreso-data/inventario
/lake                       → LakePage  ← NEW hub
  /lake/analytics           → AnalyticsDashboard
  /lake/query               → QueryLab
  /lake/catalog             → CatalogExplorer
```

### Updated `src/pages/HomePage.js`

Add a third card to the main menu:

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│                  │   │                  │   │                  │
│   Master Data    │   │  Data Entry      │   │   Data Lake      │
│                  │   │                  │   │                  │
│  Farmers,        │   │  Upload &        │   │  Analytics,      │
│  Clients,        │   │  process         │   │  Query Lab,      │
│  Products...     │   │  invoices        │   │  Catalog         │
│                  │   │                  │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

### New `src/pages/LakePage.js`

Hub page for the lake section, mirrors the pattern of `MasterDataPage` and `IngresoDataPage`.

---

## 11. New File Map

```
src/
├── pages/
│   ├── LakePage.js                          ← NEW hub page
│   └── analytics/
│       ├── AnalyticsDashboard.js            ← NEW Phase 3
│       ├── QueryLab.js                      ← NEW Phase 4
│       └── CatalogExplorer.js              ← NEW Phase 5
├── hooks/
│   ├── useLakeData.js                       ← NEW Phase 2
│   └── useQuery.js                          ← NEW Phase 2
├── services/
│   └── queryService.js                      ← NEW Phase 2
└── components/
    └── analytics/
        ├── KpiCard.js                       ← NEW Phase 3
        ├── RevenueByWeekChart.js            ← NEW Phase 3
        ├── RevenueByClientChart.js          ← NEW Phase 3
        ├── ProductVolumeChart.js            ← NEW Phase 3
        ├── FilterBar.js                     ← NEW Phase 3
        ├── QueryBuilder.js                  ← NEW Phase 4
        ├── ResultsTable.js                  ← NEW Phase 4
        ├── FileTable.js                     ← NEW Phase 5
        ├── LineageView.js                   ← NEW Phase 5
        └── DataQualityPanel.js             ← NEW Phase 5

api/
└── index.js    (modified: partition upload, catalog logging, /lake-snapshot)
```

**Modified existing files:**

| File | Change |
|------|--------|
| `api/index.js` | Add `/lake-snapshot`, `/ensure-partition`, catalog logging on upload, env vars |
| `api/.env` | Add spreadsheet IDs, folder IDs |
| `src/App.js` | Add `/lake/*` routes |
| `src/pages/HomePage.js` | Add Data Lake card |
| `src/services/facturaService.js` | Thread DriveFileId through to Sheets write |

---

## 12. Dependencies

### New npm packages (frontend only)

```bash
npm install recharts @duckdb/duckdb-wasm
```

| Package | Purpose | Size | Cost |
|---------|---------|------|------|
| recharts | Charts (LineChart, BarChart, PieChart) | ~300kb | Free |
| @duckdb/duckdb-wasm | In-browser SQL query engine | ~5MB (WASM) | Free |

`@duckdb/duckdb-wasm` ships its own WASM bundles. It requires the worker files to be
accessible at runtime. With CRA, copy the WASM files to `public/` or use the
`selectBundle` helper to load from the jsDelivr CDN:

```javascript
import { selectBundle, ConsoleLogger, AsyncDuckDB } from '@duckdb/duckdb-wasm'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm'
```

Everything else is already installed:
- `googleapis` — Sheets + Drive API (already in `api/package.json`)
- `axios` — HTTP client (already in frontend)
- `react-router-dom` — Routing (already in frontend)

> **Note:** `danfojs-node` was previously listed here. It has been removed. DuckDB WASM
> replaces it entirely for the query layer. Remove `danfojs-node` from both `package.json`
> files to reduce bundle size.

---

## 13. Build Order & Effort

```
Phase 1 ──────────────────────────────────────────── ~3h
  (Lake Organization: partitions, LakeCatalog, lineage, env vars)
         │
         ▼
Phase 2 ──────────────────────────────────────────── ~4h
  (Query Engine: queryService, useLakeData, useQuery, /lake-snapshot)
         │
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
Phase 3    Phase 4    Phase 5       (can be built in parallel)
  ~5h        ~4h        ~3h
Dashboard  QueryLab   Catalog
```

### Total Estimate: ~19h

| Phase | Deliverable | Effort | Dependency |
|-------|-------------|--------|------------|
| 1 — Organization | Partitioned Drive, LakeCatalog, lineage | ~3h | None |
| 2 — Query Engine | Danfo.js service + hooks + `/lake-snapshot` | ~4h | Phase 1 |
| 3 — Dashboard | KPI cards + 3 charts + filter bar | ~5h | Phase 2 |
| 4 — Query Lab | Ad-hoc builder + results table + CSV export | ~4h | Phase 2 |
| 5 — Catalog | File browser + lineage + data quality | ~3h | Phase 1 |

### Suggested Build Sessions

| Session | Work | Output |
|---------|------|--------|
| Session 1 | Phase 1 + Phase 2 | Invisible but foundational — lake is organized and queryable |
| Session 2 | Phase 3 | First visible result — analytics dashboard live |
| Session 3 | Phase 4 + Phase 5 | Full POC complete — query lab + catalog explorer |

---

## 14. Cost Model

| Service | Usage | Monthly Cost |
|---------|-------|-------------|
| Google Drive | Document storage (raw zone) | Free (15GB) / ~$3 for 100GB |
| Google Sheets API | Read/write operations | Free (300 req/min quota) |
| Google Maps API | Address autocomplete (existing) | Free tier: 200 req/day |
| OpenAI GPT-4o-mini | Invoice extraction: ~500 invoices/mo | ~$0.05–$0.15/mo |
| Node.js hosting | Express backend (Railway/Render free tier) | $0 |
| React hosting | Static frontend (Vercel/Netlify free tier) | $0 |
| **TOTAL** | | **~$0–$5/month** |

### Comparison

| Solution | Monthly Cost | Complexity |
|----------|-------------|------------|
| This POC | $0–$5 | Low |
| AWS S3 + Athena + QuickSight | $50–$200 | High |
| Snowflake + Tableau | $400–$1,000+ | Very High |
| Databricks | $200–$2,000+ | Very High |

**The POC proves the architecture concept at 1-2% of the cost of real lake tooling.**
For a company processing a few hundred invoices per month, this may not just be a POC —
it may be the production solution.

---

## Appendix — Data Shapes

### HeaderFactura columns (after Phase 1)
```
Fecha | Semana | NoFactura | Cliente | Total | DocumentoFactura | Flete |
CostoAduanal | RentaBodega | ComisionDG | ComisionBroker | TotalFinal |
IngresadoPor | FechaIngresado | Observaciones | ProcesadoFlag | DriveFileId
```

### DetalleFactura columns
```
NoFactura | Codigo_Esparrago | Cantidad | Precio | Total
```

### LakeCatalog columns (new)
```
FileId | FileName | FileType | FileSizeMB | PartitionPath | DriveFolder |
UploadedAt | UploadedBy | LinkedInvoice | Status | ExtractedAt | Notes
```

---

*Plan version 1.0 — created 2026-03-13*
