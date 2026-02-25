"use client";

import { useState, useMemo } from "react";
import { useTransactionStream } from "@/hooks/useTransactionStream";
import { METHOD_LABELS, METHOD_COLORS, STATUS_LABELS } from "@/lib/constants";
import type { EnrichedTransaction, PaymentMethod, TransactionStatus } from "@/lib/types";

const PAGE_SIZE = 25;

function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span className={`badge status-${status}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function CustomerDetail({
  transaction,
  allTransactions,
  onClose,
}: {
  transaction: EnrichedTransaction;
  allTransactions: EnrichedTransaction[];
  onClose: () => void;
}) {
  const customerTxns = useMemo(
    () =>
      allTransactions
        .filter((t) => t.customerId === transaction.customerId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [allTransactions, transaction.customerId]
  );

  const totalSpent = customerTxns.reduce((s, t) => s + t.amount, 0);
  const chargebacks = customerTxns.filter((t) => t.status === "chargeback").length;
  const avgAmount = totalSpent / customerTxns.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
            {transaction.customerId}
          </h3>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {customerTxns.length} transactions &bull; Since{" "}
            {new Date(customerTxns[customerTxns.length - 1].timestamp).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[#f1f5f9]"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Customer KPIs - 2x2 grid to fit narrow panel */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Total Spent", value: `$${totalSpent.toLocaleString()}` },
          { label: "Transactions", value: customerTxns.length.toString() },
          { label: "Avg Amount", value: `$${avgAmount.toFixed(0)}` },
          { label: "Chargebacks", value: chargebacks.toString(), danger: chargebacks > 0 },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-md py-2.5 px-3"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {kpi.label}
            </div>
            <div
              className="text-[16px] font-bold mt-0.5"
              style={{ color: kpi.danger ? "var(--destructive)" : "var(--text-primary)" }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Selected transaction detail */}
      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
          Selected Transaction
        </h4>
        <div className="rounded-md p-3" style={{ background: "var(--primary-faint)", border: "1px solid #c7d2fe" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[11px]" style={{ color: "var(--primary)" }}>{transaction.id.slice(0, 16)}</span>
            <StatusBadge status={transaction.status} />
          </div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            ${transaction.amount.toLocaleString()} MXN
          </div>
          <div className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>
            {transaction.city}, {transaction.state} &bull; {METHOD_LABELS[transaction.paymentMethod]}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {new Date(transaction.timestamp).toLocaleString("en-US", {
              month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </div>
          {transaction.isSuspicious && (
            <div className="flex flex-wrap gap-1 mt-2">
              {transaction.isUnusualHour && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#1e1b4b", color: "#a5b4fc" }}>Late Night</span>}
              {transaction.isHighAmount && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "var(--destructive-light)", color: "#991b1b" }}>High Amount</span>}
              {transaction.isHighVelocity && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "var(--warning-light)", color: "#92400e" }}>High Velocity</span>}
              {transaction.isGeoAnomaly && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#dbeafe", color: "#1e40af" }}>Geo Anomaly</span>}
              {transaction.isRapidFire && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#fce7f3", color: "#9d174d" }}>Rapid Fire</span>}
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                background: transaction.anomalyScore >= 70 ? "var(--destructive-light)" : "var(--warning-light)",
                color: transaction.anomalyScore >= 70 ? "var(--destructive)" : "#92400e",
              }}>
                Score: {transaction.anomalyScore}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Customer transaction history */}
      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
          All Transactions ({customerTxns.length})
        </h4>
        <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
          {customerTxns.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11.5px] transition-colors hover:bg-[#f8fafc]"
              style={{
                borderLeft: `3px solid ${t.status === "chargeback" ? "var(--destructive)" : t.isSuspicious ? "var(--warning)" : "transparent"}`,
                background: t.id === transaction.id ? "var(--primary-faint)" : undefined,
              }}
            >
              <span className="tabular-nums shrink-0 w-24" style={{ color: "var(--text-muted)" }}>
                {new Date(t.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="font-semibold tabular-nums shrink-0 w-16 text-right" style={{ color: "var(--text-primary)" }}>
                ${t.amount.toLocaleString()}
              </span>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TransactionExplorer() {
  const { transactions } = useTransactionStream();
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "">("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "">("");
  const [page, setPage] = useState(0);
  const [selectedTxn, setSelectedTxn] = useState<EnrichedTransaction | null>(null);

  const filtered = useMemo(() => {
    let result = transactions;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.customerId.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          t.state.toLowerCase().includes(q)
      );
    }
    if (methodFilter) result = result.filter((t) => t.paymentMethod === methodFilter);
    if (statusFilter) result = result.filter((t) => t.status === statusFilter);
    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [transactions, search, methodFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-8 h-14 bg-white border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          Dashboard &rsaquo; <strong style={{ color: "var(--text-primary)" }}>Transaction Explorer</strong>
        </span>
      </header>

      <div className="p-6 max-w-[1400px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Transaction Explorer
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: "var(--text-secondary)" }}>
            Search and inspect transactions, customers, and anomaly details
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[280px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2"
              width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#94a3b8" strokeWidth="1.5"
            >
              <circle cx="8" cy="8" r="5.5" /><path d="M12.5 12.5L16 16" />
            </svg>
            <input
              type="text"
              placeholder="Search by transaction ID, customer ID, city, or state..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-[13px] outline-none transition-colors"
              style={{
                background: "white",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value as PaymentMethod | ""); setPage(0); }}
            className="px-3 py-2.5 rounded-lg text-[13px] outline-none"
            style={{ background: "white", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
          >
            <option value="">All Methods</option>
            {(["credit_card", "debit_card", "spei", "oxxo", "wallet"] as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>{METHOD_LABELS[m]}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as TransactionStatus | ""); setPage(0); }}
            className="px-3 py-2.5 rounded-lg text-[13px] outline-none"
            style={{ background: "white", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
          >
            <option value="">All Statuses</option>
            {(["approved", "declined", "chargeback", "pending", "refunded"] as TransactionStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {filtered.length.toLocaleString()} results
          </span>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Time", "Transaction ID", "Customer", "Amount", "Method", "Status", "Location", "Score"].map((h) => (
                  <th
                    key={h}
                    className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wider border-b"
                    style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((t) => (
                <tr
                  key={t.id}
                  className="border-b hover:bg-[#fafbfc] transition-colors cursor-pointer"
                  style={{
                    borderColor: "#f1f5f9",
                    background: selectedTxn?.id === t.id ? "var(--primary-faint)" : undefined,
                  }}
                  onClick={() => setSelectedTxn(t)}
                >
                  <td className="py-3 px-4 text-[12px] tabular-nums whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {new Date(t.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[12px]" style={{ color: "var(--primary)" }}>
                      {t.id.slice(0, 12)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    {t.customerId.slice(0, 10)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    ${t.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="badge" style={{ background: `${METHOD_COLORS[t.paymentMethod]}15`, color: METHOD_COLORS[t.paymentMethod] }}>
                      {METHOD_LABELS[t.paymentMethod]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="py-3 px-4 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
                    {t.city}
                  </td>
                  <td className="py-3 px-4">
                    {t.isSuspicious ? (
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold"
                        style={{
                          background: t.anomalyScore >= 70 ? "var(--destructive-light)" : t.anomalyScore >= 40 ? "var(--warning-light)" : "var(--success-light)",
                          color: t.anomalyScore >= 70 ? "var(--destructive)" : t.anomalyScore >= 40 ? "#B45309" : "#047857",
                        }}
                      >
                        {t.anomalyScore}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div
            className="flex items-center justify-between px-4 py-3 text-[12px] border-t"
            style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          >
            <span>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="w-8 h-8 rounded-md flex items-center justify-center disabled:opacity-30"
                style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page < 3 ? i : page - 2 + i;
                if (p >= totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-medium"
                    style={{
                      background: p === page ? "var(--primary)" : "transparent",
                      color: p === page ? "white" : "var(--text-secondary)",
                      border: p === page ? "none" : "1px solid var(--border-color)",
                    }}
                  >
                    {p + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 rounded-md flex items-center justify-center disabled:opacity-30"
                style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail slide-over panel */}
      {selectedTxn && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.15)" }}
            onClick={() => setSelectedTxn(null)}
          />
          {/* Panel */}
          <div
            className="fixed top-0 right-0 bottom-0 z-50 bg-white overflow-y-auto shadow-2xl"
            style={{ width: 420, borderLeft: "1px solid var(--border-color)" }}
          >
            <div className="p-5">
              <CustomerDetail
                transaction={selectedTxn}
                allTransactions={transactions}
                onClose={() => setSelectedTxn(null)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
