"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { MonthlyTotal } from "@/types";
import { TrendingUp } from "lucide-react";

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
    spent: parseFloat(d.total),
    income: parseFloat(d.income ?? "0"),
  }));

  if (!chartData.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
        <TrendingUp size={32} strokeWidth={1.5} />
        <p className="text-sm">Not enough data for a trend yet.</p>
      </div>
    );
  }

  const clickDot = (dataKey: "spent" | "income") => (props: { cx?: number; cy?: number; payload?: { month?: number; year?: number } }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const color = dataKey === "spent" ? "#e11d48" : "#10b981";
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: onMonthClick ? "pointer" : undefined }}
        onClick={() => {
          if (payload?.month && payload?.year) onMonthClick?.(payload.month, payload.year);
        }}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === "spent" ? "Money Out" : "Money In"]}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
        />
        <Legend formatter={(v) => (v === "spent" ? "Money Out" : "Money In")} wrapperStyle={{ fontSize: "12px" }} />
        <Line type="monotone" dataKey="spent" stroke="#e11d48" strokeWidth={2} dot={clickDot("spent")} />
        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={clickDot("income")} />
      </LineChart>
    </ResponsiveContainer>
  );
}
