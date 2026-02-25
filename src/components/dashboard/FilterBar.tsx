"use client";

import type { FilterState, PaymentMethod, TransactionStatus } from "@/lib/types";
import {
  PAYMENT_METHODS,
  METHOD_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  LOCATIONS,
} from "@/lib/constants";

interface FilterBarProps {
  filters: FilterState;
  onDateRange: (r: [string, string] | null) => void;
  onToggleMethod: (m: PaymentMethod) => void;
  onToggleStatus: (s: TransactionStatus) => void;
  onToggleState: (s: string) => void;
  onReset: () => void;
}

function ToggleButton({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded text-xs font-medium transition-all"
      style={{
        background: active ? `${color}25` : "rgba(55,65,81,0.3)",
        color: active ? color : "#6b7280",
        border: `1px solid ${active ? color : "transparent"}`,
      }}
    >
      {label}
    </button>
  );
}

export function FilterBar({
  filters,
  onDateRange,
  onToggleMethod,
  onToggleStatus,
  onToggleState,
  onReset,
}: FilterBarProps) {
  const statuses: TransactionStatus[] = ["approved", "declined", "chargeback", "pending", "refunded"];
  const uniqueStates = [...new Set(LOCATIONS.map((l) => l.state))];

  const hasActiveFilters =
    filters.dateRange !== null ||
    filters.paymentMethods.length > 0 ||
    filters.statuses.length > 0 ||
    filters.states.length > 0;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Filters
        </span>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)]">Date:</span>
          <input
            type="date"
            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
            value={filters.dateRange?.[0]?.slice(0, 10) ?? ""}
            onChange={(e) => {
              const start = e.target.value
                ? `${e.target.value}T00:00:00`
                : null;
              if (start) {
                const end = filters.dateRange?.[1] ?? `${e.target.value}T23:59:59`;
                onDateRange([start, end]);
              } else {
                onDateRange(null);
              }
            }}
          />
          <span className="text-xs text-[var(--text-secondary)]">to</span>
          <input
            type="date"
            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
            value={filters.dateRange?.[1]?.slice(0, 10) ?? ""}
            onChange={(e) => {
              const end = e.target.value
                ? `${e.target.value}T23:59:59`
                : null;
              if (end) {
                const start = filters.dateRange?.[0] ?? `${e.target.value}T00:00:00`;
                onDateRange([start, end]);
              } else {
                onDateRange(null);
              }
            }}
          />
        </div>

        {/* Payment Methods */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-[var(--text-secondary)] mr-1">Method:</span>
          {PAYMENT_METHODS.map((pm) => (
            <ToggleButton
              key={pm.method}
              active={filters.paymentMethods.includes(pm.method)}
              color={METHOD_COLORS[pm.method]}
              label={pm.label}
              onClick={() => onToggleMethod(pm.method)}
            />
          ))}
        </div>

        {/* Statuses */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-[var(--text-secondary)] mr-1">Status:</span>
          {statuses.map((s) => (
            <ToggleButton
              key={s}
              active={filters.statuses.includes(s)}
              color={STATUS_COLORS[s]}
              label={STATUS_LABELS[s]}
              onClick={() => onToggleStatus(s)}
            />
          ))}
        </div>

        {/* States */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-[var(--text-secondary)] mr-1">Region:</span>
          {uniqueStates.map((s) => (
            <ToggleButton
              key={s}
              active={filters.states.includes(s)}
              color="#6366f1"
              label={s}
              onClick={() => onToggleState(s)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
