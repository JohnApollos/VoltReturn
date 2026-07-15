# VoltReturn — Core Analytics Modules

This document outlines the operational and executive questions answered by each module in **VoltReturn**, including data details and algorithms.

---

## Module 1: Infrastructure Intelligence
* **Executive Question**: Where should we build next?
* **Methodology**: Identifies coverage gaps by looking for regions outside a 5km radius of the **66 active swap stations** mapped across Nairobi. Runs sample-weighted K-Means placement optimization on gap grid points, using subcounty population densities as weights.
* **Output**: Ranked coordinates, nearest subcounty name, competitor brand shares, accessibility index, and grid tie suitability.

---

## Module 2: Fleet Intelligence
* **Executive Question**: How healthy is our fleet?
* **Methodology**: Computes State of Health (SoH) capacity fade curves from battery telemetry. Applies a Weibull survival function to cycles and temperatures to project Remaining Useful Life (RUL).
* **Output**: Cohort degradation charts, remaining cycle counts, failure probabilities, and critical warning lists.

---

## Module 3: Rider Intelligence
* **Executive Question**: Which riders need intervention?
* **Methodology**: Evaluates PAYG default risk via Logistic Regression using features: distance to nearest station, income volatility, daily gross income, and net fuel cost savings. Separately calculates rider churn probability based on trip distance, earnings, and station queue waiting times.
* **Output**: Individual default probabilities, portfolio default exposure, and churn risk scores.

---

## Module 4: Investment Intelligence
* **Executive Question**: If we invest KES X today, what happens?
* **Methodology**: Simulates Year 1-5 cash flows under different budget allocations. Runs Monte Carlo simulations (1,000 iterations) sampling input variables (default rate changes, electricity tariffs, adoption rates) to calculate probability distributions of NPV and IRR.
* **Output**: DCF financial tables, IRR/NPV distributions, sensitivity tornado rankings, and payback periods.

---

## Module 5: Operations Intelligence
* **Executive Question**: What happens tomorrow?
* **Methodology**: Forecasts swap demand, station queuing loads, and local grid electricity requirements using additive seasonal time-series models.
* **Output**: Grid load forecasts, battery cabinet inventory projections, and peak grid load warnings.

---

## Module 6: Sustainability Intelligence
* **Executive Question**: What impact are we creating?
* **Methodology**: Compares petrol exhaust emissions (3.1 kg CO2/L) against EV operations powered by Kenya's grid mix (0.05 kg CO2/kWh), complying with Verra VM0038 standards.
* **Output**: Net metric tons of CO2 offset, petrol liters displaced, trees planted equivalent, and carbon credit revenue projections.

---

## AI Decision Assistant & Committee Reporting

### AI Decision Assistant
An expert RAG system utilizing the **June 2026 google-genai Interactions API**. To prevent hallucinations, the backend queries SQLite and DuckDB to fetch ground-truth metrics, embeds them in a prompt template, and sends them to `gemini-3.5-flash` to generate grounded executive summaries.

### Investment Committee Mode
Generates a formatted, 5-page board-ready PDF report (via **ReportLab**). Incorporates financial DCF tables, K-Means recommended coordinates, carbon offset summaries, model assumptions, and limitations.
