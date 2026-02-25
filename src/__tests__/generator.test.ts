import { describe, it, expect } from "vitest";
import { createRng, generateTransaction, generateHistoricalDataset } from "@/lib/generator";
import { FRAUD_RING_SIZE, VELOCITY_ABUSER_COUNT, CUSTOMER_COUNT } from "@/lib/constants";
import type { CustomerState } from "@/lib/types";

describe("createRng", () => {
  it("produces deterministic output with same seed", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    const seq1 = Array.from({ length: 100 }, () => rng1());
    const seq2 = Array.from({ length: 100 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it("produces different output with different seeds", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(99);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it("produces values in [0, 1) range", () => {
    const rng = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});

describe("generateTransaction", () => {
  it("returns a valid RawTransaction", () => {
    const rng = createRng(42);
    const states = new Map<string, CustomerState>();
    const txn = generateTransaction(rng, new Date("2026-01-15T14:00:00Z"), states);

    expect(txn.id).toMatch(/^TXN-/);
    expect(txn.customerId).toMatch(/^CUS-\d{4}$/);
    expect(txn.amount).toBeGreaterThan(0);
    expect(["credit_card", "debit_card", "spei", "oxxo", "wallet"]).toContain(txn.paymentMethod);
    expect(["approved", "declined", "chargeback", "pending", "refunded"]).toContain(txn.status);
    expect(txn.city).toBeTruthy();
    expect(txn.state).toBeTruthy();
    expect(new Date(txn.timestamp).getTime()).not.toBeNaN();
  });

  it("updates customer state after generating a transaction", () => {
    const rng = createRng(42);
    const states = new Map<string, CustomerState>();
    const txn = generateTransaction(rng, new Date("2026-01-15T14:00:00Z"), states);

    const state = states.get(txn.customerId);
    expect(state).toBeDefined();
    expect(state!.txnCount).toBe(1);
    expect(state!.totalAmount).toBe(txn.amount);
    expect(state!.lastCity).toBe(txn.city);
  });

  it("fraud ring customers always use credit cards and transact 0-5 AM", () => {
    const rng = createRng(42);
    const states = new Map<string, CustomerState>();
    const fraudTxns: ReturnType<typeof generateTransaction>[] = [];

    // Generate many transactions to get some fraud ring hits
    for (let i = 0; i < 2000; i++) {
      const txn = generateTransaction(rng, new Date("2026-01-15T14:00:00Z"), states);
      const num = parseInt(txn.customerId.replace("CUS-", ""), 10);
      if (num >= 1 && num <= FRAUD_RING_SIZE) {
        fraudTxns.push(txn);
      }
    }

    expect(fraudTxns.length).toBeGreaterThan(0);
    for (const txn of fraudTxns) {
      expect(txn.paymentMethod).toBe("credit_card");
      const hour = new Date(txn.timestamp).getHours();
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThanOrEqual(5);
    }
  });

  it("fraud ring customers have amounts between 2000-8000 MXN", () => {
    const rng = createRng(42);
    const states = new Map<string, CustomerState>();

    for (let i = 0; i < 2000; i++) {
      const txn = generateTransaction(rng, new Date("2026-01-15T14:00:00Z"), states);
      const num = parseInt(txn.customerId.replace("CUS-", ""), 10);
      if (num >= 1 && num <= FRAUD_RING_SIZE) {
        expect(txn.amount).toBeGreaterThanOrEqual(2000);
        expect(txn.amount).toBeLessThanOrEqual(8000);
      }
    }
  });
});

describe("generateHistoricalDataset", () => {
  // Generate once, reuse across tests
  const { transactions, customerStates } = generateHistoricalDataset(5500, 42);

  it("generates the expected number of transactions (base + velocity bursts)", () => {
    expect(transactions.length).toBeGreaterThanOrEqual(5500);
    // Velocity bursts add extra, but total should be reasonable
    expect(transactions.length).toBeLessThan(7000);
  });

  it("transactions are sorted chronologically", () => {
    for (let i = 1; i < transactions.length; i++) {
      expect(new Date(transactions[i].timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(transactions[i - 1].timestamp).getTime());
    }
  });

  it("has correct number of unique customers (close to CUSTOMER_COUNT)", () => {
    const uniqueCustomers = new Set(transactions.map((t) => t.customerId));
    // Not all customers may appear, but should be a good portion
    expect(uniqueCustomers.size).toBeGreaterThan(CUSTOMER_COUNT * 0.8);
    expect(uniqueCustomers.size).toBeLessThanOrEqual(CUSTOMER_COUNT);
  });

  it("spans approximately 45 days", () => {
    const timestamps = transactions.map((t) => new Date(t.timestamp).getTime());
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const daySpan = (maxTs - minTs) / (24 * 60 * 60 * 1000);
    expect(daySpan).toBeGreaterThan(40);
    expect(daySpan).toBeLessThanOrEqual(46);
  });

  it("has all 5 payment methods represented", () => {
    const methods = new Set(transactions.map((t) => t.paymentMethod));
    expect(methods).toContain("credit_card");
    expect(methods).toContain("debit_card");
    expect(methods).toContain("spei");
    expect(methods).toContain("oxxo");
    expect(methods).toContain("wallet");
  });

  it("has all 5 transaction statuses represented", () => {
    const statuses = new Set(transactions.map((t) => t.status));
    expect(statuses).toContain("approved");
    expect(statuses).toContain("declined");
    expect(statuses).toContain("chargeback");
    expect(statuses).toContain("pending");
    expect(statuses).toContain("refunded");
  });

  it("has chargeback rate around 2-4%", () => {
    const chargebacks = transactions.filter((t) => t.status === "chargeback").length;
    const rate = chargebacks / transactions.length;
    expect(rate).toBeGreaterThan(0.01);
    expect(rate).toBeLessThan(0.05);
  });

  it("has credit cards as the most common payment method (~45%)", () => {
    const ccCount = transactions.filter((t) => t.paymentMethod === "credit_card").length;
    const ccRate = ccCount / transactions.length;
    expect(ccRate).toBeGreaterThan(0.35);
    expect(ccRate).toBeLessThan(0.55);
  });

  it("has approved as the dominant status (~84%)", () => {
    const approvedCount = transactions.filter((t) => t.status === "approved").length;
    const rate = approvedCount / transactions.length;
    expect(rate).toBeGreaterThan(0.75);
    expect(rate).toBeLessThan(0.92);
  });

  it("velocity abuser customers exist in the dataset", () => {
    const abuserIds = new Set<string>();
    for (let i = FRAUD_RING_SIZE + 1; i <= FRAUD_RING_SIZE + VELOCITY_ABUSER_COUNT; i++) {
      abuserIds.add(`CUS-${String(i).padStart(4, "0")}`);
    }
    const abuserTxns = transactions.filter((t) => abuserIds.has(t.customerId));
    expect(abuserTxns.length).toBeGreaterThan(VELOCITY_ABUSER_COUNT * 5);
  });

  it("has geographic diversity across 10 states", () => {
    const states = new Set(transactions.map((t) => t.state));
    expect(states.size).toBeGreaterThanOrEqual(10);
  });

  it("is deterministic — same seed produces identical output", () => {
    const { transactions: txns2 } = generateHistoricalDataset(100, 42);
    const { transactions: txns3 } = generateHistoricalDataset(100, 42);
    expect(txns2.map((t) => t.amount)).toEqual(txns3.map((t) => t.amount));
    expect(txns2.map((t) => t.customerId)).toEqual(txns3.map((t) => t.customerId));
  });
});
