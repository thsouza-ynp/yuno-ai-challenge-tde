// ── Anomaly Scoring — weighted heuristic, 0-100 scale ──

import type { EnrichedTransaction, DatasetStats } from "@/lib/types";
import { FRAUD_HOTSPOT_CITIES } from "@/lib/constants";

export function scoreTransaction(
  txn: EnrichedTransaction,
  stats: DatasetStats,
): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Unusual hour (0-5 AM): +20
  if (txn.isUnusualHour) {
    score += 20;
    signals.push(`Late-night transaction (${txn.hour} AM)`);
  }

  // High amount (z-score based): +15 * min(z/3, 1)
  if (stats.amountStd > 0) {
    const zScore = (txn.amount - stats.amountMean) / stats.amountStd;
    if (zScore > 1) {
      const contribution = 15 * Math.min(zScore / 3, 1);
      score += contribution;
      const ratio =
        txn.customerAvgAmount > 0
          ? (txn.amount / txn.customerAvgAmount).toFixed(1)
          : "N/A";
      signals.push(
        `Amount ${txn.amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN is ${ratio}x customer average (z-score: ${zScore.toFixed(1)})`,
      );
    }
  }

  // Chargeback status: +25
  if (txn.status === "chargeback") {
    score += 25;
    signals.push("Transaction resulted in chargeback");
  }

  // High velocity (>=5 txns/day): +15
  if (txn.isHighVelocity) {
    score += 15;
    signals.push(`High velocity: ${txn.velocity24h} transactions in 24h`);
  }

  // Geo anomaly: +10
  if (txn.isGeoAnomaly) {
    score += 10;
    signals.push("City changed within 2-hour window (geo anomaly)");
  }

  // Rapid fire: +10
  if (txn.isRapidFire) {
    score += 10;
    const seconds = txn.timeSincePrevTxn != null ? Math.round(txn.timeSincePrevTxn) : 0;
    signals.push(`Rapid-fire: only ${seconds}s since previous transaction`);
  }

  // Fraud hotspot city: +5
  if (FRAUD_HOTSPOT_CITIES.has(txn.city)) {
    score += 5;
    signals.push(`Transaction from fraud hotspot: ${txn.city}`);
  }

  // Credit card method: +5
  if (txn.paymentMethod === "credit_card") {
    score += 5;
    signals.push("High-risk payment method: Credit Card");
  }

  // Cap at 100
  score = Math.min(Math.round(score), 100);

  return { score, signals };
}
