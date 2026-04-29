"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CategoryTotal } from "@/types";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b"];

export default function SpendingByCategory({ data }: { data: CategoryTotal[] }) {
  const chartData = data.map((d) => ({ name: d.category, value: parseFloat(d.total) }));

  if (!chartData.length) {
    return <p className="text-sm text-gray-400 text-center py-8">No spending data for this month.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name ?? ""} ${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Spent"]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
