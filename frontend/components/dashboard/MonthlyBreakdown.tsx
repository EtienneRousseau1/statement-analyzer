"use client";

import { MonthlyTotal } from "@/types";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  data: MonthlyTotal[];
  onMonthClick?: (month: number, year: number) => void;
}

export default function MonthlyBreakdown({ data, onMonthClick }: Props) {
  const rows = [...data].reverse();

  if (!rows.length) {
    return <p className="text-sm text-gray-400 text-center py-6">No data yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</th>
            <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Money In</th>
            <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Money Out</th>
            <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const income = parseFloat(row.income ?? "0");
            const spent = parseFloat(row.total);
            const net = income - spent;
            return (
              <tr
                key={`${row.year}-${row.month}`}
                className={onMonthClick ? "hover:bg-gray-50 cursor-pointer" : ""}
                onClick={() => onMonthClick?.(row.month, row.year)}
              >
                <td className="px-4 py-2 font-medium text-gray-700">
                  {MONTH_NAMES[row.month - 1]} {row.year}
                </td>
                <td className="px-4 py-2 text-right font-medium text-green-600">
                  +${income.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-800">
                  -${spent.toFixed(2)}
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${net >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
