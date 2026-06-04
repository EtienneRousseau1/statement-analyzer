"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Transaction, CATEGORIES } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clsx } from "clsx";

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "bg-orange-100 text-orange-700",
  Shopping: "bg-blue-100 text-blue-700",
  Transport: "bg-yellow-100 text-yellow-700",
  Entertainment: "bg-purple-100 text-purple-700",
  Utilities: "bg-gray-100 text-gray-700",
  Health: "bg-red-100 text-red-700",
  Travel: "bg-teal-100 text-teal-700",
  Subscriptions: "bg-pink-100 text-pink-700",
  Rent: "bg-amber-100 text-amber-800",
  Income: "bg-green-100 text-green-700",
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

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {["Date", "Description", "Amount", "Type", "Category", ""].map((h, i) => (
              <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50 group">
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{tx.date}</td>
              <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{tx.description}</td>
              <td className={clsx("px-4 py-3 font-semibold whitespace-nowrap", tx.transaction_type === "credit" ? "text-green-600" : "text-gray-900")}>
                {tx.transaction_type === "credit" ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", tx.transaction_type === "credit" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                  {tx.transaction_type}
                </span>
              </td>
              <td className="px-4 py-3">
                <Select defaultValue={tx.category} onValueChange={(v) => handleCategoryChange(tx.id, v)}>
                  <SelectTrigger className="h-7 text-xs border-0 shadow-none focus:ring-0 p-0">
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
              <td className="px-4 py-3">
                <button
                  onClick={() => handleDelete(tx.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                  aria-label="Delete transaction"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 && (
        <p className="text-center py-10 text-sm text-gray-400">No transactions found.</p>
      )}
    </div>
  );
}
