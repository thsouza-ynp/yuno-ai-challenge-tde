// ── Transaction Generator — deterministic, seeded PRNG ──

import type { RawTransaction, CustomerState, PaymentMethod, TransactionStatus } from "@/lib/types";
import {
  LOCATIONS,
  PAYMENT_METHODS,
  STATUS_WEIGHTS,
  AMOUNT_MIN,
  AMOUNT_MAX,
  AMOUNT_MEAN,
  AMOUNT_STD,
  OUTLIER_MAX,
  FRAUD_RING_SIZE,
  VELOCITY_ABUSER_COUNT,
  FRAUD_HOTSPOT_CITIES,
  HOTSPOT_CHARGEBACK_RATE,
  CARD_CHARGEBACK_RATE,
  HISTORICAL_COUNT,
  HISTORICAL_DAYS,
  CUSTOMER_COUNT,
  GENERATOR_SEED,
} from "@/lib/constants";

// ── Mulberry32 seeded PRNG (0-1 range) ──
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Weighted random selection ──
function weightedPick<T extends { weight: number }>(items: T[], rng: () => number): T {
  const r = rng();
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.weight;
    if (r < cumulative) return item;
  }
  return items[items.length - 1];
}

// ── Box-Muller for normal distribution ──
function normalRandom(rng: () => number): number {
  const u1 = rng() || 0.0001; // avoid log(0)
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Log-normal amount generator ──
function generateAmount(rng: () => number): number {
  // Log-normal centered around AMOUNT_MEAN
  const logMean = Math.log(AMOUNT_MEAN);
  const logStd = 0.65; // tuned for spread
  const raw = Math.exp(logMean + logStd * normalRandom(rng));

  // 2% chance of outlier
  if (rng() < 0.02) {
    return Math.round(Math.min(raw * (2 + rng() * 3), OUTLIER_MAX) * 100) / 100;
  }

  return Math.round(Math.max(AMOUNT_MIN, Math.min(raw, AMOUNT_MAX)) * 100) / 100;
}

// ── Hourly distribution (more activity 9-21) ──
function generateHour(rng: () => number): number {
  // Weighted toward business hours
  const r = rng();
  if (r < 0.05) return Math.floor(rng() * 6);          // 0-5 AM: 5%
  if (r < 0.15) return 6 + Math.floor(rng() * 3);       // 6-8 AM: 10%
  if (r < 0.75) return 9 + Math.floor(rng() * 12);      // 9-20: 60%
  return 21 + Math.floor(rng() * 3);                     // 21-23: 25%
}

// ── Fraud pattern helpers ──
function isFraudRingCustomer(customerId: string): boolean {
  const num = parseInt(customerId.replace("CUS-", ""), 10);
  return num >= 1 && num <= FRAUD_RING_SIZE;
}

function isVelocityAbuser(customerId: string): boolean {
  const num = parseInt(customerId.replace("CUS-", ""), 10);
  return num >= FRAUD_RING_SIZE + 1 && num <= FRAUD_RING_SIZE + VELOCITY_ABUSER_COUNT;
}

// ── Determine chargeback-boosted status ──
function pickStatus(
  rng: () => number,
  hour: number,
  city: string,
  paymentMethod: PaymentMethod,
  isFraudRing: boolean,
): TransactionStatus {
  // Base chargeback probability
  let chargebackProb = 0.005; // 0.5% baseline

  // Fraud ring: 8% chargeback
  if (isFraudRing) {
    chargebackProb = 0.08;
  } else {
    // Late-night boost for ALL transactions (0-5 AM)
    if (hour >= 0 && hour <= 5) {
      chargebackProb = 0.08;
    }
    // Hotspot city boost
    if (FRAUD_HOTSPOT_CITIES.has(city)) {
      chargebackProb = Math.max(chargebackProb, HOTSPOT_CHARGEBACK_RATE);
    }
    // Credit card boost
    if (paymentMethod === "credit_card") {
      chargebackProb = Math.max(chargebackProb, CARD_CHARGEBACK_RATE);
    }
  }

  const r = rng();
  if (r < chargebackProb) return "chargeback";

  // For the remaining probability, distribute among other statuses (excluding chargeback)
  const remaining = 1 - chargebackProb;
  const r2 = (r - chargebackProb) / remaining;

  // Rescale non-chargeback weights
  const nonChargebackStatuses = STATUS_WEIGHTS.filter((s) => s.status !== "chargeback");
  const totalNonCb = nonChargebackStatuses.reduce((sum, s) => sum + s.weight, 0);

  let cumulative = 0;
  for (const s of nonChargebackStatuses) {
    cumulative += s.weight / totalNonCb;
    if (r2 < cumulative) return s.status;
  }
  return "approved";
}

// ── Generate a single transaction ──
export function generateTransaction(
  rng: () => number,
  timestamp: Date,
  customerStates: Map<string, CustomerState>,
): RawTransaction {
  // Pick customer
  const customerNum = Math.floor(rng() * CUSTOMER_COUNT) + 1;
  const customerId = `CUS-${String(customerNum).padStart(4, "0")}`;

  const fraudRing = isFraudRingCustomer(customerId);
  const velocityAbuser = isVelocityAbuser(customerId);

  // Pick location
  let location: { city: string; state: string };
  if (fraudRing) {
    // 80% Cancún/Tijuana
    if (rng() < 0.8) {
      location = rng() < 0.5
        ? { city: "Cancún", state: "Quintana Roo" }
        : { city: "Tijuana", state: "Baja California" };
    } else {
      const loc = weightedPick(LOCATIONS, rng);
      location = { city: loc.city, state: loc.state };
    }
  } else {
    const loc = weightedPick(LOCATIONS, rng);
    location = { city: loc.city, state: loc.state };
  }

  // Pick payment method
  let paymentMethod: PaymentMethod;
  if (fraudRing) {
    paymentMethod = "credit_card"; // always credit card
  } else {
    paymentMethod = weightedPick(PAYMENT_METHODS, rng).method;
  }

  // Generate amount
  let amount: number;
  if (fraudRing) {
    // High amounts: 2000-8000 MXN
    amount = Math.round((2000 + rng() * 6000) * 100) / 100;
  } else {
    amount = generateAmount(rng);
  }

  // Adjust hour for fraud ring (always 0-5 AM)
  let txTimestamp = new Date(timestamp);
  if (fraudRing) {
    txTimestamp.setHours(Math.floor(rng() * 6), Math.floor(rng() * 60), Math.floor(rng() * 60));
  }

  const hour = txTimestamp.getHours();

  // Pick status with fraud-adjusted probabilities
  const status = pickStatus(rng, hour, location.city, paymentMethod, fraudRing);

  // Generate unique ID
  const id = `TXN-${Date.now().toString(36)}-${Math.floor(rng() * 0xffff).toString(16).padStart(4, "0")}`;

  // Update customer state
  const epochMs = txTimestamp.getTime();
  const existing = customerStates.get(customerId);
  if (existing) {
    existing.recentTimestamps.push(epochMs);
    existing.totalAmount += amount;
    existing.txnCount += 1;
    existing.lastCity = location.city;
    existing.lastTimestamp = epochMs;
  } else {
    customerStates.set(customerId, {
      lastCity: location.city,
      lastTimestamp: epochMs,
      totalAmount: amount,
      txnCount: 1,
      recentTimestamps: [epochMs],
    });
  }

  return {
    id,
    customerId,
    amount,
    paymentMethod,
    status,
    city: location.city,
    state: location.state,
    timestamp: txTimestamp.toISOString(),
  };
}

// ── Generate full historical dataset ──
export function generateHistoricalDataset(
  count: number = HISTORICAL_COUNT,
  seed: number = GENERATOR_SEED,
): { transactions: RawTransaction[]; customerStates: Map<string, CustomerState> } {
  const rng = createRng(seed);
  const customerStates = new Map<string, CustomerState>();
  const transactions: RawTransaction[] = [];

  const endDate = new Date("2026-02-15T23:59:59Z");
  const startDate = new Date(endDate.getTime() - HISTORICAL_DAYS * 24 * 60 * 60 * 1000);

  // Generate timestamps spread over the date range
  const timestamps: Date[] = [];
  for (let i = 0; i < count; i++) {
    const dayOffset = rng() * HISTORICAL_DAYS;
    const day = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const hour = generateHour(rng);
    const minute = Math.floor(rng() * 60);
    const second = Math.floor(rng() * 60);
    day.setHours(hour, minute, second, Math.floor(rng() * 1000));
    timestamps.push(day);
  }

  // Sort chronologically
  timestamps.sort((a, b) => a.getTime() - b.getTime());

  // Inject velocity abuser bursts: pick random days, add 6-10 txns per abuser
  const velocityBursts: Date[] = [];
  for (let i = 0; i < VELOCITY_ABUSER_COUNT; i++) {
    // Each abuser gets 3-5 burst days
    const burstDays = 3 + Math.floor(rng() * 3);
    for (let d = 0; d < burstDays; d++) {
      const dayOffset = Math.floor(rng() * HISTORICAL_DAYS);
      const burstDay = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const txnsThisDay = 6 + Math.floor(rng() * 5); // 6-10
      for (let t = 0; t < txnsThisDay; t++) {
        const h = 8 + Math.floor(rng() * 14); // 8-21 business hours
        const m = Math.floor(rng() * 60);
        const s = Math.floor(rng() * 60);
        const ts = new Date(burstDay);
        ts.setHours(h, m, s, Math.floor(rng() * 1000));
        velocityBursts.push(ts);
      }
    }
  }

  // Generate base transactions
  for (const ts of timestamps) {
    transactions.push(generateTransaction(rng, ts, customerStates));
  }

  // Generate velocity abuser transactions explicitly
  // Reset their customer states so they cluster properly
  for (let i = 0; i < velocityBursts.length; i++) {
    const abuserNum = FRAUD_RING_SIZE + 1 + (i % VELOCITY_ABUSER_COUNT);
    const customerId = `CUS-${String(abuserNum).padStart(4, "0")}`;
    const ts = velocityBursts[i];

    const loc = weightedPick(LOCATIONS, rng);
    const method = weightedPick(PAYMENT_METHODS, rng).method;
    const amount = generateAmount(rng);
    const hour = ts.getHours();
    const status = pickStatus(rng, hour, loc.city, method, false);
    const id = `TXN-${Date.now().toString(36)}-${Math.floor(rng() * 0xffff).toString(16).padStart(4, "0")}`;

    const epochMs = ts.getTime();
    const existing = customerStates.get(customerId);
    if (existing) {
      existing.recentTimestamps.push(epochMs);
      existing.totalAmount += amount;
      existing.txnCount += 1;
      existing.lastCity = loc.city;
      existing.lastTimestamp = epochMs;
    } else {
      customerStates.set(customerId, {
        lastCity: loc.city,
        lastTimestamp: epochMs,
        totalAmount: amount,
        txnCount: 1,
        recentTimestamps: [epochMs],
      });
    }

    transactions.push({
      id,
      customerId,
      amount,
      paymentMethod: method,
      status,
      city: loc.city,
      state: loc.state,
      timestamp: ts.toISOString(),
    });
  }

  // Sort final dataset chronologically
  transactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return { transactions, customerStates };
}
