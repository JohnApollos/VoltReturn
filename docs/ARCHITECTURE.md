# VoltReturn — Architecture Design Document

This document outlines the system architecture, directory layouts, and data integration structures for **VoltReturn**.

---

## 1. System Topology

VoltReturn follows a decoupled Monorepo pattern, partitioning services between the FastAPI analytical backend and the Next.js visual dashboard client.

```
                  ┌──────────────────────────────────────────────┐
                  │                 USER BROWSER                 │
                  │         Next.js / shadcn / Tailwind          │
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
Emobility+/
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
│   │   │   ├── fleet/          # Battery cycle decay & Weibull survival
│   │   │   ├── rider/          # PAYG credit risk (logistic regression) & churn
│   │   │   ├── finance/        # DCF, IRR, and Monte Carlo simulations
│   │   │   ├── sustainability/ # Carbon credits (Verra VM0038)
│   │   │   ├── reporting/      # ReportLab Board Memo PDF generator
│   │   │   └── ai_assistant/   # google-genai RAG assistant (June 2026 SDK)
│   │   ├── main.py             # FastAPI entrypoint
│   │   └── tests/              # Pytest modules
│   └── requirements.txt
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
* **Mechanism**: Directly executes vectorized SQL commands on local Parquet files (e.g., `battery_telemetry.parquet`). This facilitates sub-second execution times on high-frequency time-series files without server footprint costs.
