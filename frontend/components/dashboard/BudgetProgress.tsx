import { Progress } from "@/components/ui/progress";
import { BudgetStatus } from "@/types";
import { PiggyBank } from "lucide-react";
import { clsx } from "clsx";

export default function BudgetProgress({ budgets }: { budgets: BudgetStatus[] }) {
  if (!budgets.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
        <PiggyBank size={32} strokeWidth={1.5} />
        <p className="text-sm">No budgets set yet.</p>
        <p className="text-xs text-gray-300">Go to Budgets to add spending limits.</p>
      </div>
    );
  }

  return (
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
            className={clsx(
              "h-2",
              b.percentage > 100
                ? "[&>div]:bg-red-500"
                : b.percentage > 80
                  ? "[&>div]:bg-amber-500"
                  : "[&>div]:bg-rose-500"
            )}
          />
          {b.percentage > 100 && (
            <p className="text-xs text-red-500">Over budget by ${Math.abs(parseFloat(b.remaining)).toFixed(2)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
