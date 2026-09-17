"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { BudgetStatus, CATEGORIES } from "@/types";
import { PiggyBank } from "lucide-react";
import { clsx } from "clsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: session, status } = useSession();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  useEffect(() => {
    const token = session?.backendToken;
    if (status !== "authenticated" || !token) { setBudgets([]); return; }
    fetch(`${API_URL}/budgets/status?month=${month}&year=${year}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setBudgets(Array.isArray(data) ? data : []))
      .catch(() => setBudgets([]));
  }, [month, year, session?.backendToken, status]);

  const handleSave = async () => {
    const token = session?.backendToken;
    if (!category || !limit || status !== "authenticated" || !token) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category, monthly_limit: parseFloat(limit), month, year }),
      });
      const updated = await fetch(`${API_URL}/budgets/status?month=${month}&year=${year}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
      setBudgets(Array.isArray(updated) ? updated : []);
      setCategory("");
      setLimit("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
        <p className="text-sm text-gray-500 mt-0.5">Set monthly spending limits by category</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-800">Set Monthly Limit</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col gap-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-1.5 flex-1 min-w-40">
              <label className="text-xs font-medium text-gray-600">Category</label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category...">
                    {(v: string | null) => v || "Select category..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c !== "Income" && c !== "Transfers").map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 w-36">
              <label className="text-xs font-medium text-gray-600">Monthly Limit ($)</label>
              <Input
                type="number"
                min="0"
                step="10"
                placeholder="500"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !category || !limit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-800">Progress — {monthLabel}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {budgets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <PiggyBank size={32} strokeWidth={1.5} />
              <p className="text-sm">No budgets set for {monthLabel} yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {budgets.map((b) => (
                <div key={b.category} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">{b.category}</span>
                    <span className={clsx("text-xs font-medium", b.percentage > 100 ? "text-red-600" : b.percentage > 80 ? "text-amber-600" : "text-gray-500")}>
                      ${parseFloat(b.spent).toFixed(2)} / ${parseFloat(b.monthly_limit).toFixed(2)}
                      <span className="ml-1 text-gray-400">({b.percentage.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <Progress
                    value={Math.min(b.percentage, 100)}
                    className={clsx("h-2", b.percentage > 100 ? "[&>div]:bg-red-500" : b.percentage > 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-rose-500")}
                  />
                  {b.percentage > 100 && (
                    <p className="text-xs text-red-500">Over by ${Math.abs(parseFloat(b.remaining)).toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
