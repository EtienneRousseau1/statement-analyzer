"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { BudgetStatus, CATEGORIES } from "@/types";
import { clsx } from "clsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    fetch(`${API_URL}/budgets/status?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setBudgets)
      .catch(() => {});
  }, [month, year]);

  const handleSave = async () => {
    if (!category || !limit) return;
    setSaving(true);
    await fetch(`${API_URL}/budgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, monthly_limit: parseFloat(limit), month, year }),
    });
    const updated = await fetch(`${API_URL}/budgets/status?month=${month}&year=${year}`).then((r) => r.json());
    setBudgets(updated);
    setCategory("");
    setLimit("");
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Set Monthly Limit</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-gray-600">Category</label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c !== "Income").map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 w-36">
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
            <Button onClick={handleSave} disabled={saving || !category || !limit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {now.toLocaleString("default", { month: "long" })} {year} Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {budgets.length === 0 && (
            <p className="text-sm text-gray-400">No budgets set for this month yet.</p>
          )}
          {budgets.map((b) => (
            <div key={b.category}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-semibold text-gray-700">{b.category}</span>
                <span className={clsx("text-xs font-medium", b.percentage > 100 ? "text-red-600" : b.percentage > 80 ? "text-amber-600" : "text-gray-500")}>
                  ${parseFloat(b.spent).toFixed(2)} / ${parseFloat(b.monthly_limit).toFixed(2)} ({b.percentage.toFixed(0)}%)
                </span>
              </div>
              <Progress
                value={Math.min(b.percentage, 100)}
                className={clsx("h-2.5", b.percentage > 100 ? "[&>div]:bg-red-500" : b.percentage > 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-indigo-500")}
              />
              {b.percentage > 100 && (
                <p className="text-xs text-red-500 mt-1">Over by ${Math.abs(parseFloat(b.remaining)).toFixed(2)}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
