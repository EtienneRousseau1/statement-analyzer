"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { MonthlyTotal } from "@/types";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  data: MonthlyTotal[];
  onMonthClick?: (month: number, year: number) => void;
}

export default function MonthlyTrend({ data, onMonthClick }: Props) {
  const chartData = data.map((d) => ({
    label: `${MONTH_NAMES[d.month - 1]} ${d.year}`,
    month: d.month,
    year: d.year,
    total: parseFloat(d.total),
  }));

  if (!chartData.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Not enough data for trend.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Spent"]} />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#6366f1"
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props;
            if (cx == null || cy == null) return null;
            const point = payload as { month?: number; year?: number };
            return (
              <circle
                cx={cx}
                cy={cy}
                r={4}
                fill="#6366f1"
                stroke="#fff"
                strokeWidth={2}
                style={{ cursor: onMonthClick ? "pointer" : undefined }}
                onClick={() => {
                  if (point.month && point.year) onMonthClick?.(point.month, point.year);
                }}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
