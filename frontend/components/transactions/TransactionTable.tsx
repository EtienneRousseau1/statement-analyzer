"use client";

import { useState } from "react";
import { Trash2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Transaction, CATEGORIES } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clsx } from "clsx";

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "bg-orange-100 text-orange-700",
  Shopping: "bg-blue-100 text-blue-700",
  Transport: "bg-yellow-100 text-yellow-700",
  Entertainment: "bg-purple-100 text-purple-700",
  Utilities: "bg-gray-100 text-gray-600",
  Health: "bg-red-100 text-red-700",
  Travel: "bg-teal-100 text-teal-700",
  Subscriptions: "bg-pink-100 text-pink-700",
  Rent: "bg-amber-100 text-amber-800",
  Income: "bg-emerald-100 text-emerald-700",
  Other: "bg-gray-100 text-gray-500",
};

interface Props {
  transactions: Transaction[];
  apiUrl: string;
  userEmail: string;
}

export default function TransactionTable({ transactions: initial, apiUrl, userEmail }: Props) {
  const [transactions, setTransactions] = useState(initial);

  const authHeader = { "X-User-Email": userEmail };

  const handleCategoryChange = async (id: number, category: string | null) => {
    if (!category) return;
    const res = await fetch(`${apiUrl}/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ category }),
    });
    if (res.ok) {
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)));
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`${apiUrl}/transactions/${id}`, {
      method: "DELETE",
      headers: authHeader,
    });
    if (res.ok) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
        <ArrowUpRight size={32} strokeWidth={1.5} />
        <p className="text-sm">No transactions found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b-2 border-gray-200">
          <tr>
            {["Date", "Description", "Amount", "Type", "Category", ""].map((h, i) => (
              <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50/80 group transition-colors">
              <td className="px-5 py-3 text-gray-400 whitespace-nowrap text-xs">{tx.date}</td>
              <td className="px-5 py-3 text-gray-800 font-medium max-w-xs truncate">{tx.description}</td>
              <td className={clsx("px-5 py-3 font-semibold whitespace-nowrap tabular-nums", tx.transaction_type === "credit" ? "text-emerald-600" : "text-rose-600")}>
                {tx.transaction_type === "credit" ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
              </td>
              <td className="px-5 py-3">
                <span className={clsx(
                  "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                  tx.transaction_type === "credit"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-600"
                )}>
                  {tx.transaction_type === "credit"
                    ? <ArrowUpRight size={10} />
                    : <ArrowDownLeft size={10} />
                  }
                  {tx.transaction_type}
                </span>
              </td>
              <td className="px-5 py-3">
                <Select defaultValue={tx.category} onValueChange={(v) => handleCategoryChange(tx.id, v)}>
                  <SelectTrigger className="h-7 text-xs border-0 shadow-none focus:ring-0 p-0 w-auto">
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", CATEGORY_COLORS[tx.category] ?? "bg-gray-100 text-gray-500")}>
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-5 py-3">
                <button
                  onClick={() => handleDelete(tx.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-rose-500"
                  aria-label="Delete transaction"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
