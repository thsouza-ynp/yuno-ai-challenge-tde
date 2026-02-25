import type {
  EnrichedTransaction,
  KpiSummary,
  HeatmapCell,
  GeoData,
  PaymentRiskData,
  PaymentMethod,
} from "./types";
import { METHOD_LABELS, PAYMENT_METHODS } from "./constants";

export function computeKpi(txns: EnrichedTransaction[]): KpiSummary {
  const total = txns.length;
  if (total === 0) {
    return { totalTransactions: 0, chargebackRate: 0, flaggedPercent: 0, avgAmount: 0, totalAmount: 0 };
  }
  const chargebacks = txns.filter((t) => t.status === "chargeback").length;
  const flagged = txns.filter((t) => t.isSuspicious).length;
  const totalAmount = txns.reduce((s, t) => s + t.amount, 0);
  return {
    totalTransactions: total,
    chargebackRate: (chargebacks / total) * 100,
    flaggedPercent: (flagged / total) * 100,
    avgAmount: totalAmount / total,
    totalAmount,
  };
}

export function computeHeatmapData(txns: EnrichedTransaction[]): HeatmapCell[] {
  const grid = new Map<string, { count: number; chargebackCount: number }>();

  // Initialize all cells
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      grid.set(`${d}-${h}`, { count: 0, chargebackCount: 0 });
    }
  }

  for (const t of txns) {
    const key = `${t.dayOfWeek}-${t.hour}`;
    const cell = grid.get(key)!;
    cell.count++;
    if (t.status === "chargeback") cell.chargebackCount++;
  }

  const result: HeatmapCell[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const cell = grid.get(`${d}-${h}`)!;
      result.push({
        hour: h,
        dayOfWeek: d,
        count: cell.count,
        chargebackCount: cell.chargebackCount,
        chargebackRate: cell.count > 0 ? (cell.chargebackCount / cell.count) * 100 : 0,
      });
    }
  }
  return result;
}

export function computeGeoData(txns: EnrichedTransaction[]): GeoData[] {
  const byState = new Map<string, { total: number; chargebacks: number }>();

  for (const t of txns) {
    let entry = byState.get(t.state);
    if (!entry) {
      entry = { total: 0, chargebacks: 0 };
      byState.set(t.state, entry);
    }
    entry.total++;
    if (t.status === "chargeback") entry.chargebacks++;
  }

  return Array.from(byState.entries())
    .map(([state, d]) => ({
      state,
      total: d.total,
      chargebacks: d.chargebacks,
      chargebackRate: d.total > 0 ? (d.chargebacks / d.total) * 100 : 0,
    }))
    .sort((a, b) => b.chargebackRate - a.chargebackRate);
}

export function computePaymentRisk(txns: EnrichedTransaction[]): PaymentRiskData[] {
  const byMethod = new Map<PaymentMethod, { total: number; chargebacks: number }>();

  // Initialize all methods so they always appear
  for (const pm of PAYMENT_METHODS) {
    byMethod.set(pm.method, { total: 0, chargebacks: 0 });
  }

  for (const t of txns) {
    const entry = byMethod.get(t.paymentMethod)!;
    entry.total++;
    if (t.status === "chargeback") entry.chargebacks++;
  }

  return Array.from(byMethod.entries()).map(([method, d]) => ({
    method,
    label: METHOD_LABELS[method],
    total: d.total,
    chargebacks: d.chargebacks,
    chargebackRate: d.total > 0 ? (d.chargebacks / d.total) * 100 : 0,
  }));
}

export function computeScoreDistribution(
  txns: EnrichedTransaction[]
): { bucket: string; count: number; flagged: number }[] {
  const buckets: { bucket: string; count: number; flagged: number }[] = [];

  for (let i = 0; i < 10; i++) {
    const lo = i * 10;
    const hi = i === 9 ? 100 : lo + 9;
    buckets.push({ bucket: `${lo}-${hi}`, count: 0, flagged: 0 });
  }

  for (const t of txns) {
    const idx = Math.min(Math.floor(t.anomalyScore / 10), 9);
    buckets[idx].count++;
    if (t.isSuspicious) buckets[idx].flagged++;
  }

  return buckets;
}
