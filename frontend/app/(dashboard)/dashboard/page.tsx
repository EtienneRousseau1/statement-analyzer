import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SpendingByCategory from "@/components/dashboard/SpendingByCategory";
import MonthlyTrend from "@/components/dashboard/MonthlyTrend";
import BudgetProgress from "@/components/dashboard/BudgetProgress";
import { apiFetch } from "@/lib/api";
import { DashboardSummary, BudgetStatus } from "@/types";

async function getDashboard(): Promise<DashboardSummary | null> {
  try {
    return await apiFetch<DashboardSummary>("/dashboard/summary");
  } catch {
    return null;
  }
}

async function getBudgetStatus(): Promise<BudgetStatus[]> {
  try {
    return await apiFetch<BudgetStatus[]>("/budgets/status");
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [summary, budgets] = await Promise.all([getDashboard(), getBudgetStatus()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>

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
            <CardTitle className="text-sm font-medium text-gray-500">Spent This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600">
              ${parseFloat(summary?.total_spent_this_month ?? "0").toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{summary?.transaction_count_all_time ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingByCategory data={summary?.by_category_all_time ?? summary?.by_category ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrend data={summary?.monthly_trend ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* Budget progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetProgress budgets={budgets} />
        </CardContent>
      </Card>
    </div>
  );
}
