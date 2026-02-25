"use client";

import { useState } from "react";
import type { HeatmapCell } from "@/lib/types";
import { DAY_LABELS, COLORS } from "@/lib/constants";

interface TemporalHeatmapProps {
  data: HeatmapCell[];
}

function interpolateColor(low: string, high: string, t: number): string {
  const parse = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };
  const [r1, g1, b1] = parse(low);
  const [r2, g2, b2] = parse(high);
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(r1 + (r2 - r1) * c);
  const g = Math.round(g1 + (g2 - g1) * c);
  const b = Math.round(b1 + (b2 - b1) * c);
  return `rgb(${r},${g},${b})`;
}

export function TemporalHeatmap({ data }: TemporalHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    cell: HeatmapCell;
  } | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No data</p>;
  }

  const maxRate = Math.max(...data.map((d) => d.chargebackRate), 1);
  const cellW = 24;
  const cellH = 24;
  const labelW = 32;
  const labelH = 18;
  const svgW = labelW + 24 * cellW + 4;
  const svgH = labelH + 7 * cellH + 4;

  return (
    <div className="relative overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full"
        style={{ minWidth: 500 }}
      >
        {/* Hour labels */}
        {Array.from({ length: 24 }, (_, h) => (
          <text
            key={`h-${h}`}
            x={labelW + h * cellW + cellW / 2}
            y={labelH - 4}
            textAnchor="middle"
            fontSize={8}
            fill={COLORS.chartText}
          >
            {h}
          </text>
        ))}

        {/* Day labels */}
        {DAY_LABELS.map((d, i) => (
          <text
            key={`d-${i}`}
            x={labelW - 4}
            y={labelH + i * cellH + cellH / 2 + 3}
            textAnchor="end"
            fontSize={8}
            fill={COLORS.chartText}
          >
            {d}
          </text>
        ))}

        {/* Cells */}
        {data.map((cell) => {
          const x = labelW + cell.hour * cellW;
          const y = labelH + cell.dayOfWeek * cellH;
          const t = maxRate > 0 ? cell.chargebackRate / maxRate : 0;
          return (
            <rect
              key={`${cell.dayOfWeek}-${cell.hour}`}
              x={x}
              y={y}
              width={cellW - 1}
              height={cellH - 1}
              rx={3}
              fill={interpolateColor(COLORS.heatmapLow, COLORS.heatmapHigh, t)}
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const rect = (e.target as SVGRectElement).getBoundingClientRect();
                setTooltip({ x: rect.left + rect.width / 2, y: rect.top, cell });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 rounded-lg text-xs pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 48,
            transform: "translateX(-50%)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
          }}
        >
          {DAY_LABELS[tooltip.cell.dayOfWeek]} {tooltip.cell.hour}:00 &mdash;{" "}
          {tooltip.cell.count} txns, {tooltip.cell.chargebackCount} chargebacks (
          {tooltip.cell.chargebackRate.toFixed(1)}%)
        </div>
      )}
    </div>
  );
}
