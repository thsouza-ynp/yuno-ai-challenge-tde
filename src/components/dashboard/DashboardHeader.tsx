"use client";

interface DashboardHeaderProps {
  isStreaming: boolean;
  onToggle: () => void;
  txnCount: number;
}

export function DashboardHeader({ isStreaming, onToggle, txnCount }: DashboardHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        {txnCount.toLocaleString()} transactions
      </span>

      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
        style={{
          background: isStreaming ? "var(--success-light)" : "#f1f5f9",
          color: isStreaming ? "#047857" : "#64748b",
        }}
      >
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${isStreaming ? "pulse-live" : ""}`}
          style={{ background: isStreaming ? "#10b981" : "#94a3b8" }}
        />
        {isStreaming ? "Live" : "Paused"}
      </button>
    </div>
  );
}
