# The Fraud Spike at Midnight: Build Mercado Luna's Transaction Anomaly Detector

**Category:** DATA

---

## The Situation

**Mercado Luna**, a fast-growing e-commerce platform in Mexico serving 200,000+ monthly customers, is facing a crisis. Over the past two months, their chargeback rate has tripled from 0.4% to 1.2%—dangerously close to the 1.5% threshold that would trigger penalties from their payment processor and potentially jeopardize their merchant account.

Their fraud prevention team noticed something unusual: **most fraudulent transactions cluster in specific time windows (late night hours), certain geographic regions, and involve particular purchasing patterns**. But with 15,000+ transactions per day across multiple payment methods (credit cards, SPEI bank transfers, OXXO cash payments, and digital wallets), manually identifying these patterns is impossible.

Mercado Luna's Head of Risk Operations reached out to Yuno with an urgent request: **"We need to understand what's happening in our transaction data. We need visibility into temporal patterns, geographic clusters, and behavioral anomalies so we can configure smarter fraud rules before we hit that 1.5% threshold."**

They've provided you with their recent transaction data. Your mission is to **build a data pipeline and interactive analytics tool** that processes their transaction history, identifies anomaly patterns, and surfaces actionable insights through visualizations.

---

## Domain Background

Before diving into the requirements, here are the key payment concepts you need to know:

### Payment Methods in Mexico

- **Credit/Debit Cards**: Traditional card payments (Visa, Mastercard, etc.)
- **SPEI**: Mexico's real-time electronic bank transfer system, operated by Banco de México
- **OXXO**: A cash payment method where customers receive a voucher to pay at any OXXO convenience store (Mexico's largest chain with 20,000+ locations)
- **Digital Wallets**: Mobile payment apps (like Mercado Pago, PayPal)

### Transaction Statuses

- **Approved**: Payment was successfully authorized and will be captured (money will move from customer to merchant)
- **Declined**: Payment was rejected by the card issuer or payment processor (could be insufficient funds, invalid card, suspected fraud, etc.)
- **Pending**: Payment is awaiting completion (common with OXXO—customer has the voucher but hasn't paid yet)
- **Refunded**: A previously approved payment was returned to the customer
- **Chargeback**: Customer disputed the transaction with their bank/card issuer, forcing the merchant to return the funds (often due to fraud, or "I didn't make this purchase")

### Chargebacks

When a customer disputes a transaction with their bank (claiming it was fraudulent, unauthorized, or the product wasn't delivered), the bank reverses the payment and takes the money back from the merchant. **High chargeback rates (>1.5%) signal to payment processors that a merchant may have fraud problems**, which can result in higher fees, stricter monitoring, or even account termination.

### Why This Matters

Fraudsters often follow patterns: they use stolen cards during low-supervision hours (late night), target specific regions with weaker fraud detection, make unusual purchase combinations, or test cards with small transactions before making large purchases. **Identifying these patterns early allows merchants to block suspicious transactions proactively** rather than dealing with chargebacks weeks later.

---

## Your Mission

Build a **transaction anomaly detection and visualization tool** that helps Mercado Luna's fraud team understand their transaction patterns and identify suspicious behavior.

### Functional Requirements

#### 1. Data Pipeline: Transaction Processing and Enrichment

Ingest the raw transaction data and compute anomaly signals that will help identify suspicious patterns. Your pipeline should:

- Load and clean the transaction dataset
- Compute time-based features: transaction hour, day of week, time since previous transaction from same customer
- Compute behavioral features: transaction amount percentiles, average transaction amount per customer, velocity metrics (e.g., number of transactions per customer per day)
- Flag potential anomalies based on heuristics like:
  - Transactions during unusual hours (e.g., 1-5 AM local time)
  - Unusually high transaction amounts compared to customer's history
  - High-velocity activity (many transactions in a short time window)
  - Geographic anomalies (if a customer's city changes between consecutive transactions within a short time)
  - Any other signals you think indicate risk

**What "done" looks like**: A working data pipeline (script/notebook/app) that takes raw transaction data as input and produces an enriched dataset with computed features and anomaly flags. The output should be clearly structured (CSV, parquet, database, or in-memory dataframe) and ready for visualization.

#### 2. Interactive Analytics Dashboard

Build a web-based dashboard that visualizes transaction patterns and surfaces anomalies. The dashboard should include **at least 4 distinct visualizations** that answer questions like:

- **When are fraudulent transactions happening?** (temporal patterns: hourly distribution, day-of-week trends)
- **Where are chargebacks concentrated?** (geographic distribution: state/city breakdowns)
- **Which payment methods have the highest risk?** (chargeback rates by payment method)
- **What do anomalous transactions look like?** (highlight flagged transactions with their characteristics)

The dashboard should be **interactive**: users should be able to filter by date ranges, payment methods, transaction status, or geographic region, and see the visualizations update accordingly.

**What "done" looks like**: A web interface (could be built with any framework: Streamlit, Dash, Flask+Chart.js, React+D3, etc.) that displays multiple interactive charts. A reviewer should be able to load the app, explore the data through filters, and clearly identify at least 2-3 suspicious patterns that Mercado Luna should investigate.

#### 3. Stretch Goal: Anomaly Scoring Model (Optional)

Go beyond rule-based flags and build a simple machine learning model that assigns an **anomaly score** (0-100) to each transaction based on features like transaction amount, time, customer history, and payment method. Visualize the distribution of scores and highlight the top 1% highest-risk transactions.

**Partial completion of stretch goals is expected and welcomed.** If you attempt this, even a basic model (logistic regression, isolation forest, or simple scoring heuristic) is valuable.

---

## Test Data

You will need to generate or mock transaction data to build and demo your solution. Your test dataset should include:

- **At least 5,000 transactions** spanning 30-60 days
- **Multiple payment methods**: credit cards (~60%), SPEI (~20%), OXXO (~15%), digital wallets (~5%)
- **Transaction statuses**: Mostly approved (~85%), some declined (~12%), a few chargebacks (~2%), some pending (~1%)
- **Geographic diversity**: At least 8-10 different Mexican states/cities
- **Temporal spread**: Transactions throughout the day, but with **a noticeable cluster of chargebacks in late-night hours (12 AM - 5 AM)**
- **Customer IDs**: 1,000-2,000 unique customers, with varying transaction frequencies
- **Transaction amounts**: Realistic e-commerce values (100-5000 MXN), with a few outliers
- **Anomaly seeds**: Intentionally include patterns like:
  - A group of chargebacks from the same city/time window
  - A few customers with unusually high velocity (5+ transactions in one day)
  - Some high-value transactions (>3000 MXN) late at night

You can generate this data using Python (Faker, numpy, pandas), AI tools, or any method you prefer. The data does NOT need to be perfectly realistic—it just needs to be rich enough to demonstrate your pipeline and visualizations.

---

## Acceptance Criteria

Your submission is complete when:

- ✅ The data pipeline runs successfully and produces an enriched dataset with anomaly flags and computed features
- ✅ The dashboard launches and displays at least 4 distinct, meaningful visualizations
- ✅ A reviewer can interact with the dashboard (apply filters, explore data)
- ✅ The visualizations clearly reveal at least **one suspicious pattern** (e.g., late-night chargeback cluster, high-risk city, velocity spikes)
- ✅ The code is documented enough that a reviewer can run it (README with setup instructions)
- ✅ (Stretch) If attempted: an anomaly score is computed and visualized

You do NOT need to deploy this anywhere—a local web app is perfectly fine. The goal is a working prototype that demonstrates data engineering + analytics skills in a fintech context.

---

## Deliverables

- A working data pipeline (script, notebook, or application) that processes transaction data and computes anomaly features/flags
- An interactive web-based dashboard with at least 4 visualizations showing transaction patterns and anomalies
- A README.md with setup instructions, dependencies, and a brief explanation of your approach and key findings from the data
- The generated/mocked transaction dataset (CSV, JSON, or other format) used for development and demo
- (Optional) If stretch goal attempted: code and visualization for the anomaly scoring model

---

## Evaluation Criteria

| Criteria | Points |
|----------|--------|
| **Data pipeline completeness and correctness**: successfully ingests data, computes meaningful features (temporal, behavioral, velocity), and flags anomalies | 25 pts |
| **Dashboard functionality and interactivity**: displays at least 4 distinct visualizations, filters work correctly, interface is usable | 25 pts |
| **Insight quality**: visualizations clearly reveal suspicious patterns (temporal clusters, geographic concentrations, high-risk segments) that would help Mercado Luna's fraud team | 20 pts |
| **Code quality and documentation**: well-organized code, clear README with setup instructions, appropriate comments, easy for reviewer to run | 15 pts |
| **Test data realism**: generated dataset is sufficiently rich and includes intentional anomaly patterns that demonstrate the solution's value | 10 pts |
| **Stretch goal execution**: anomaly scoring model implemented and integrated into dashboard (bonus points for creative or effective approaches) | 5 pts |
| **Total** | **100 pts** |

---

## Notes

- **Choose your own stack**: Python is common for data work, but use whatever you're most productive with
- **Prioritize the core requirements**: A simple dashboard with clear insights is better than an over-engineered incomplete solution
- **AI tools are encouraged**: Use Claude, Cursor, Copilot, ChatGPT, or any coding assistants. The goal is to see how you architect a solution and deliver quickly
- **Focus on insights over polish**: The dashboard doesn't need to be beautiful—it needs to be functional and tell a clear story about the data
