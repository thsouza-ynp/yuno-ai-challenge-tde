import { describe, it, expect } from "vitest";
import { scoreTransaction } from "@/lib/scorer";
import type { EnrichedTransaction, DatasetStats } from "@/lib/types";

const defaultStats: DatasetStats = {
  amountMean: 850,
  amountStd: 600,
  sortedAmounts: [],
  globalAvgVelocity: 1,
};

function makeScorable(overrides: Partial<EnrichedTransaction> = {}): EnrichedTransaction {
  return {
    id: "TXN-test",
    customerId: "CUS-0100",
    amount: 500,
    paymentMethod: "spei",
    status: "approved",
    city: "Ciudad de México",
    state: "CDMX",
    timestamp: "2026-01-15T14:00:00Z",
    hour: 14,
    dayOfWeek: 3,
    timeSincePrevTxn: null,
    amountPercentile: 50,
    customerAvgAmount: 500,
    velocity24h: 1,
    isUnusualHour: false,
    isHighAmount: false,
    isHighVelocity: false,
    isGeoAnomaly: false,
    isRapidFire: false,
    isSuspicious: false,
    anomalyScore: 0,
    scoreSignals: [],
    ...overrides,
  };
}

describe("scoreTransaction", () => {
  it("returns 0 for a normal transaction", () => {
    const txn = makeScorable();
    const { score, signals } = scoreTransaction(txn, defaultStats);
    expect(score).toBe(0);
    expect(signals).toHaveLength(0);
  });

  it("adds +20 for unusual hour", () => {
    const txn = makeScorable({ isUnusualHour: true, hour: 3 });
    const { score, signals } = scoreTransaction(txn, defaultStats);
    expect(score).toBeGreaterThanOrEqual(20);
    expect(signals.some((s) => s.includes("Late-night"))).toBe(true);
  });

  it("adds +25 for chargeback status", () => {
    const txn = makeScorable({ status: "chargeback" });
    const { score, signals } = scoreTransaction(txn, defaultStats);
    expect(score).toBeGreaterThanOrEqual(25);
    expect(signals.some((s) => s.includes("chargeback"))).toBe(true);
  });

  it("adds +15 for high velocity", () => {
    const txn = makeScorable({ isHighVelocity: true, velocity24h: 7 });
    const { score, signals } = scoreTransaction(txn, defaultStats);
    expect(score).toBeGreaterThanOrEqual(15);
    expect(signals.some((s) => s.includes("velocity"))).toBe(true);
  });

  it("adds +10 for geo anomaly", () => {
    const txn = makeScorable({ isGeoAnomaly: true });
    const { score, signals } = scoreTransaction(txn, defaultStats);
    expect(score).toBeGreaterThanOrEqual(10);
    expect(signals.some((s) => s.includes("geo anomaly"))).toBe(true);
  });

  it("adds +10 for rapid fire", () => {
    const txn = makeScorable({ isRapidFire: true, timeSincePrevTxn: 30 });
    const { score, signals } = scoreTransaction(txn, defaultStats);
    expect(score).toBeGreaterThanOrEqual(10);
    expect(signals.some((s) => s.includes("Rapid-fire"))).toBe(true);
  });

  it("adds +5 for fraud hotspot city", () => {
    const txn = makeScorable({ city: "Cancún" });
    const { score, signals } = scoreTransaction(txn, defaultStats);
    expect(score).toBeGreaterThanOrEqual(5);
    expect(signals.some((s) => s.includes("hotspot"))).toBe(true);
  });

  it("adds +5 for credit card payment method", () => {
    const txn = makeScorable({ paymentMethod: "credit_card" });
    const { score, signals } = scoreTransaction(txn, defaultStats);
    expect(score).toBeGreaterThanOrEqual(5);
    expect(signals.some((s) => s.includes("Credit Card"))).toBe(true);
  });

  it("adds amount deviation score based on z-score", () => {
    // z-score = (3000 - 850) / 600 = 3.58 → 15 * min(3.58/3, 1) = 15
    const txn = makeScorable({ amount: 3000, customerAvgAmount: 500 });
    const { score, signals } = scoreTransaction(txn, defaultStats);
    expect(score).toBeGreaterThanOrEqual(10); // some amount contribution
    expect(signals.some((s) => s.includes("z-score"))).toBe(true);
  });

  it("caps score at 100", () => {
    // Stack ALL signals
    const txn = makeScorable({
      isUnusualHour: true,
      hour: 2,
      status: "chargeback",
      isHighVelocity: true,
      velocity24h: 8,
      isGeoAnomaly: true,
      isRapidFire: true,
      timeSincePrevTxn: 10,
      city: "Cancún",
      paymentMethod: "credit_card",
      amount: 5000,
      customerAvgAmount: 200,
    });
    const { score } = scoreTransaction(txn, defaultStats);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("accumulates multiple signals", () => {
    const txn = makeScorable({
      isUnusualHour: true,
      hour: 3,
      status: "chargeback",
      city: "Tijuana",
      paymentMethod: "credit_card",
    });
    const { score, signals } = scoreTransaction(txn, defaultStats);
    // 20 (hour) + 25 (chargeback) + 5 (hotspot) + 5 (cc) = 55
    expect(score).toBeGreaterThanOrEqual(55);
    expect(signals.length).toBeGreaterThanOrEqual(4);
  });
});
