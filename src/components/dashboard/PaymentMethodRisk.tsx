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
  LabelList,
} from "recharts";
import type { PaymentRiskData } from "@/lib/types";
import { METHOD_COLORS, COLORS } from "@/lib/constants";

interface PaymentMethodRiskProps {
  data: PaymentRiskData[];
}

export function PaymentMethodRisk({ data }: PaymentMethodRiskProps) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chartGrid} />
        <XAxis
          dataKey="label"
          tick={{ fill: COLORS.chartText, fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: COLORS.chartText, fontSize: 11 }}
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
        />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(2)}%`, "Chargeback Rate"]}
          labelFormatter={(label) => {
            const l = String(label);
            const d = data.find((r) => r.label === l);
            return d ? `${l} (${d.total.toLocaleString()} txns)` : l;
          }}
        />
        <Bar dataKey="chargebackRate" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.method} fill={METHOD_COLORS[entry.method]} />
          ))}
          <LabelList
            dataKey="total"
            position="top"
            formatter={(v) => Number(v ?? 0).toLocaleString()}
            style={{ fill: COLORS.chartText, fontSize: 10 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
