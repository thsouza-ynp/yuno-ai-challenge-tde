"use client";

import type { EnrichedTransaction } from "@/lib/types";
import { METHOD_LABELS, METHOD_COLORS, STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";

interface TransactionFeedProps {
  transactions: EnrichedTransaction[];
}

export function TransactionFeed({ transactions }: TransactionFeedProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No transactions yet</p>;
  }

  return (
    <div className="space-y-1 max-h-[500px] overflow-y-auto">
      {transactions.map((t, i) => {
        const isChargeback = t.status === "chargeback";
        const isSuspicious = t.isSuspicious && !isChargeback;
        const borderColor = isChargeback
          ? "#ef4444"
          : isSuspicious
            ? "#f59e0b"
            : "transparent";

        return (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${i === 0 ? "slide-in" : ""}`}
            style={{
              background: "rgba(255,255,255,0.03)",
              borderLeft: `3px solid ${borderColor}`,
            }}
          >
            <span className="text-[var(--text-secondary)] whitespace-nowrap w-14 shrink-0">
              {new Date(t.timestamp).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="font-mono text-white w-20 text-right shrink-0">
              ${t.amount.toLocaleString()}
            </span>
            <span
              className="badge shrink-0"
              style={{
                background: `${METHOD_COLORS[t.paymentMethod]}20`,
                color: METHOD_COLORS[t.paymentMethod],
              }}
            >
              {METHOD_LABELS[t.paymentMethod]}
            </span>
            <span
              className="badge shrink-0"
              style={{
                background: `${STATUS_COLORS[t.status]}20`,
                color: STATUS_COLORS[t.status],
              }}
            >
              {STATUS_LABELS[t.status]}
            </span>
            <span className="text-[var(--text-secondary)] truncate">{t.city}</span>
          </div>
        );
      })}
    </div>
  );
}
