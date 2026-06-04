"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MonthPicker from "@/components/dashboard/MonthPicker";
import SpendingByCategory from "@/components/dashboard/SpendingByCategory";
import MonthlyTrend from "@/components/dashboard/MonthlyTrend";
import BudgetProgress from "@/components/dashboard/BudgetProgress";
import CategoryTransactionsDialog from "@/components/dashboard/CategoryTransactionsDialog";
import { DashboardSummary, BudgetStatus } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const email = session?.user?.email;
    if (status !== "authenticated" || !email) {
      setSummary(null);
      setBudgets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const headers = {
      "Content-Type": "application/json",
      "X-User-Email": email,
    };

    Promise.all([
      fetch(`${API_URL}/dashboard/summary?month=${month}&year=${year}`, { headers }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`${API_URL}/budgets/status?month=${month}&year=${year}`, { headers }).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([summaryData, budgetData]) => {
        setSummary(summaryData);
        setBudgets(Array.isArray(budgetData) ? budgetData : []);
      })
      .catch(() => {
        setSummary(null);
        setBudgets([]);
      })
      .finally(() => setLoading(false));
  }, [month, year, session?.user?.email, status]);

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <MonthPicker
          month={month}
          year={year}
          onChange={(m, y) => {
            setMonth(m);
            setYear(y);
          }}
        />
      </div>

      {loading && (
        <p className="text-sm text-gray-400">Loading dashboard...</p>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Spent All Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              ${parseFloat(summary?.total_spent_all_time ?? "0").toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">
              Spent in {monthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600">
              ${parseFloat(summary?.total_spent_this_month ?? "0").toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">
              Transactions in {MONTH_NAMES[month - 1]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {summary?.transaction_count_this_month ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
            <p className="text-xs text-gray-500">Click a category to see individual payments</p>
          </CardHeader>
          <CardContent>
            <SpendingByCategory
              data={summary?.by_category ?? []}
              onCategoryClick={setSelectedCategory}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrend
              data={summary?.monthly_trend ?? []}
              onMonthClick={(m, y) => {
                setMonth(m);
                setYear(y);
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Budget progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget Progress — {monthLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetProgress budgets={budgets} />
        </CardContent>
      </Card>

      <CategoryTransactionsDialog
        category={selectedCategory}
        month={month}
        year={year}
        open={selectedCategory !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCategory(null);
        }}
      />
    </div>
  );
}
