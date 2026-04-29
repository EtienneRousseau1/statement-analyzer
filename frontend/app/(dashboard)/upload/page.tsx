import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DropZone from "@/components/upload/DropZone";
import { Account } from "@/types";

async function getAccounts(): Promise<Account[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/accounts`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function UploadPage() {
  const accounts = await getAccounts();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Upload Statement</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload PDF or CSV</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-amber-600">
              You need to add an account before uploading. (Account management coming soon — for now add one via the API.)
            </p>
          ) : (
            <DropZone accounts={accounts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
