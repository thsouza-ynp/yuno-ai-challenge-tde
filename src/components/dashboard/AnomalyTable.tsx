"use client";

import { useState, useMemo } from "react";
import type { EnrichedTransaction } from "@/lib/types";
import { METHOD_LABELS, METHOD_COLORS, COLORS } from "@/lib/constants";

interface AnomalyTableProps {
  transactions: EnrichedTransaction[];
}

const PAGE_SIZE = 15;

type SortKey = "anomalyScore" | "amount" | "timestamp";

function ScoreBar({ score }: { score: number }) {
  const color = score < 30 ? COLORS.success : score < 60 ? COLORS.warning : COLORS.danger;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-gray-700 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function FlagBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="badge mr-1 mb-1"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}

export function AnomalyTable({ transactions }: AnomalyTableProps) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("anomalyScore");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...transactions];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [transactions, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
    setPage(0);
  };

  if (transactions.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No flagged transactions</p>;
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " \u25B2" : " \u25BC") : "";

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--text-secondary)] border-b border-[var(--border-color)]">
              <th
                className="py-2 px-2 text-left cursor-pointer hover:text-white"
                onClick={() => handleSort("timestamp")}
              >
                Time{sortIndicator("timestamp")}
              </th>
              <th className="py-2 px-2 text-left">Customer</th>
              <th
                className="py-2 px-2 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("amount")}
              >
                Amount{sortIndicator("amount")}
              </th>
              <th className="py-2 px-2 text-left">Method</th>
              <th className="py-2 px-2 text-left">Location</th>
              <th
                className="py-2 px-2 text-left cursor-pointer hover:text-white"
                onClick={() => handleSort("anomalyScore")}
              >
                Score{sortIndicator("anomalyScore")}
              </th>
              <th className="py-2 px-2 text-left">Flags</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((t) => (
              <tr
                key={t.id}
                className="border-b border-[var(--border-color)] border-opacity-30 hover:bg-white/5"
              >
                <td className="py-2 px-2 whitespace-nowrap">
                  {new Date(t.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-2 px-2 font-mono">{t.customerId.slice(0, 10)}</td>
                <td className="py-2 px-2 text-right font-mono">
                  ${t.amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </td>
                <td className="py-2 px-2">
                  <span
                    className="badge"
                    style={{
                      background: `${METHOD_COLORS[t.paymentMethod]}20`,
                      color: METHOD_COLORS[t.paymentMethod],
                    }}
                  >
                    {METHOD_LABELS[t.paymentMethod]}
                  </span>
                </td>
                <td className="py-2 px-2">
                  {t.city}, {t.state}
                </td>
                <td className="py-2 px-2">
                  <ScoreBar score={t.anomalyScore} />
                </td>
                <td className="py-2 px-2">
                  <div className="flex flex-wrap">
                    {t.isUnusualHour && <FlagBadge label="Late Night" color={COLORS.danger} />}
                    {t.isHighAmount && <FlagBadge label="High Amount" color={COLORS.warning} />}
                    {t.isHighVelocity && <FlagBadge label="High Velocity" color="#f97316" />}
                    {t.isGeoAnomaly && <FlagBadge label="Geo Jump" color="#8b5cf6" />}
                    {t.isRapidFire && <FlagBadge label="Rapid Fire" color="#ec4899" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-xs text-[var(--text-secondary)]">
        <span>
          {sorted.length} flagged transactions &mdash; Page {page + 1} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] disabled:opacity-30"
          >
            Prev
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
