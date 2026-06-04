"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Transaction } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  category: string | null;
  month: number;
  year: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CategoryTransactionsDialog({
  category,
  month,
  year,
  open,
  onOpenChange,
}: Props) {
  const { data: session, status } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const email = session?.user?.email;
    if (!open || !category || status !== "authenticated" || !email) {
      setTransactions([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      category,
      month: String(month),
      year: String(year),
      transaction_type: "debit",
      sort: "amount_desc",
      limit: "500",
    });

    fetch(`${API_URL}/transactions?${params}`, {
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": email,
      },
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({ detail: r.statusText }));
          throw new Error(typeof body.detail === "string" ? body.detail : "Failed to load payments");
        }
        return r.json();
      })
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch((err: Error) => {
        setTransactions([]);
        setError(err.message || "Failed to load payments");
      })
      .finally(() => setLoading(false));
  }, [open, category, month, year, session?.user?.email, status]);

  const total = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{category}</DialogTitle>
          <DialogDescription>
            {MONTH_NAMES[month - 1]} {year} · {transactions.length} payment
            {transactions.length !== 1 ? "s" : ""} · ${total.toFixed(2)} total
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto -mx-1 px-1 flex-1">
          {loading && (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          )}
          {!loading && error && (
            <p className="text-sm text-red-500 text-center py-8">{error}</p>
          )}
          {!loading && !error && transactions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No payments in this category.</p>
          )}
          {!loading && transactions.length > 0 && (
            <div className="flex flex-col gap-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500">{tx.date}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    ${parseFloat(tx.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
