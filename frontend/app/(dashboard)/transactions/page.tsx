import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TransactionTable from "@/components/transactions/TransactionTable";
import { Transaction } from "@/types";

async function getTransactions(): Promise<Transaction[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/transactions`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function TransactionsPage() {
  const transactions = await getTransactions();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{transactions.length} transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TransactionTable transactions={transactions} apiUrl={apiUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
