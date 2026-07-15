# VoltReturn — Core Analytics Modules

This document outlines the operational and executive questions answered by each module in **VoltReturn**, including data details, algorithms, and visual interfaces.

---

## Module 1: Infrastructure Intelligence
* **Executive Question**: Where should we build next?
* **Methodology**: Identifies coverage gaps by looking for regions outside a 5km radius of the **66 active swap stations** mapped across Nairobi. Runs sample-weighted K-Means placement optimization on gap grid points, using subcounty population densities as weights.
* **Visual Interface**: `GisWorkspaceView` and `OptimizationView` mapping the recommended centroids (neon-green circle markers with pulse loops) and listing coordinate indices.

---

## Module 2: Fleet Intelligence
* **Executive Question**: How healthy is our fleet?
* **Methodology**: Computes State of Health (SoH) capacity fade curves from battery telemetry. Applies a Weibull survival function to cycles and temperatures to project Remaining Useful Life (RUL).
* **Visual Interface**: Fleet Health Audit console displaying capacity status, average SoH, and risk warnings.

---

## Module 3: Rider Intelligence
* **Executive Question**: Which riders need intervention?
* **Methodology**: Evaluates PAYG default risk via Logistic Regression using features: distance to nearest station, income volatility, daily gross income, and net fuel cost savings. Separately calculates rider churn probability based on trip distance, earnings, and station queue waiting times.
* **Visual Interface**: Dynamic borrower credit panels tracking expected default rate deltas.

---

## Module 4: Investment Intelligence
* **Executive Question**: If we invest KES X today, what happens?
* **Methodology**: Simulates Year 1-5 cash flows under different budget allocations. Runs Monte Carlo simulations (1,000 iterations) sampling input variables (default rate changes, electricity tariffs, adoption rates) to calculate probability distributions of NPV and IRR.
* **Visual Interface**: `FinancialView` rendering:
  - **Monte Carlo Fan Chart**: Shaded area bands showing NPV distribution.
  - **Cash Flow Waterfall**: Breakdown of CapEx against annual net cash flows.
  - **Sensitivity Tornado**: Elasticity rankings of critical business drivers.
  - **Risk-Return Matrix**: Bubble scatter plot comparing all saved scenarios to trace the efficient frontier.

---

## Module 5: Operations Intelligence
* **Executive Question**: What happens tomorrow?
* **Methodology**: Forecasts swap demand, station queuing loads, and local grid electricity requirements using additive seasonal time-series models.
* **Visual Interface**: Charging Tariff scheduler toggles (Peak, Mixed, Off-Peak) to optimize electricity expenses.

---

## Module 6: Sustainability Intelligence
* **Executive Question**: What impact are we creating?
* **Methodology**: Compares petrol exhaust emissions (3.1 kg CO2/L) against EV operations powered by Kenya's grid mix (0.05 kg CO2/kWh), complying with Verra VM0038 standards.
* **Visual Interface**: `CarbonView` displaying net CO2 offset, petrol liters displaced, trees planted equivalent, and potential carbon credit revenue.

---

## Executive Interface Systems

### Scenario Comparison Matrix
Allows side-by-side comparative analysis of saved capital configurations, tracking IRR, NPV, Payback, and default risks to highlight the mathematically optimal project.

### AI Decision Strategy Assistant
An expert RAG strategy chat interface utilizing the **June 2026 google-genai Interactions API**. Queries DuckDB for metrics, context-grounds the numbers, and returns grounded business recommendations.

### Board Presentation Mode (Board Mode)
A one-click toggle that optimizes the layout for presentation settings. Hides sidebars, centers scorecards, and increases typography sizes to ease visual review during board meetings.

### McKinsey-Style Brief & PDF Exports
Includes a print-friendly in-browser investment memo styled according to the McKinsey formatting brief, linked directly to the backend ReportLab PDF compiler for immediate exports.
