"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
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
    spent: parseFloat(d.total),
    income: parseFloat(d.income ?? "0"),
  }));

  if (!chartData.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Not enough data for trend.</p>;
  }

  const clickDot = (dataKey: "spent" | "income") => (props: { cx?: number; cy?: number; payload?: { month?: number; year?: number } }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const color = dataKey === "spent" ? "#6366f1" : "#10b981";
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
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === "spent" ? "Spent" : "Income"]} />
        <Legend formatter={(v) => (v === "spent" ? "Spent" : "Income")} />
        <Line type="monotone" dataKey="spent" stroke="#6366f1" strokeWidth={2} dot={clickDot("spent")} />
        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={clickDot("income")} />
      </LineChart>
    </ResponsiveContainer>
  );
}
