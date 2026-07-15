# VoltReturn — Mathematical Formulations

This document provides the formal mathematical models and equations running inside **VoltReturn**.

---

## 1. Module 1 (Infrastructure) — Location-Allocation & Suitability

Given candidate grid points $P_i$ and demand weights $W_i = \text{density}_i \times \text{boda\_factor}_i$, we optimize the placement of $k$ facilities by selecting centroids $C_j$ that minimize:
$$\min_{C} \sum_{i=1}^{N} W_i \min_{j=1}^{k} d(P_i, C_j)$$
*Where $d(P_i, C_j)$ represents the Haversine great-circle distance in kilometers.*

Centroid suitability score ($S$) out of 100:
$$S = 0.40 \cdot S_{\text{rider}} + 0.30 \cdot S_{\text{connectivity}} + 0.15 \cdot S_{\text{grid}} + 0.15 \cdot S_{\text{road}}$$
* $S_{\text{rider}}$: Density decayed by distance to centroid.
* $S_{\text{connectivity}}$: Distance to other stations, maximizing coverage and avoiding redundancy ($3\text{km} \le d \le 8\text{km}$).
* S_grid: Proximity to major industrial grid anchors (Makadara, CBD).
* S_road: Proximity to major transit corridors.

---

## 2. Module 2 (Fleet) — Battery Degradation & RUL Survival

Battery Capacity State of Health (SoH) fade over cycle count ($N_c$) and cell temperature ($T$ in Kelvin) is modeled usingArrhenius power laws:
$$\text{SoH}(N_c, T) = \text{SoH}_{\text{init}} - A \cdot \exp\left(-\frac{E_a}{R \cdot T}\right) \cdot N_c^z$$
* $E_a$: Activation energy ($22,400 \text{ J/mol}$).
* $R$: Gas constant ($8.314 \text{ J/(mol K)}$).
* $A$: Pre-exponential factor ($0.0018$).
* $z$: Diffusion exponent ($0.55$).

The probability of a pack surviving wear-out up to cycle $t$ is computed via a two-parameter Weibull distribution:
$$S(t) = \exp\left( - \left(\frac{t}{\lambda}\right)^k \right)$$
* Scale parameter $\lambda = 1800$ cycles.
* Shape parameter $k = 2.2$.

---

## 3. Module 3 (Rider) — PAYG Credit default & Churn

Borrower default probability ($P_{\text{default}}$):
$$P_{\text{default}} = \frac{1}{1 + \exp(-z_{\text{default}})}$$
$$z_{\text{default}} = \beta_0 + \beta_1 \cdot D_{\text{BSS}} + \beta_2 \cdot V_{\text{income}} + \beta_3 \cdot I_{\text{daily}} + \beta_4 \cdot S_{\text{net}}$$
* $D_{\text{BSS}}$: Geodesic distance to nearest swap station (standardized coef $\beta_1 = 0.35$).
* $V_{\text{income}}$: Coefficient of variation of daily gross earnings.
* $I_{\text{daily}}$: Average daily gross income in KES.
* $S_{\text{net}}$: Net fuel savings (petrol cost minus electric cost).

Rider churn probability ($P_{\text{churn}}$):
$$P_{\text{churn}} = \frac{1}{1 + \exp(-z_{\text{churn}})}$$
$$z_{\text{churn}} = \gamma_0 + \gamma_1 \cdot D_{\text{BSS}} + \gamma_2 \cdot V_{\text{income}} + \gamma_3 \cdot D_{\text{daily}} - \gamma_4 \cdot S_{\text{net}}$$
* $D_{\text{daily}}$: Average daily distance driven in km (governing driver fatigue).

---

## 4. Module 4 (Investment) — DCF, IRR, and Monte Carlo

### Net Present Value (NPV)
$$\text{NPV} = \sum_{t=1}^{H} \frac{CF_t}{(1 + r)^t} - \text{CapEx}$$
* $CF_t$: Annual net cash flows (swap margins + PAYG collections + ESG credits - maintenance).
* $r$: Hurdle rate ($12\%$).
* $H$: Time horizon ($5\text{ years}$).

### Internal Rate of Return (IRR)
Computed numerically by finding the root $r$ where $\text{NPV}(r) = 0$ using the Newton-Raphson method:
$$r_{n+1} = r_n - \frac{\text{NPV}(r_n)}{\text{NPV}'(r_n)}$$

### Monte Carlo Return Simulation
Runs $M = 1000$ iterations. In each iteration, parameters are sampled:
* Tariff Cost $\text{Tariff} \sim N(\mu_{\text{tariff}}, \sigma^2)$
* Default Rate $\text{Default} \sim \text{LogNormal}(\mu_{\text{default}}, \sigma^2)$
* Rider Adoption $\text{Adoption} \sim N(1.0, 0.08^2)$
The simulation calculates the resulting cash flows and generates distribution percentiles for board risk evaluation.

---

## 5. Module 6 (Sustainability) — Carbon Credits

Emissions displaced ($E_{\text{avoided}}$) under Verra VM0038 rules:
$$E_{\text{avoided}} = \text{Fleet Size} \times \text{Annual Distance (km)} \times \left( EF_{\text{petrol}} - EF_{\text{grid}} \right)$$
$$EF_{\text{petrol}} = \frac{1}{\text{Petrol Efficiency (km/L)}} \times \text{Petrol Emissions factor } (3.10 \text{ kg } CO_2/\text{L})$$
$$EF_{\text{grid}} = \text{Electricity consumption (kWh/km)} \times \text{Grid Emissions factor } (0.05 \text{ kg } CO_2/\text{kWh})$$
*If simulating diesel generator backups, the grid factor rises to $0.45\text{ kg } CO_2/\text{kWh}$.*
