"use client";

import { useState } from "react";
import { Trash2, FileText } from "lucide-react";
import { Statement, Account } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  initialStatements: Statement[];
  accounts: Account[];
  apiUrl: string;
  backendToken: string;
}

export default function RecentUploads({ initialStatements, accounts, apiUrl, backendToken }: Props) {
  const [statements, setStatements] = useState(initialStatements);
  const authHeader = { Authorization: `Bearer ${backendToken}` };

  const handleReassign = async (id: number, accountId: string) => {
    const res = await fetch(`${apiUrl}/upload/statements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ account_id: parseInt(accountId) }),
    });
    if (res.ok) {
      setStatements((prev) =>
        prev.map((s) => (s.id === id ? { ...s, account_id: parseInt(accountId) } : s))
      );
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`${apiUrl}/upload/statements/${id}`, {
      method: "DELETE",
      headers: authHeader,
    });
    if (res.ok) {
      setStatements((prev) => prev.filter((s) => s.id !== id));
    }
  };

  if (statements.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {statements.map((s) => (
        <div key={s.id} className="flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-gray-50 group">
          <FileText size={16} className="text-gray-400 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 truncate">{s.filename}</p>
            <p className="text-xs text-gray-400">
              {new Date(s.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {" · "}{s.transaction_count ?? 0} transactions
              {" · "}{s.statement_source === "bank_account" ? "Bank Account" : "Credit Card"}
            </p>
          </div>

          <Select
            value={String(s.account_id)}
            onValueChange={(v) => v && handleReassign(s.id, v)}
          >
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue>
                {(v: string | null) => {
                  const a = accounts.find((a) => String(a.id) === v);
                  return a ? `${a.name}${a.last_four ? ` ···${a.last_four}` : ""}` : "Select account...";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                  {a.name}{a.last_four ? ` ···${a.last_four}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={() => handleDelete(s.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 shrink-0"
            aria-label="Delete upload"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
