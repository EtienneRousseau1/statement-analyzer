import { apiFetch } from "@/lib/api";
import { Account } from "@/types";
import { auth } from "@/auth";
import AccountManager from "@/components/accounts/AccountManager";

async function getAccounts(): Promise<Account[]> {
  try {
    return await apiFetch<Account[]>("/accounts");
  } catch {
    return [];
  }
}

export default async function AccountsPage() {
  const [accounts, session] = await Promise.all([getAccounts(), auth()]);
  const backendToken = session?.backendToken ?? "";

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
      <AccountManager initialAccounts={accounts} backendToken={backendToken} />
    </div>
  );
}
