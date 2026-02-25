import { describe, it, expect } from "vitest";
import {
  computeKpi,
  computeHeatmapData,
  computeGeoData,
  computePaymentRisk,
  computeScoreDistribution,
} from "@/lib/chart-utils";
import type { EnrichedTransaction } from "@/lib/types";

function makeEnriched(overrides: Partial<EnrichedTransaction> = {}): EnrichedTransaction {
  return {
    id: "TXN-test",
    customerId: "CUS-0100",
    amount: 1000,
    paymentMethod: "credit_card",
    status: "approved",
    city: "Ciudad de México",
    state: "CDMX",
    timestamp: "2026-01-15T14:00:00Z",
    hour: 14,
    dayOfWeek: 3,
    timeSincePrevTxn: null,
    amountPercentile: 50,
    customerAvgAmount: 1000,
    velocity24h: 1,
    isUnusualHour: false,
    isHighAmount: false,
    isHighVelocity: false,
    isGeoAnomaly: false,
    isRapidFire: false,
    isSuspicious: false,
    anomalyScore: 10,
    scoreSignals: [],
    ...overrides,
  };
}

describe("computeKpi", () => {
  it("returns zeros for empty input", () => {
    const kpi = computeKpi([]);
    expect(kpi.totalTransactions).toBe(0);
    expect(kpi.chargebackRate).toBe(0);
    expect(kpi.avgAmount).toBe(0);
  });

  it("computes correct totals", () => {
    const txns = [
      makeEnriched({ amount: 100 }),
      makeEnriched({ amount: 200 }),
      makeEnriched({ amount: 300 }),
    ];
    const kpi = computeKpi(txns);
    expect(kpi.totalTransactions).toBe(3);
    expect(kpi.avgAmount).toBe(200);
    expect(kpi.totalAmount).toBe(600);
  });

  it("computes chargeback rate correctly", () => {
    const txns = [
      makeEnriched({ status: "approved" }),
      makeEnriched({ status: "approved" }),
      makeEnriched({ status: "chargeback" }),
      makeEnriched({ status: "chargeback" }),
    ];
    const kpi = computeKpi(txns);
    expect(kpi.chargebackRate).toBe(50); // 2/4 * 100
  });

  it("computes flagged percent correctly", () => {
    const txns = [
      makeEnriched({ isSuspicious: true }),
      makeEnriched({ isSuspicious: false }),
      makeEnriched({ isSuspicious: true }),
      makeEnriched({ isSuspicious: false }),
    ];
    const kpi = computeKpi(txns);
    expect(kpi.flaggedPercent).toBe(50);
  });
});

describe("computeHeatmapData", () => {
  it("returns 168 cells (24 hours * 7 days)", () => {
    const data = computeHeatmapData([]);
    expect(data.length).toBe(168);
  });

  it("counts transactions in correct cells", () => {
    const txns = [
      makeEnriched({ hour: 14, dayOfWeek: 3 }),
      makeEnriched({ hour: 14, dayOfWeek: 3 }),
      makeEnriched({ hour: 2, dayOfWeek: 0 }),
    ];
    const data = computeHeatmapData(txns);
    const cell14_3 = data.find((c) => c.hour === 14 && c.dayOfWeek === 3)!;
    expect(cell14_3.count).toBe(2);

    const cell2_0 = data.find((c) => c.hour === 2 && c.dayOfWeek === 0)!;
    expect(cell2_0.count).toBe(1);
  });

  it("computes chargeback rate per cell", () => {
    const txns = [
      makeEnriched({ hour: 3, dayOfWeek: 1, status: "chargeback" }),
      makeEnriched({ hour: 3, dayOfWeek: 1, status: "approved" }),
    ];
    const data = computeHeatmapData(txns);
    const cell = data.find((c) => c.hour === 3 && c.dayOfWeek === 1)!;
    expect(cell.chargebackRate).toBe(50);
    expect(cell.chargebackCount).toBe(1);
  });
});

describe("computeGeoData", () => {
  it("groups by state and computes chargeback rate", () => {
    const txns = [
      makeEnriched({ state: "CDMX", status: "approved" }),
      makeEnriched({ state: "CDMX", status: "chargeback" }),
      makeEnriched({ state: "Jalisco", status: "approved" }),
      makeEnriched({ state: "Jalisco", status: "approved" }),
    ];
    const data = computeGeoData(txns);
    expect(data.length).toBe(2);

    const cdmx = data.find((d) => d.state === "CDMX")!;
    expect(cdmx.total).toBe(2);
    expect(cdmx.chargebacks).toBe(1);
    expect(cdmx.chargebackRate).toBe(50);
  });

  it("sorts by chargeback rate descending", () => {
    const txns = [
      makeEnriched({ state: "CDMX", status: "approved" }),
      makeEnriched({ state: "Jalisco", status: "chargeback" }),
    ];
    const data = computeGeoData(txns);
    expect(data[0].state).toBe("Jalisco"); // 100% chargeback rate
    expect(data[1].state).toBe("CDMX"); // 0% chargeback rate
  });

  it("returns empty array for empty input", () => {
    expect(computeGeoData([])).toEqual([]);
  });
});

describe("computePaymentRisk", () => {
  it("includes all 5 payment methods even with no data", () => {
    const data = computePaymentRisk([]);
    expect(data.length).toBe(5);
    const methods = data.map((d) => d.method);
    expect(methods).toContain("credit_card");
    expect(methods).toContain("debit_card");
    expect(methods).toContain("spei");
    expect(methods).toContain("oxxo");
    expect(methods).toContain("wallet");
  });

  it("computes correct chargeback rate per method", () => {
    const txns = [
      makeEnriched({ paymentMethod: "credit_card", status: "approved" }),
      makeEnriched({ paymentMethod: "credit_card", status: "chargeback" }),
      makeEnriched({ paymentMethod: "spei", status: "approved" }),
      makeEnriched({ paymentMethod: "spei", status: "approved" }),
    ];
    const data = computePaymentRisk(txns);
    const cc = data.find((d) => d.method === "credit_card")!;
    expect(cc.chargebackRate).toBe(50);
    expect(cc.total).toBe(2);

    const spei = data.find((d) => d.method === "spei")!;
    expect(spei.chargebackRate).toBe(0);
    expect(spei.total).toBe(2);
  });

  it("has correct labels", () => {
    const data = computePaymentRisk([]);
    const cc = data.find((d) => d.method === "credit_card")!;
    expect(cc.label).toBe("Credit Card");
  });
});

describe("computeScoreDistribution", () => {
  it("returns 10 buckets", () => {
    const data = computeScoreDistribution([]);
    expect(data.length).toBe(10);
    expect(data[0].bucket).toBe("0-9");
    expect(data[9].bucket).toBe("90-100");
  });

  it("places transactions in correct buckets", () => {
    const txns = [
      makeEnriched({ anomalyScore: 5 }),
      makeEnriched({ anomalyScore: 15 }),
      makeEnriched({ anomalyScore: 95 }),
    ];
    const data = computeScoreDistribution(txns);
    expect(data[0].count).toBe(1); // 0-9
    expect(data[1].count).toBe(1); // 10-19
    expect(data[9].count).toBe(1); // 90-100
  });

  it("counts flagged transactions per bucket", () => {
    const txns = [
      makeEnriched({ anomalyScore: 5, isSuspicious: true }),
      makeEnriched({ anomalyScore: 5, isSuspicious: false }),
    ];
    const data = computeScoreDistribution(txns);
    expect(data[0].count).toBe(2);
    expect(data[0].flagged).toBe(1);
  });

  it("handles score of exactly 100", () => {
    const txns = [makeEnriched({ anomalyScore: 100 })];
    const data = computeScoreDistribution(txns);
    expect(data[9].count).toBe(1); // 90-100 bucket
  });
});
