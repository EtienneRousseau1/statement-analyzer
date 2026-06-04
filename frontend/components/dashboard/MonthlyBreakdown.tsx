"use client";

import { MonthlyTotal } from "@/types";
import { CalendarDays } from "lucide-react";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  data: MonthlyTotal[];
  onMonthClick?: (month: number, year: number) => void;
}

export default function MonthlyBreakdown({ data, onMonthClick }: Props) {
  const rows = [...data].reverse();

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
        <CalendarDays size={32} strokeWidth={1.5} />
        <p className="text-sm">No monthly data yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Money In</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Money Out</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Net</th>
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
                className={onMonthClick ? "hover:bg-indigo-50/50 cursor-pointer transition-colors" : ""}
                onClick={() => onMonthClick?.(row.month, row.year)}
              >
                <td className="px-5 py-3 font-medium text-gray-700">
                  {MONTH_NAMES[row.month - 1]} {row.year}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-emerald-600">
                  +${income.toFixed(2)}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-rose-600">
                  -${spent.toFixed(2)}
                </td>
                <td className={`px-5 py-3 text-right font-bold ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
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
