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
  ReferenceLine,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface AnomalyScoreChartProps {
  data: { bucket: string; count: number; flagged: number }[];
}

function bucketColor(bucket: string): string {
  const lo = parseInt(bucket.split("-")[0], 10);
  if (lo < 30) return COLORS.success;
  if (lo < 60) return COLORS.warning;
  return COLORS.danger;
}

export function AnomalyScoreChart({ data }: AnomalyScoreChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No data</p>;
  }

  // Find the top 1% threshold
  const totalCount = data.reduce((s, d) => s + d.count, 0);
  const top1Threshold = Math.ceil(totalCount * 0.01);
  let cumulative = 0;
  let thresholdBucketIdx = data.length - 1;
  for (let i = data.length - 1; i >= 0; i--) {
    cumulative += data[i].count;
    if (cumulative >= top1Threshold) {
      thresholdBucketIdx = i;
      break;
    }
  }
  const thresholdLabel = data[thresholdBucketIdx]?.bucket ?? "90-100";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chartGrid} />
        <XAxis
          dataKey="bucket"
          tick={{ fill: COLORS.chartText, fontSize: 10 }}
          label={{ value: "Anomaly Score", position: "insideBottom", offset: -2, fill: COLORS.chartText, fontSize: 11 }}
        />
        <YAxis tick={{ fill: COLORS.chartText, fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 12,
          }}
          formatter={(value: number | undefined, name: string | undefined) => [
            (value ?? 0).toLocaleString(),
            name === "count" ? "Total" : "Flagged",
          ]}
        />
        <ReferenceLine
          x={thresholdLabel}
          stroke={COLORS.danger}
          strokeDasharray="4 4"
          label={{ value: "Top 1%", fill: COLORS.danger, fontSize: 10, position: "top" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={bucketColor(entry.bucket)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
