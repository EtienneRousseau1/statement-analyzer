import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TransactionTable from "@/components/transactions/TransactionTable";
import { apiFetch } from "@/lib/api";
import { Transaction } from "@/types";
import { auth } from "@/auth";

async function getTransactions(): Promise<Transaction[]> {
  try {
    return await apiFetch<Transaction[]>("/transactions");
  } catch {
    return [];
  }
}

export default async function TransactionsPage() {
  const [transactions, session] = await Promise.all([getTransactions(), auth()]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const backendToken = session?.backendToken ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Browse, categorize, and manage your transactions</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-800">{transactions.length} transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TransactionTable transactions={transactions} apiUrl={apiUrl} backendToken={backendToken} />
        </CardContent>
      </Card>
    </div>
  );
}
