"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MonthPicker from "@/components/dashboard/MonthPicker";
import SpendingByCategory from "@/components/dashboard/SpendingByCategory";
import MonthlyTrend from "@/components/dashboard/MonthlyTrend";
import MonthlyBreakdown from "@/components/dashboard/MonthlyBreakdown";
import BudgetProgress from "@/components/dashboard/BudgetProgress";
import CategoryTransactionsDialog from "@/components/dashboard/CategoryTransactionsDialog";
import { DashboardSummary, BudgetStatus } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-gray-100 rounded-lg" />
      ))}
    </div>
  );
}

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"debit" | "credit">("debit");

  useEffect(() => {
    const token = session?.backendToken;
    if (status !== "authenticated" || !token) {
      setSummary(null);
      setBudgets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/dashboard/summary?month=${month}&year=${year}`, { headers }).then((r) => r.ok ? r.json() : null),
      fetch(`${API_URL}/budgets/status?month=${month}&year=${year}`, { headers }).then((r) => r.ok ? r.json() : []),
    ])
      .then(([summaryData, budgetData]) => {
        setSummary(summaryData);
        setBudgets(Array.isArray(budgetData) ? budgetData : []);
      })
      .catch(() => { setSummary(null); setBudgets([]); })
      .finally(() => setLoading(false));
  }, [month, year, session?.backendToken, status]);

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const income = parseFloat(summary?.total_income_this_month ?? "0");
  const spent = parseFloat(summary?.total_spent_this_month ?? "0");
  const net = income - spent;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">{monthLabel}</p>
        </div>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Money In</CardTitle>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-2xl font-bold text-emerald-600">+${income.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{MONTH_NAMES[month - 1]}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-rose-500">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Money Out</CardTitle>
              <TrendingDown size={16} className="text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-2xl font-bold text-rose-600">-${spent.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{MONTH_NAMES[month - 1]}</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-l-4 ${net >= 0 ? "border-l-emerald-500" : "border-l-rose-500"}`}>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Net</CardTitle>
              <Wallet size={16} className={net >= 0 ? "text-emerald-500" : "text-rose-500"} />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className={`text-2xl font-bold ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{MONTH_NAMES[month - 1]}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-indigo-400">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transactions</CardTitle>
              <Receipt size={16} className="text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-2xl font-bold text-gray-800">{summary?.transaction_count_this_month ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">{MONTH_NAMES[month - 1]}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-800">Spending by Category</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Click a category to see transactions</p>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? <LoadingSkeleton /> : (
              <SpendingByCategory
                data={summary?.by_category ?? []}
                onCategoryClick={(cat) => { setSelectedType("debit"); setSelectedCategory(cat); }}
              />
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-800">Income by Category</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Click a category to see transactions</p>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? <LoadingSkeleton /> : (
              <SpendingByCategory
                data={summary?.income_by_category ?? []}
                onCategoryClick={(cat) => { setSelectedType("credit"); setSelectedCategory(cat); }}
                valueLabel="Income"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-800">Monthly Trend</CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">Click a point to drill into that month</p>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? <LoadingSkeleton /> : (
            <MonthlyTrend data={summary?.monthly_trend ?? []} onMonthClick={(m, y) => { setMonth(m); setYear(y); }} />
          )}
        </CardContent>
      </Card>

      {/* Monthly breakdown */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-800">Monthly Summary</CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">Click a row to drill into that month</p>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {loading ? (
            <div className="p-4"><LoadingSkeleton /></div>
          ) : (
            <MonthlyBreakdown data={summary?.monthly_trend ?? []} onMonthClick={(m, y) => { setMonth(m); setYear(y); }} />
          )}
        </CardContent>
      </Card>

      {/* Budget progress */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-800">Budget Progress</CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">{monthLabel}</p>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? <LoadingSkeleton /> : <BudgetProgress budgets={budgets} />}
        </CardContent>
      </Card>

      <CategoryTransactionsDialog
        category={selectedCategory}
        month={month}
        year={year}
        open={selectedCategory !== null}
        transactionType={selectedType}
        onOpenChange={(open) => { if (!open) setSelectedCategory(null); }}
      />
    </div>
  );
}
