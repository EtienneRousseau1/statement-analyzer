import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BudgetStatus } from "@/types";
import { clsx } from "clsx";

export default function BudgetProgress({ budgets }: { budgets: BudgetStatus[] }) {
  if (!budgets.length) {
    return <p className="text-sm text-gray-400">No budgets set. Go to Budgets to add limits.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {budgets.map((b) => (
        <div key={b.category}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">{b.category}</span>
            <span className={clsx("text-xs font-semibold", b.percentage > 100 ? "text-red-600" : b.percentage > 80 ? "text-amber-600" : "text-gray-500")}>
              ${parseFloat(b.spent).toFixed(2)} / ${parseFloat(b.monthly_limit).toFixed(2)}
            </span>
          </div>
          <Progress
            value={Math.min(b.percentage, 100)}
            className={clsx("h-2", b.percentage > 100 ? "[&>div]:bg-red-500" : b.percentage > 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-indigo-500")}
          />
          {b.percentage > 100 && (
            <p className="text-xs text-red-500 mt-0.5">Over budget by ${Math.abs(parseFloat(b.remaining)).toFixed(2)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
