"use client";

import { useState } from "react";
import { Trash2, FileText } from "lucide-react";
import { Statement } from "@/types";

interface Props {
  initialStatements: Statement[];
  apiUrl: string;
  userEmail: string;
}

export default function RecentUploads({ initialStatements, apiUrl, userEmail }: Props) {
  const [statements, setStatements] = useState(initialStatements);

  const handleDelete = async (id: number) => {
    const res = await fetch(`${apiUrl}/upload/statements/${id}`, {
      method: "DELETE",
      headers: { "X-User-Email": userEmail },
    });
    if (res.ok) {
      setStatements((prev) => prev.filter((s) => s.id !== id));
    }
  };

  if (statements.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {statements.map((s) => (
        <div key={s.id} className="flex items-center justify-between px-4 py-3 border rounded-lg hover:bg-gray-50 group">
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={16} className="text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{s.filename}</p>
              <p className="text-xs text-gray-400">
                {new Date(s.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" · "}
                {s.transaction_count ?? 0} transactions
                {" · "}
                {s.statement_source === "bank_account" ? "Bank Account" : "Credit Card"}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDelete(s.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 ml-4 shrink-0"
            aria-label="Delete upload"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
