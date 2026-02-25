# Mercado Luna — Transaction Anomaly Detector

Yuno Engineering Challenge: fraud detection data pipeline + interactive dashboard for a Mexican e-commerce platform.

## Quick Reference

- **Challenge spec**: `CHALLENGE.md` — full requirements, acceptance criteria, scoring rubric (100 pts)
- **Time constraint**: 2-hour challenge. Prioritize working software over polish.
- **Stack**: Next.js 15 + React 19 + TypeScript + Tailwind v4 + Recharts + Groq SDK
- **Architecture**: Fully client-side pipeline (generator → enrichment → scoring → visualization)
- **API**: Single /api/chat route for Groq AI analyst

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
│   ├── useTransactionStream.ts   # Client-side generator
│   └── useTransactionFilters.ts  # Filter state management
└── lib/                   # Core logic
    ├── types.ts           # Shared type definitions
    ├── constants.ts       # Configuration & distributions
    ├── generator.ts       # Transaction data generator (seeded PRNG)
    ├── enrichment.ts      # Feature computation pipeline
    ├── scorer.ts          # Anomaly scoring model
    └── chart-utils.ts     # Chart data transformers
```

## Groq Integration

Ported from agentic-recon. Two client modes available:

### Streaming chat with tool-use loop
```python
from app.services.groq_client import chat_stream

async for event in chat_stream(
    messages=[{"role": "user", "content": "Analyze this pattern..."}],
    system_prompt="You are a fraud analyst...",
    tools=MY_TOOLS,              # OpenAI-format tool schemas
    tool_executor=my_executor,   # async (name, args) -> dict
):
    match event["type"]:
        case "text_delta": ...   # Streamed text chunk
        case "tool_call": ...    # Tool invocation
        case "tool_result": ...  # Tool output
        case "done": ...         # Stream complete
```
- Model: `llama-3.3-70b-versatile` (128K context)
- Max 10 tool-use iterations, 4096 tokens per response

### Simple non-streaming completion
```python
from app.services.groq_client import chat_simple

result = await chat_simple(
    prompt="Classify this transaction...",
    system_prompt="Return JSON with...",
    response_format={"type": "json_object"},
)
```
- Model: `qwen/qwen3-32b` (structured extraction, JSON parsing)
- Good for: anomaly classification, rule generation, data enrichment

### Configuration
```bash
# .env (copy from .env.example)
GROQ_API_KEY=gsk_...

# Optional overrides
GROQ_MODEL=qwen/qwen3-32b
GROQ_CHAT_MODEL=llama-3.3-70b-versatile
```

## Requirements (from CHALLENGE.md)

### Core (90 pts)
1. **Data Pipeline** (25 pts) — Ingest → clean → compute features → flag anomalies
   - Time features: hour, day-of-week, time since last txn per customer
   - Behavioral: amount percentiles, avg per customer, velocity (txns/customer/day)
   - Anomaly flags: late-night (1-5 AM), high amount vs history, high velocity, geo jumps
2. **Dashboard** (25 pts) — Web UI with 4+ interactive visualizations
   - Temporal patterns (hourly/daily chargeback distribution)
   - Geographic concentration (state/city breakdown)
   - Payment method risk (chargeback rate by method)
   - Anomalous transaction explorer
   - Filters: date range, payment method, status, region
3. **Insight Quality** (20 pts) — Reviewer must spot 2-3 suspicious patterns
4. **Code Quality & Docs** (15 pts) — README with setup instructions, organized code
5. **Test Data** (10 pts) — 5K+ txns, 30-60 days, seeded anomalies

### Stretch (5 pts)
- ML anomaly scoring model (0-100 score per transaction)
- Isolation forest, logistic regression, or scoring heuristic

## Test Data Spec

Generate mock data with these distributions:
- **Payment methods**: credit cards ~60%, SPEI ~20%, OXXO ~15%, wallets ~5%
- **Statuses**: approved ~85%, declined ~12%, chargeback ~2%, pending ~1%
- **Geography**: 8-10 Mexican states/cities
- **Customers**: 1,000-2,000 unique IDs
- **Amounts**: 100-5,000 MXN, with outliers
- **Seeded anomalies**:
  - Chargeback cluster: same city + late-night window (12-5 AM)
  - High-velocity customers: 5+ txns in one day
  - High-value late-night transactions (>3,000 MXN)

## Conventions

- Keep `.env` out of git (already in `.gitignore`)
- Use `.env.example` for documenting required env vars
- TypeScript strict mode
- Next.js 15 App Router with React 19
- No over-engineering — this is a 2-hour prototype
