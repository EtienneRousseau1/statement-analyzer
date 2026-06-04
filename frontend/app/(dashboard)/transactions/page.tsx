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
  const userEmail = session?.user?.email ?? "";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{transactions.length} transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TransactionTable transactions={transactions} apiUrl={apiUrl} userEmail={userEmail} />
        </CardContent>
      </Card>
    </div>
  );
}
