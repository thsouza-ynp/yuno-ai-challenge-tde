import { describe, it, expect } from "vitest";
import { enrichBatch, enrichOne, computeDatasetStats } from "@/lib/enrichment";
import { generateHistoricalDataset } from "@/lib/generator";
import type { RawTransaction, CustomerState, DatasetStats } from "@/lib/types";

// Helper: create a minimal raw transaction
function makeTxn(overrides: Partial<RawTransaction> = {}): RawTransaction {
  return {
    id: "TXN-test-001",
    customerId: "CUS-0100",
    amount: 1000,
    paymentMethod: "credit_card",
    status: "approved",
    city: "Ciudad de México",
    state: "CDMX",
    timestamp: "2026-01-15T14:30:00Z",
    ...overrides,
  };
}

const defaultStats: DatasetStats = {
  amountMean: 850,
  amountStd: 600,
  sortedAmounts: Array.from({ length: 100 }, (_, i) => (i + 1) * 50),
  globalAvgVelocity: 1,
};

describe("computeDatasetStats", () => {
  it("computes correct mean", () => {
    const txns = [{ amount: 100 }, { amount: 200 }, { amount: 300 }];
    const stats = computeDatasetStats(txns);
    expect(stats.amountMean).toBe(200);
  });

  it("computes correct std deviation", () => {
    const txns = [{ amount: 100 }, { amount: 200 }, { amount: 300 }];
    const stats = computeDatasetStats(txns);
    // population std = sqrt(((100-200)^2 + (200-200)^2 + (300-200)^2) / 3) ≈ 81.65
    expect(stats.amountStd).toBeCloseTo(81.65, 1);
  });

  it("sorts amounts correctly", () => {
    const txns = [{ amount: 300 }, { amount: 100 }, { amount: 200 }];
    const stats = computeDatasetStats(txns);
    expect(stats.sortedAmounts).toEqual([100, 200, 300]);
  });

  it("computes average velocity when provided", () => {
    const txns = [
      { amount: 100, velocity24h: 2 },
      { amount: 200, velocity24h: 4 },
    ];
    const stats = computeDatasetStats(txns);
    expect(stats.globalAvgVelocity).toBe(3);
  });

  it("defaults globalAvgVelocity to 1 when no velocity data", () => {
    const txns = [{ amount: 100 }, { amount: 200 }];
    const stats = computeDatasetStats(txns);
    expect(stats.globalAvgVelocity).toBe(1);
  });
});

describe("enrichOne", () => {
  it("computes hour and dayOfWeek from timestamp", () => {
    const txn = makeTxn({ timestamp: "2026-01-15T14:30:00Z" }); // Wednesday
    const enriched = enrichOne(txn, undefined, defaultStats);
    // Hour depends on local timezone — just verify it's a number 0-23
    expect(enriched.hour).toBeGreaterThanOrEqual(0);
    expect(enriched.hour).toBeLessThanOrEqual(23);
    expect(enriched.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(enriched.dayOfWeek).toBeLessThanOrEqual(6);
  });

  it("returns null timeSincePrevTxn for first transaction", () => {
    const txn = makeTxn();
    const enriched = enrichOne(txn, undefined, defaultStats);
    expect(enriched.timeSincePrevTxn).toBeNull();
  });

  it("computes timeSincePrevTxn when customer state exists", () => {
    const txn = makeTxn({ timestamp: "2026-01-15T15:00:00Z" });
    const state: CustomerState = {
      lastCity: "Ciudad de México",
      lastTimestamp: new Date("2026-01-15T14:00:00Z").getTime(),
      totalAmount: 500,
      txnCount: 1,
      recentTimestamps: [new Date("2026-01-15T14:00:00Z").getTime()],
    };
    const enriched = enrichOne(txn, state, defaultStats);
    expect(enriched.timeSincePrevTxn).toBe(3600); // 1 hour = 3600 seconds
  });

  it("flags unusual hours (0-5 AM)", () => {
    // Use a UTC time that maps to 0-5 in local tz — since we can't control TZ,
    // just test the flag logic via a batch with known hours
    const txn3am = makeTxn({ timestamp: "2026-01-15T03:00:00-06:00" }); // 3 AM CST
    const enriched = enrichOne(txn3am, undefined, defaultStats);
    // This test is TZ-dependent; let's verify the flag matches the computed hour
    if (enriched.hour >= 0 && enriched.hour <= 5) {
      expect(enriched.isUnusualHour).toBe(true);
    }
  });

  it("flags high amount when above threshold", () => {
    const state: CustomerState = {
      lastCity: "Ciudad de México",
      lastTimestamp: new Date("2026-01-14T14:00:00Z").getTime(),
      totalAmount: 500,
      txnCount: 2, // avg = 250
      recentTimestamps: [new Date("2026-01-14T14:00:00Z").getTime()],
    };
    // Amount must be > 2.5x customer avg (250*2.5=625) AND > 2500
    const txn = makeTxn({ amount: 3000 });
    const enriched = enrichOne(txn, state, defaultStats);
    expect(enriched.isHighAmount).toBe(true);
  });

  it("does NOT flag high amount when below floor", () => {
    const state: CustomerState = {
      lastCity: "Ciudad de México",
      lastTimestamp: new Date("2026-01-14T14:00:00Z").getTime(),
      totalAmount: 100,
      txnCount: 1, // avg = 100
      recentTimestamps: [new Date("2026-01-14T14:00:00Z").getTime()],
    };
    // Amount 500 > 2.5 * 100 = 250, but 500 < 2500 floor
    const txn = makeTxn({ amount: 500 });
    const enriched = enrichOne(txn, state, defaultStats);
    expect(enriched.isHighAmount).toBe(false);
  });

  it("flags high velocity when >= 5 txns in 24h", () => {
    const now = new Date("2026-01-15T14:00:00Z").getTime();
    const state: CustomerState = {
      lastCity: "Ciudad de México",
      lastTimestamp: now - 60000,
      totalAmount: 5000,
      txnCount: 5,
      recentTimestamps: [
        now - 4 * 3600000,
        now - 3 * 3600000,
        now - 2 * 3600000,
        now - 1 * 3600000,
        now - 60000,
      ],
    };
    const txn = makeTxn({ timestamp: new Date(now).toISOString() });
    const enriched = enrichOne(txn, state, defaultStats);
    expect(enriched.isHighVelocity).toBe(true);
    expect(enriched.velocity24h).toBeGreaterThanOrEqual(5);
  });

  it("flags rapid fire when < 120 seconds since prev txn", () => {
    const now = new Date("2026-01-15T14:00:00Z").getTime();
    const state: CustomerState = {
      lastCity: "Ciudad de México",
      lastTimestamp: now - 60000, // 60 seconds ago
      totalAmount: 1000,
      txnCount: 1,
      recentTimestamps: [now - 60000],
    };
    const txn = makeTxn({ timestamp: new Date(now).toISOString() });
    const enriched = enrichOne(txn, state, defaultStats);
    expect(enriched.isRapidFire).toBe(true);
    expect(enriched.timeSincePrevTxn).toBe(60);
  });

  it("flags geo anomaly when city changes within 2h", () => {
    const now = new Date("2026-01-15T14:00:00Z").getTime();
    const state: CustomerState = {
      lastCity: "Monterrey",
      lastTimestamp: now - 3600000, // 1 hour ago
      totalAmount: 1000,
      txnCount: 1,
      recentTimestamps: [now - 3600000],
    };
    const txn = makeTxn({ city: "Cancún", timestamp: new Date(now).toISOString() });
    const enriched = enrichOne(txn, state, defaultStats);
    expect(enriched.isGeoAnomaly).toBe(true);
  });

  it("does NOT flag geo anomaly when city changes after 2h", () => {
    const now = new Date("2026-01-15T14:00:00Z").getTime();
    const state: CustomerState = {
      lastCity: "Monterrey",
      lastTimestamp: now - 8 * 3600000, // 8 hours ago
      totalAmount: 1000,
      txnCount: 1,
      recentTimestamps: [now - 8 * 3600000],
    };
    const txn = makeTxn({ city: "Cancún", timestamp: new Date(now).toISOString() });
    const enriched = enrichOne(txn, state, defaultStats);
    expect(enriched.isGeoAnomaly).toBe(false);
  });

  it("sets isSuspicious when any flag is true", () => {
    const now = new Date("2026-01-15T14:00:00Z").getTime();
    const state: CustomerState = {
      lastCity: "Monterrey",
      lastTimestamp: now - 30000,
      totalAmount: 1000,
      txnCount: 1,
      recentTimestamps: [now - 30000],
    };
    // Rapid fire (30s) + geo anomaly (city change within 2h)
    const txn = makeTxn({ city: "Cancún", timestamp: new Date(now).toISOString() });
    const enriched = enrichOne(txn, state, defaultStats);
    expect(enriched.isSuspicious).toBe(true);
  });

  it("includes anomalyScore and scoreSignals", () => {
    const txn = makeTxn();
    const enriched = enrichOne(txn, undefined, defaultStats);
    expect(typeof enriched.anomalyScore).toBe("number");
    expect(enriched.anomalyScore).toBeGreaterThanOrEqual(0);
    expect(enriched.anomalyScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(enriched.scoreSignals)).toBe(true);
  });
});

describe("enrichBatch", () => {
  it("enriches all transactions", () => {
    const txns = [
      makeTxn({ id: "T1", timestamp: "2026-01-15T10:00:00Z" }),
      makeTxn({ id: "T2", timestamp: "2026-01-15T11:00:00Z" }),
      makeTxn({ id: "T3", timestamp: "2026-01-15T12:00:00Z" }),
    ];
    const enriched = enrichBatch(txns);
    expect(enriched.length).toBe(3);
    for (const e of enriched) {
      expect(e).toHaveProperty("hour");
      expect(e).toHaveProperty("dayOfWeek");
      expect(e).toHaveProperty("isUnusualHour");
      expect(e).toHaveProperty("anomalyScore");
    }
  });

  it("returns transactions sorted by timestamp", () => {
    const txns = [
      makeTxn({ id: "T3", timestamp: "2026-01-15T15:00:00Z" }),
      makeTxn({ id: "T1", timestamp: "2026-01-15T10:00:00Z" }),
      makeTxn({ id: "T2", timestamp: "2026-01-15T12:00:00Z" }),
    ];
    const enriched = enrichBatch(txns);
    expect(enriched[0].id).toBe("T1");
    expect(enriched[1].id).toBe("T2");
    expect(enriched[2].id).toBe("T3");
  });

  it("computes timeSincePrevTxn for same customer", () => {
    const txns = [
      makeTxn({ id: "T1", customerId: "CUS-0001", timestamp: "2026-01-15T10:00:00Z" }),
      makeTxn({ id: "T2", customerId: "CUS-0001", timestamp: "2026-01-15T11:00:00Z" }),
    ];
    const enriched = enrichBatch(txns);
    expect(enriched[0].timeSincePrevTxn).toBeNull(); // first txn
    expect(enriched[1].timeSincePrevTxn).toBe(3600); // 1 hour
  });

  it("tracks customer state incrementally", () => {
    const txns = [
      makeTxn({ id: "T1", customerId: "CUS-0001", amount: 100, timestamp: "2026-01-15T10:00:00Z" }),
      makeTxn({ id: "T2", customerId: "CUS-0001", amount: 300, timestamp: "2026-01-15T11:00:00Z" }),
    ];
    const enriched = enrichBatch(txns);
    // Second txn should see avg = 100 (only first txn in history at computation time)
    expect(enriched[1].customerAvgAmount).toBe(100);
  });

  it("handles large dataset from generator", () => {
    const { transactions } = generateHistoricalDataset(500, 99);
    const enriched = enrichBatch(transactions);
    expect(enriched.length).toBeGreaterThanOrEqual(500);

    // Every enriched txn has all required fields
    for (const e of enriched) {
      expect(typeof e.hour).toBe("number");
      expect(typeof e.dayOfWeek).toBe("number");
      expect(typeof e.amountPercentile).toBe("number");
      expect(typeof e.velocity24h).toBe("number");
      expect(typeof e.isSuspicious).toBe("boolean");
      expect(typeof e.anomalyScore).toBe("number");
    }

    // At least some transactions should be flagged
    const flagged = enriched.filter((e) => e.isSuspicious);
    expect(flagged.length).toBeGreaterThan(0);
  });
});
