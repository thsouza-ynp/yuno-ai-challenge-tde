// ── Feature Computation + Anomaly Flags ──

import type {
  RawTransaction,
  EnrichedTransaction,
  CustomerState,
  DatasetStats,
  AnomalyFlags,
  ComputedFeatures,
} from "@/lib/types";
import {
  UNUSUAL_HOUR_START,
  UNUSUAL_HOUR_END,
  HIGH_AMOUNT_MULTIPLIER,
  HIGH_AMOUNT_FLOOR,
  HIGH_VELOCITY_THRESHOLD,
  RAPID_FIRE_SECONDS,
  GEO_ANOMALY_WINDOW_MS,
} from "@/lib/constants";
import { scoreTransaction } from "@/lib/scorer";

// ── Dataset-wide statistics ──
export function computeDatasetStats(
  txns: { amount: number; velocity24h?: number }[],
): DatasetStats {
  const amounts = txns.map((t) => t.amount);
  const n = amounts.length;

  const amountMean = amounts.reduce((s, a) => s + a, 0) / n;
  const amountStd = Math.sqrt(
    amounts.reduce((s, a) => s + (a - amountMean) ** 2, 0) / n,
  );

  const sortedAmounts = [...amounts].sort((a, b) => a - b);

  const velocities = txns
    .map((t) => t.velocity24h)
    .filter((v): v is number => v != null);
  const globalAvgVelocity =
    velocities.length > 0
      ? velocities.reduce((s, v) => s + v, 0) / velocities.length
      : 1;

  return { amountMean, amountStd, sortedAmounts, globalAvgVelocity };
}

// ── Percentile via binary search ──
function computePercentile(value: number, sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 50;

  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((lo / n) * 100);
}

// ── Velocity: count txns in last 24h window ──
function computeVelocity24h(
  recentTimestamps: number[],
  currentMs: number,
): number {
  const windowStart = currentMs - 24 * 60 * 60 * 1000;
  let count = 0;
  for (let i = recentTimestamps.length - 1; i >= 0; i--) {
    if (recentTimestamps[i] >= windowStart && recentTimestamps[i] <= currentMs) {
      count++;
    } else if (recentTimestamps[i] < windowStart) {
      break; // timestamps are chronological, no need to check earlier
    }
  }
  return count;
}

// ── Compute features for one transaction ──
function computeFeatures(
  raw: RawTransaction,
  customerState: CustomerState | undefined,
  stats: DatasetStats,
): ComputedFeatures {
  const ts = new Date(raw.timestamp);
  const epochMs = ts.getTime();
  const hour = ts.getHours();
  const dayOfWeek = ts.getDay();

  let timeSincePrevTxn: number | null = null;
  let customerAvgAmount = raw.amount;
  let velocity24h = 1;

  if (customerState && customerState.txnCount > 0) {
    timeSincePrevTxn = (epochMs - customerState.lastTimestamp) / 1000;
    customerAvgAmount = customerState.totalAmount / customerState.txnCount;
    velocity24h = computeVelocity24h(customerState.recentTimestamps, epochMs);
  }

  const amountPercentile = computePercentile(raw.amount, stats.sortedAmounts);

  return {
    hour,
    dayOfWeek,
    timeSincePrevTxn,
    amountPercentile,
    customerAvgAmount,
    velocity24h,
  };
}

// ── Compute anomaly flags ──
function computeFlags(
  raw: RawTransaction,
  features: ComputedFeatures,
  customerState: CustomerState | undefined,
): AnomalyFlags {
  const isUnusualHour =
    features.hour >= UNUSUAL_HOUR_START && features.hour <= UNUSUAL_HOUR_END;

  const isHighAmount =
    raw.amount > features.customerAvgAmount * HIGH_AMOUNT_MULTIPLIER &&
    raw.amount > HIGH_AMOUNT_FLOOR;

  const isHighVelocity = features.velocity24h >= HIGH_VELOCITY_THRESHOLD;

  const isRapidFire =
    features.timeSincePrevTxn !== null &&
    features.timeSincePrevTxn < RAPID_FIRE_SECONDS;

  let isGeoAnomaly = false;
  if (
    customerState &&
    customerState.lastCity !== raw.city &&
    features.timeSincePrevTxn !== null &&
    features.timeSincePrevTxn * 1000 < GEO_ANOMALY_WINDOW_MS
  ) {
    isGeoAnomaly = true;
  }

  const isSuspicious =
    isUnusualHour || isHighAmount || isHighVelocity || isGeoAnomaly || isRapidFire;

  return {
    isUnusualHour,
    isHighAmount,
    isHighVelocity,
    isGeoAnomaly,
    isRapidFire,
    isSuspicious,
  };
}

// ── Enrich a single transaction (for streaming use) ──
export function enrichOne(
  raw: RawTransaction,
  context: CustomerState | undefined,
  stats: DatasetStats,
): EnrichedTransaction {
  const features = computeFeatures(raw, context, stats);
  const flags = computeFlags(raw, features, context);
  const enrichedPartial = { ...raw, ...features, ...flags, anomalyScore: 0, scoreSignals: [] as string[] };
  const { score, signals } = scoreTransaction(enrichedPartial, stats);

  return {
    ...raw,
    ...features,
    ...flags,
    anomalyScore: score,
    scoreSignals: signals,
  };
}

// ── Enrich a full batch (historical load) ──
export function enrichBatch(raw: RawTransaction[]): EnrichedTransaction[] {
  // 1. Sort by timestamp
  const sorted = [...raw].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // 2. First pass: build customer states + collect amounts for stats
  const customerStates = new Map<string, CustomerState>();
  const firstPassData: { amount: number }[] = sorted.map((txn) => ({
    amount: txn.amount,
  }));

  // Compute initial dataset stats (amounts only, velocity comes in second pass)
  const initialStats = computeDatasetStats(firstPassData);

  // 3. Second pass: enrich with features, flags, scores
  const enriched: EnrichedTransaction[] = [];

  for (const txn of sorted) {
    const existing = customerStates.get(txn.customerId);

    // Compute features against PREVIOUS state (before updating)
    const features = computeFeatures(txn, existing, initialStats);
    const flags = computeFlags(txn, features, existing);

    // Placeholder for scoring
    const partial: EnrichedTransaction = {
      ...txn,
      ...features,
      ...flags,
      anomalyScore: 0,
      scoreSignals: [],
    };

    const { score, signals } = scoreTransaction(partial, initialStats);
    partial.anomalyScore = score;
    partial.scoreSignals = signals;

    enriched.push(partial);

    // Update customer state AFTER computing features
    const epochMs = new Date(txn.timestamp).getTime();
    if (existing) {
      existing.totalAmount += txn.amount;
      existing.txnCount += 1;
      existing.lastCity = txn.city;
      existing.lastTimestamp = epochMs;
      existing.recentTimestamps.push(epochMs);
    } else {
      customerStates.set(txn.customerId, {
        lastCity: txn.city,
        lastTimestamp: epochMs,
        totalAmount: txn.amount,
        txnCount: 1,
        recentTimestamps: [epochMs],
      });
    }
  }

  return enriched;
}
