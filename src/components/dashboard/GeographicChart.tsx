"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { GeoData } from "@/lib/types";
import { COLORS } from "@/lib/constants";

interface GeographicChartProps {
  data: GeoData[];
}

function rateToColor(rate: number): string {
  const t = Math.min(rate / 8, 1);
  const r = Math.round(99 + (239 - 99) * t);
  const g = Math.round(102 + (68 - 102) * t);
  const b = Math.round(241 + (68 - 241) * t);
  return `rgb(${r},${g},${b})`;
}

export function GeographicChart({ data }: GeographicChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chartGrid} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: COLORS.chartText, fontSize: 11 }}
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
        />
        <YAxis
          type="category"
          dataKey="state"
          width={100}
          tick={{ fill: COLORS.chartText, fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 12,
          }}
          formatter={(value: number | undefined, name: string | undefined) => {
            const v = value ?? 0;
            if (name === "chargebackRate") return [`${v.toFixed(2)}%`, "Chargeback Rate"];
            return [v, name ?? ""];
          }}
          labelFormatter={(label) => {
            const l = String(label);
            const d = data.find((g) => g.state === l);
            return d ? `${l} (${d.total} txns)` : l;
          }}
        />
        <Bar dataKey="chargebackRate" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={rateToColor(entry.chargebackRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
