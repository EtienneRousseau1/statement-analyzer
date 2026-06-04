"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CategoryTotal } from "@/types";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b"];

export default function SpendingByCategory({ data }: { data: CategoryTotal[] }) {
  const chartData = data
    .map((d) => ({ name: d.category, value: parseFloat(d.total) }))
    .filter((d) => !Number.isNaN(d.value) && d.value > 0);

  if (!chartData.length) {
    return <p className="text-sm text-gray-400 text-center py-8">No spending data available.</p>;
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col gap-4">
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

      <div className="grid gap-2 text-sm">
        {chartData.map((item, i) => (
          <div key={item.name} className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="truncate text-gray-700">{item.name}</span>
            </div>
            <div className="font-medium text-gray-900">${item.value.toFixed(2)} <span className="text-gray-400 font-normal">({((item.value / total) * 100).toFixed(0)}%)</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
