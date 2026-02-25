# Mercado Luna — Transaction Anomaly Detector

> Real-time fraud detection pipeline + interactive analytics dashboard for a Mexican e-commerce platform.

Built as a response to the [Yuno Engineering Challenge](CHALLENGE.md): identify suspicious transaction patterns in Mercado Luna's payment data before their chargeback rate triggers processor penalties.

## Quick Start

```bash
git clone https://github.com/thsouza-ynp/yuno-ai-challenge-tde.git
cd yuno-ai-challenge-tde
npm install
npm run dev
# Open http://localhost:3000
```

No backend or database required. The entire pipeline runs client-side with a deterministic data generator.

## Architecture

This is a **fully client-side** Next.js 15 application. There is no database or external data source — transactions are generated in-browser using a seeded PRNG for reproducibility, then enriched through a real-time pipeline:

```
Generator (seed=42)  →  Feature Engineering  →  Anomaly Scoring  →  Visualizations
   5,500 txns            time + behavioral       weighted heuristic     6 charts
   1,500 customers       flags computed           0-100 score            + filters
   45 days               per transaction          per transaction        + AI chat
```

Key design decisions:
- **Client-side generation** eliminates infrastructure dependencies — `npm run dev` is all you need
- **Seeded PRNG** ensures every reviewer sees identical data and patterns
- **Single API route** (`/api/chat`) connects to Groq for the optional AI fraud analyst

## Data Pipeline

### Feature Engineering

Each raw transaction is enriched with computed features:

| Feature | Description |
|---------|-------------|
| `hour` | Transaction hour (0-23) |
| `dayOfWeek` | Day of week (0=Sunday, 6=Saturday) |
| `timeSincePrevTxn` | Seconds since customer's last transaction |
| `amountPercentile` | Where this amount falls in the global distribution (0-100) |
| `customerAvgAmount` | Running average amount for this customer |
| `velocity24h` | Number of transactions from this customer in the past 24 hours |

### Anomaly Flags

Transactions are flagged based on heuristic rules:

| Flag | Trigger |
|------|---------|
| `isUnusualHour` | Transaction between 12 AM and 5 AM |
| `isHighAmount` | Amount > 2.5x customer average AND > 2,500 MXN |
| `isHighVelocity` | 5+ transactions from same customer in 24 hours |
| `isGeoAnomaly` | Customer's city changed within a 2-hour window |
| `isRapidFire` | Less than 120 seconds since customer's previous transaction |
| `isSuspicious` | Any of the above flags is true |

### Anomaly Scoring (Stretch Goal)

A weighted heuristic model assigns a score from 0 to 100 per transaction:

| Signal | Max Points |
|--------|-----------|
| Transaction status (chargeback) | +25 |
| Late-night hours (0-5 AM) | +20 |
| Amount deviation (z-score based) | up to +15 |
| Velocity spike (above threshold) | +15 |
| Geographic anomaly | +10 |
| Rapid-fire timing | +10 |
| Credit card payment method | +5 |

## Dashboard Visualizations

The dashboard includes 6 interactive visualizations:

1. **Temporal Heatmap** — Hour-of-day vs day-of-week chargeback distribution. Reveals the late-night fraud cluster.
2. **Geographic Chart** — Chargeback rate by Mexican state. Highlights Cancun and Tijuana as hotspots.
3. **Payment Method Risk** — Chargeback rate comparison across credit card, debit card, SPEI, OXXO, and wallet.
4. **Anomaly Table** — Sortable, paginated table of flagged transactions with anomaly scores and signal breakdowns.
5. **Score Distribution** — Histogram of anomaly scores across all transactions, with the top 1% highlighted.
6. **Live Transaction Feed** — Real-time scrolling ticker showing recent transactions with status badges.

All charts respond to a shared filter panel: date range, payment method, transaction status, and geographic region.

## Key Findings

### Suspicious Patterns Identified

1. **Late-night chargeback cluster**: Transactions between 12-5 AM show approximately 16x higher chargeback rate than daytime. A "fraud ring" of roughly 20 customers exclusively transacts in this window.

2. **Geographic hotspots**: Cancun (Quintana Roo) and Tijuana (Baja California) show 3-5x higher chargeback rates than the national average, consistent with known card-testing corridors.

3. **Credit card concentration**: Credit cards carry a roughly 3% chargeback rate vs near-zero for OXXO cash payments and under 0.5% for SPEI bank transfers.

4. **Velocity abusers**: A small group of customers with 5+ daily transactions exhibits mixed chargeback patterns, suggesting automated or scripted purchasing behavior.

### Recommended Actions

- Implement velocity limits: require manual review for customers exceeding 5 transactions per day
- Add step-up authentication for credit card transactions above 3,000 MXN during 0-5 AM
- Flag transactions originating from Cancun and Tijuana for enhanced review
- Promote SPEI and OXXO payment methods for high-risk customer segments

## Test Data

The generator produces a deterministic dataset with the following characteristics:

| Dimension | Value |
|-----------|-------|
| Total transactions | 5,500 |
| Time span | 45 days |
| Unique customers | 1,500 |
| Payment methods | Credit Card (~45%), Debit Card (~15%), SPEI (~20%), OXXO (~15%), Wallet (~5%) |
| Statuses | Approved (~84%), Declined (~12%), Chargeback (~2%), Pending (~1.5%), Refunded (~0.5%) |
| Geographic coverage | 10 Mexican states/cities |
| Amount range | 50-5,000 MXN (outliers up to 15,000 MXN) |

### Seeded Anomaly Patterns

- **Fraud ring**: 20 customers who only transact between 12-5 AM with elevated chargeback rates
- **Velocity abusers**: 5 customers making 6-10 transactions per day
- **Hotspot cities**: Cancun and Tijuana with 5% chargeback rate (vs 2% baseline)
- **High-value late-night**: Large transactions (>3,000 MXN) concentrated in the 0-5 AM window

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (dark theme) |
| Charts | Recharts |
| AI Chat | Groq SDK (LLaMA 3.3 70B) |
| Deployment | Vercel-ready |

## AI Fraud Analyst (Bonus)

The dashboard includes an AI-powered chat panel (bottom-right corner) that can:

- Analyze current dashboard data and explain patterns in natural language
- Identify fraud trends and their business impact
- Recommend specific fraud prevention rules based on the data
- Powered by Groq (LLaMA 3.3 70B) for fast inference

The AI analyst receives a summary of the current dashboard state (KPIs, top chargeback regions, risk by payment method, peak hours) as context with each message.

Requires `GROQ_API_KEY` in `.env`. This is optional — the dashboard is fully functional without it.

## Environment Variables

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | No | Groq API key for AI fraud analyst chat |

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/chat/          # Groq AI analyst endpoint
│   ├── layout.tsx         # Root layout (dark theme)
│   └── page.tsx           # Dashboard entry point
├── components/
│   ├── dashboard/         # All dashboard components
│   └── ui/                # Reusable UI primitives
├── hooks/                 # Custom React hooks
│   ├── useTransactionStream.ts   # Client-side data generator hook
│   └── useTransactionFilters.ts  # Filter state management
└── lib/                   # Core logic
    ├── types.ts           # Shared type definitions
    ├── constants.ts       # Configuration & distributions
    ├── generator.ts       # Transaction data generator (seeded PRNG)
    ├── enrichment.ts      # Feature computation pipeline
    ├── scorer.ts          # Anomaly scoring model
    └── chart-utils.ts     # Chart data transformers
```

## Approach

This solution prioritizes **working software over polish**, per the 2-hour time constraint. Key trade-offs:

- **Client-side everything**: No backend database means zero infrastructure friction. The seeded generator ensures reproducibility without needing to ship a CSV file.
- **Heuristic scoring over ML**: A weighted rule-based scorer is transparent, debuggable, and sufficient to demonstrate the stretch goal. A true ML model (isolation forest, etc.) would add complexity without meaningfully improving the demo.
- **Recharts over D3**: Pre-built chart components accelerate development. The heatmap, bar charts, and tables cover all required visualization types.
- **Groq over local models**: Sub-second inference for the AI analyst chat, with graceful degradation when no API key is configured.
