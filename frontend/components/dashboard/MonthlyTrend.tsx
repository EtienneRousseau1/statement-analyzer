"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { MonthlyTotal } from "@/types";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function MonthlyTrend({ data }: { data: MonthlyTotal[] }) {
  const chartData = data.map((d) => ({
    label: `${MONTH_NAMES[d.month - 1]} ${d.year}`,
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
        <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
