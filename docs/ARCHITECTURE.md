# VoltReturn — Architecture Design Document

This document outlines the system architecture, directory layouts, and data integration structures for **VoltReturn**.

---

## 1. System Topology

VoltReturn follows a decoupled Monorepo pattern, partitioning services between the FastAPI analytical backend and the Next.js single-page client.

```
                  ┌──────────────────────────────────────────────┐
                  │                 USER BROWSER                 │
                  │         Next.js App / Zustand Store          │
                  └──────────────────────┬───────────────────────┘
                                         │ HTTP REST API
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │               FASTAPI BACKEND                │
                  │   Core calculation, SQLite, & DuckDB logic   │
                  └──────┬──────────────────────┬──────────┬─────┘
                         │                      │          │
                         ▼                      ▼          ▼
    ┌─────────────────────────┐   ┌─────────────────┐   ┌────────────────────────┐
    │       DUCKDB ENGINE     │   │   SQLITE DB     │   │     GEMINI API         │
    │  Analytical Parquet     │   │  Ledger, Gov,   │   │  (google-genai SDK)    │
    │  scans (SoH history)    │   │  & Quality logs │   │  AI Decision Assistant │
    └─────────────────────────┘   └─────────────────┘   └────────────────────────┘
```

---

## 2. Shared Directory Layout

```text
VoltReturn/
├── backend/
│   ├── app/
│   │   ├── core/               # Shared settings, database connections, and validation
│   │   │   ├── config.py
│   │   │   ├── database.py     # SQLite metadata + DuckDB analytics
│   │   │   ├── data_quality.py # Ingestion completeness & anomaly auditor
│   │   │   ├── model_governance.py # Model versions and audit logging
│   │   │   └── init_db.py      # SQLite table initialization
│   │   ├── models/             # SQLite SQLAlchemy schemas
│   │   │   └── schemas.py      # Tables: recommendations, governance, quality logs
│   │   ├── modules/            # Product Modules
│   │   │   ├── infrastructure/ # Optimal placement optimization (K-Means)
│   │   │   ├── fleet/          # Battery cycle wear-out & Weibull survival
│   │   │   ├── rider/          # PAYG credit risk (logistic regression) & churn
│   │   │   ├── finance/        # DCF, IRR, and Monte Carlo simulations
│   │   │   ├── sustainability/ # Carbon credits (Verra VM0038)
│   │   │   ├── reporting/      # ReportLab Board Memo PDF generator
│   │   │   └── ai_assistant/   # google-genai RAG assistant (June 2026 SDK)
│   │   ├── main.py             # FastAPI entrypoint
│   │   └── tests/              # Pytest modules
│   └── requirements.txt
├── frontend/                   # Next.js App Router Application
│   ├── public/                 # Branding assets and logos
│   │   ├── logo-wide.png       # Landscape banner logo
│   │   ├── icon-white.jpg      # White background icon logo
│   │   └── icon-transparent.png # Transparent icon logo
│   ├── src/
│   │   ├── app/                # App Router and CSS entrypoints
│   │   │   ├── globals.css     # Dark mode CSS and pulse animations
│   │   │   ├── layout.tsx      # Main layout mapping Leaflet CDN
│   │   │   └── page.tsx        # Dashboard portal organizing modular views
│   │   ├── store/
│   │   │   └── useStore.ts     # Zustand state and LocalStorage persistence
│   │   └── components/
│   │       ├── MapComponent.tsx # Leaflet map nodes and popups
│   │       └── views/          # Modular workspace views
│   │           ├── LandingView.tsx      # Onboarding cover page
│   │           ├── DashboardView.tsx    # Key KPIs and sliders panel
│   │           ├── GisWorkspaceView.tsx # Map layers and indicators list
│   │           ├── OptimizationView.tsx # K-Means coordinate tables
│   │           ├── FinancialView.tsx    # Recharts Monte Carlo, waterfalls, tornado
│   │           ├── CarbonView.tsx       # ESG indicators
│   │           ├── AiAdvisorView.tsx    # Gemini RAG strategy console
│   │           ├── CompareScenariosView.tsx # Saved scenario matrix comparisons
│   │           └── BoardMemoView.tsx    # McKinsey print brief & export PDF
├── data/                       # Local file database repository
│   ├── existing_stations.csv   # 66 active geocoded stations in Nairobi
│   ├── nairobi_subcounties.csv # Demographics and population density
│   ├── rider_loans.csv         # Cohort profiles (1000 riders)
│   └── battery_telemetry.parquet # High-frequency battery logs (5000 records)
├── docs/                       # Comprehensive documentation suite
│   ├── ARCHITECTURE.md
│   ├── MODULES.md
│   └── MATHEMATICAL_MODELS.md
├── README.md
└── .gitignore
```

---

## 3. Storage Separation & Engineering Heuristics

Rather than running heavy, expensive relational server databases or cloud warehouses, VoltReturn uses a **zero-cost local storage architecture**:

### SQLite Relational Store
* **Role**: Operational ledger, tracking state and history.
* **Tables**:
  * `recommendations`: Ledger logging proposed station coordinates, confidence ratings, status, and observed forecasting accuracy.
  * `model_governance`: Audit trail of deployed ML models (features, hyperparameters, intercept parameters, validation accuracy).
  * `data_quality_logs`: Database of ingestion validation runs.

### DuckDB Analytical Engine
* **Role**: In-memory analytical scanning on large datasets.
* **Mechanism**: Runs inside `":memory:"` in a thread-safe environment. Directly scans local Parquet files (e.g., `battery_telemetry.parquet`) on-the-fly. This prevents file locking conflicts and allows concurrent API queries.

### Zustand LocalStorage Persisted State
* **Role**: Local scenario memory.
* **Mechanism**: Leverages the Zustand browser client persistence middleware. All custom scenarios saved by the investment officer are cached locally in the browser, enabling persistent comparative analysis across reloads.
