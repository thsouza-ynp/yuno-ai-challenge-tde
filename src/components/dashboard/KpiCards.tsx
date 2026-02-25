"use client";

import type { KpiSummary } from "@/lib/types";

interface KpiCardsProps {
  kpi: KpiSummary;
}

export function KpiCards({ kpi }: KpiCardsProps) {
  const cards = [
    {
      label: "Total Transactions",
      value: kpi.totalTransactions.toLocaleString(),
      color: "#6366f1",
    },
    {
      label: "Chargeback Rate",
      value: `${kpi.chargebackRate.toFixed(2)}%`,
      color: kpi.chargebackRate > 1.5 ? "#ef4444" : "#10b981",
    },
    {
      label: "Flagged Suspicious",
      value: `${kpi.flaggedPercent.toFixed(1)}%`,
      color: "#f59e0b",
    },
    {
      label: "Avg Transaction",
      value: `$${kpi.avgAmount.toFixed(0)} MXN`,
      color: "#3b82f6",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            {c.label}
          </p>
          <p className="text-2xl font-bold" style={{ color: c.color }}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
