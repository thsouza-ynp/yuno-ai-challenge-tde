#!/usr/bin/env tsx
// ── Standalone CSV Generator for Mercado Luna ──

import * as fs from "fs";
import * as path from "path";
import { generateHistoricalDataset } from "@/lib/generator";
import { enrichBatch } from "@/lib/enrichment";
import type { EnrichedTransaction } from "@/lib/types";

const OUTPUT_DIR = path.resolve(__dirname, "..", "public", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "transactions.csv");

// ── CSV helpers ──
function escapeCSV(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSVRow(txn: EnrichedTransaction): string {
  return [
    txn.id,
    txn.customerId,
    txn.amount,
    txn.paymentMethod,
    txn.status,
    txn.city,
    txn.state,
    txn.timestamp,
    txn.hour,
    txn.dayOfWeek,
    txn.timeSincePrevTxn ?? "",
    txn.amountPercentile,
    txn.customerAvgAmount.toFixed(2),
    txn.velocity24h,
    txn.isUnusualHour,
    txn.isHighAmount,
    txn.isHighVelocity,
    txn.isGeoAnomaly,
    txn.isRapidFire,
    txn.isSuspicious,
    txn.anomalyScore,
    escapeCSV(txn.scoreSignals.join("; ")),
  ].join(",");
}

const CSV_HEADER = [
  "id",
  "customerId",
  "amount",
  "paymentMethod",
  "status",
  "city",
  "state",
  "timestamp",
  "hour",
  "dayOfWeek",
  "timeSincePrevTxn",
  "amountPercentile",
  "customerAvgAmount",
  "velocity24h",
  "isUnusualHour",
  "isHighAmount",
  "isHighVelocity",
  "isGeoAnomaly",
  "isRapidFire",
  "isSuspicious",
  "anomalyScore",
  "scoreSignals",
].join(",");

// ── Main ──
function main() {
  console.log("Generating historical dataset...");
  const t0 = performance.now();

  const { transactions: raw } = generateHistoricalDataset();
  console.log(`  Generated ${raw.length} raw transactions in ${((performance.now() - t0) / 1000).toFixed(2)}s`);

  console.log("Enriching transactions...");
  const t1 = performance.now();
  const enriched = enrichBatch(raw);
  console.log(`  Enriched ${enriched.length} transactions in ${((performance.now() - t1) / 1000).toFixed(2)}s`);

  // Write CSV
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const csvContent = [CSV_HEADER, ...enriched.map(toCSVRow)].join("\n");
  fs.writeFileSync(OUTPUT_FILE, csvContent, "utf-8");
  console.log(`\nCSV written to: ${OUTPUT_FILE}`);
  console.log(`  File size: ${(Buffer.byteLength(csvContent) / 1024).toFixed(1)} KB`);

  // ── Summary Stats ──
  console.log("\n=== Dataset Summary ===");
  console.log(`Total transactions: ${enriched.length}`);

  const uniqueCustomers = new Set(enriched.map((t) => t.customerId)).size;
  console.log(`Unique customers: ${uniqueCustomers}`);

  const dateRange = {
    min: enriched[0].timestamp,
    max: enriched[enriched.length - 1].timestamp,
  };
  console.log(`Date range: ${dateRange.min.slice(0, 10)} to ${dateRange.max.slice(0, 10)}`);

  // Status breakdown
  const statusCounts = new Map<string, number>();
  for (const t of enriched) {
    statusCounts.set(t.status, (statusCounts.get(t.status) || 0) + 1);
  }
  console.log("\nStatus distribution:");
  for (const [status, count] of statusCounts) {
    console.log(`  ${status}: ${count} (${((count / enriched.length) * 100).toFixed(1)}%)`);
  }

  // Payment method breakdown
  const methodCounts = new Map<string, number>();
  for (const t of enriched) {
    methodCounts.set(t.paymentMethod, (methodCounts.get(t.paymentMethod) || 0) + 1);
  }
  console.log("\nPayment method distribution:");
  for (const [method, count] of methodCounts) {
    console.log(`  ${method}: ${count} (${((count / enriched.length) * 100).toFixed(1)}%)`);
  }

  // Anomaly flags
  const flagged = enriched.filter((t) => t.isSuspicious).length;
  const chargebacks = enriched.filter((t) => t.status === "chargeback").length;
  console.log(`\nFlagged suspicious: ${flagged} (${((flagged / enriched.length) * 100).toFixed(1)}%)`);
  console.log(`Chargebacks: ${chargebacks} (${((chargebacks / enriched.length) * 100).toFixed(1)}%)`);

  // Score distribution
  const scoreRanges = [
    { label: "0-20 (Low)", min: 0, max: 20 },
    { label: "21-50 (Medium)", min: 21, max: 50 },
    { label: "51-75 (High)", min: 51, max: 75 },
    { label: "76-100 (Critical)", min: 76, max: 100 },
  ];
  console.log("\nAnomaly score distribution:");
  for (const range of scoreRanges) {
    const count = enriched.filter(
      (t) => t.anomalyScore >= range.min && t.anomalyScore <= range.max,
    ).length;
    console.log(`  ${range.label}: ${count}`);
  }

  // Top cities by chargeback rate
  const cityStats = new Map<string, { total: number; cb: number }>();
  for (const t of enriched) {
    const s = cityStats.get(t.city) || { total: 0, cb: 0 };
    s.total++;
    if (t.status === "chargeback") s.cb++;
    cityStats.set(t.city, s);
  }
  console.log("\nChargeback rate by city:");
  const citySorted = [...cityStats.entries()]
    .map(([city, s]) => ({ city, rate: s.cb / s.total, total: s.total, cb: s.cb }))
    .sort((a, b) => b.rate - a.rate);
  for (const c of citySorted) {
    console.log(`  ${c.city}: ${(c.rate * 100).toFixed(1)}% (${c.cb}/${c.total})`);
  }

  console.log("\nDone!");
}

main();
