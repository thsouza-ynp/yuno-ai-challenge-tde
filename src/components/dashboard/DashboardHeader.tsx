"use client";

interface DashboardHeaderProps {
  isStreaming: boolean;
  onToggle: () => void;
  txnCount: number;
}

export function DashboardHeader({ isStreaming, onToggle, txnCount }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Mercado Luna</h1>
        <p className="text-sm text-[var(--text-secondary)]">Transaction Anomaly Detector</p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--text-secondary)]">
          {txnCount.toLocaleString()} transactions
        </span>

        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: isStreaming ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)",
            color: isStreaming ? "#10b981" : "#9ca3af",
            border: `1px solid ${isStreaming ? "#10b981" : "#4b5563"}`,
          }}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${isStreaming ? "pulse-live" : ""}`}
            style={{ background: isStreaming ? "#10b981" : "#6b7280" }}
          />
          {isStreaming ? "Live" : "Paused"}
        </button>
      </div>
    </div>
  );
}
