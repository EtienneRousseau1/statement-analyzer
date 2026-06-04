import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DropZone from "@/components/upload/DropZone";
import RecentUploads from "@/components/upload/RecentUploads";
import { apiFetch } from "@/lib/api";
import { Account, Statement } from "@/types";
import { auth } from "@/auth";

async function getAccounts(): Promise<Account[]> {
  try {
    return await apiFetch<Account[]>("/accounts");
  } catch {
    return [];
  }
}

async function getStatements(): Promise<Statement[]> {
  try {
    return await apiFetch<Statement[]>("/upload/statements");
  } catch {
    return [];
  }
}

export default async function UploadPage() {
  const [accounts, statements, session] = await Promise.all([
    getAccounts(),
    getStatements(),
    auth(),
  ]);
  const userEmail = session?.user?.email ?? "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Statement</h1>
        <p className="text-sm text-gray-500 mt-0.5">Import transactions from a PDF or CSV bank/credit card statement</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-800">Upload PDF or CSV</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {accounts.length === 0 ? (
            <p className="text-sm text-amber-600">
              No accounts found. Add an account before uploading a statement.
            </p>
          ) : (
            <DropZone accounts={accounts} userEmail={userEmail} />
          )}
        </CardContent>
      </Card>

      {statements.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-800">Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <RecentUploads
              initialStatements={statements}
              accounts={accounts}
              apiUrl={apiUrl}
              userEmail={userEmail}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
