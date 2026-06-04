import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { Account } from "@/types";
import Sidebar from "@/components/layout/Sidebar";
import AccountSetup from "@/components/setup/AccountSetup";

async function getAccounts(): Promise<Account[]> {
  try {
    return await apiFetch<Account[]>("/accounts");
  } catch {
    return [];
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const accounts = await getAccounts();

  if (accounts.length === 0) {
    return <AccountSetup userEmail={session.user?.email ?? ""} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
