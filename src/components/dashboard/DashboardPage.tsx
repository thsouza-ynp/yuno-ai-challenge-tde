"use client";

import { useMemo } from "react";
import { useTransactionStream } from "@/hooks/useTransactionStream";
import { useTransactionFilters } from "@/hooks/useTransactionFilters";
import {
  computeKpi,
  computeHeatmapData,
  computeGeoData,
  computePaymentRisk,
  computeScoreDistribution,
} from "@/lib/chart-utils";
import { Card } from "@/components/ui/Card";
import { DashboardHeader } from "./DashboardHeader";
import { KpiCards } from "./KpiCards";
import { FilterBar } from "./FilterBar";
import { TemporalHeatmap } from "./TemporalHeatmap";
import { GeographicChart } from "./GeographicChart";
import { PaymentMethodRisk } from "./PaymentMethodRisk";
import { AnomalyScoreChart } from "./AnomalyScoreChart";
import { AnomalyTable } from "./AnomalyTable";
import { AiAnalyst } from "./AiAnalyst";
import type { DashboardContext } from "@/lib/types";

export function DashboardPage() {
  const { transactions, isStreaming, toggleStreaming } = useTransactionStream();
  const {
    filters,
    setDateRange,
    togglePaymentMethod,
    toggleStatus,
    toggleState,
    resetFilters,
    applyFilters,
  } = useTransactionFilters();

  const filtered = useMemo(() => applyFilters(transactions), [applyFilters, transactions]);
  const kpi = useMemo(() => computeKpi(filtered), [filtered]);
  const heatmap = useMemo(() => computeHeatmapData(filtered), [filtered]);
  const geo = useMemo(() => computeGeoData(filtered), [filtered]);
  const risk = useMemo(() => computePaymentRisk(filtered), [filtered]);
  const scores = useMemo(() => computeScoreDistribution(filtered), [filtered]);

  const suspicious = useMemo(
    () =>
      filtered
        .filter((t) => t.isSuspicious)
        .sort((a, b) => b.anomalyScore - a.anomalyScore),
    [filtered]
  );

  const dashContext: DashboardContext = useMemo(
    () => ({
      kpi,
      topChargebackStates: geo.slice(0, 3),
      riskByMethod: risk,
      peakChargebackHours: heatmap
        .filter((c) => c.chargebackRate > 5)
        .map((c) => c.hour),
      flaggedCount: suspicious.length,
      totalCustomers: new Set(filtered.map((t) => t.customerId)).size,
    }),
    [kpi, geo, risk, heatmap, suspicious, filtered]
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-[var(--bg-primary)] border-b" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Analytics</span>
            <span>/</span>
            <span style={{ color: "var(--text-primary)" }}>Overview</span>
          </div>
          <DashboardHeader
            isStreaming={isStreaming}
            onToggle={toggleStreaming}
            txnCount={transactions.length}
          />
        </div>
      </div>

      <FilterBar
        filters={filters}
        onDateRange={setDateRange}
        onToggleMethod={togglePaymentMethod}
        onToggleStatus={toggleStatus}
        onToggleState={toggleState}
        onReset={resetFilters}
      />

      <KpiCards kpi={kpi} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Temporal Pattern — Chargebacks by Hour & Day">
          <TemporalHeatmap data={heatmap} />
        </Card>
        <Card title="Geographic Concentration — Chargeback Rate by State">
          <GeographicChart data={geo} />
        </Card>
        <Card title="Payment Method Risk — Chargeback Rate">
          <PaymentMethodRisk data={risk} />
        </Card>
        <Card title="Anomaly Score Distribution">
          <AnomalyScoreChart data={scores} />
        </Card>
      </div>

      <Card title="Flagged Transactions">
        <AnomalyTable transactions={suspicious} />
      </Card>

      <AiAnalyst context={dashContext} />
    </div>
  );
}
