# Asparagus Operations Management — POC

> **Proof of Concept** — A prototype for managing asparagus supply chain operations: master data, invoice entry, and AI-assisted document analysis. Built with React and a Node.js backend, using Google Sheets as the data layer and OpenAI for invoice extraction.

---

## Overview

This POC demonstrates an end-to-end workflow for asparagus (*esparrago*) business operations:

1. **Master Data** — Manage reference data (farmers, clients, products, commissions, boxes)
2. **Data Entry** — Capture inventory and invoices (initial and final)
3. **AI-Assisted Invoice Analysis** — Upload PDF/XML invoices and use GPT to extract structured data

The app is designed to validate the architecture and UX before scaling to a full product.

---

## What This POC Explores

This project was built to learn how to **design and architect full-stack solutions** with a clear separation between backend and frontend in a React environment:

- **Frontend** — React (pages, components, hooks) owns UI and user flows; calls a backend API for data and side effects
- **Backend** — Express API owns business logic, external services (Google, OpenAI), and file handling; exposes REST endpoints
- **Integration** — Axios + dev proxy for API calls; shared contracts via request/response shapes; no business logic in the UI

The asparagus domain is used as a concrete use case to practice this architecture and wiring.

---

## Features

### Master Data
- **Agricultores** (Farmers) — CRUD with address autocomplete (Google Places), phone/email validation
- **Clientes** (Clients)
- **Producto Esparrago** (Asparagus products)
- **Comisiones** (Commissions)
- **Cajas** (Boxes)

Data is read/written from Google Sheets via the backend API.

### Data Entry
- **Inventario** (Inventory) — Placeholder for inventory entry
- **Factura Inicial** — Upload invoice PDF/XML → AI extraction → manual review → save to Sheets
- **Factura Final** — Similar flow for final invoices

### Backend API
- **Google Drive** — Upload, list, download, share, delete files
- **Google Sheets** — Read, append, update, delete rows
- **OpenAI** — Chat completion and file-based analysis (invoice parsing)
- **Danfo.js** — CSV/DataFrame processing for data workflows

---

## Tech Stack

| Layer        | Stack                                |
|-------------|--------------------------------------|
| Frontend    | React 19, React Router, Axios        |
| UI          | Google Maps Places (address autocomplete) |
| Backend     | Express, Multer, CORS                |
| Data        | Google Sheets, Google Drive          |
| AI          | OpenAI GPT (invoice extraction)      |

---

## Setup

### 1. Install dependencies
```bash
npm install
cd api && npm install
```

### 2. Environment variables
Create `.env` in the project root and `api/.env`:

```env
# Root (.env) - for React
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

```env
# api/.env - for backend
OPENAI_API_KEY=your_openai_key
GOOGLE_DRIVE_FOLDER_ID=optional_default_folder_id
PORT=4000
```

### 3. Google credentials
Place `api/credentials.json` (Google service account key) for Drive and Sheets access.

### 4. Run
```bash
# Terminal 1: API server (port 4000)
cd api && node index.js

# Terminal 2: React app (port 3000)
npm start
```

The React dev server proxies API requests to the backend (see `proxy` in `package.json`).

---

## Project Structure

Frontend and backend live in separate areas; the `src/services/` layer is the bridge that calls the API:

```
├── api/                 # Backend — Express API (Drive, Sheets, OpenAI)
├── src/
│   ├── components/      # UI components (forms, autocomplete)
│   ├── hooks/           # Data & state (useMasterData, useFacturaInicial)
│   ├── pages/           # Master data & data entry screens
│   ├── services/        # Frontend → API bridge (masterDataService, facturaService)
│   └── utils/           # Validators, number formatting
└── public/
```

---

## POC Scope & Limitations

- **Data layer**: Google Sheets; not suitable for high-volume production
- **Auth**: No authentication/authorization; for demo use only
- **Planned**: "Procesar Data" and "Análisis y Venta Final" modules are not yet implemented
- **Errors**: Limited error handling and validation; focus is on core flows

---

## Scripts

| Command      | Description                    |
|-------------|--------------------------------|
| `npm start` | Run React dev server (port 3000) |
| `npm run build` | Production build           |
| `npm test`  | Run tests                     |

---

## License

Private.
