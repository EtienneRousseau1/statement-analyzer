"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Account, UploadResponse, TransactionPreview } from "@/types";
import { clsx } from "clsx";

interface Props {
  accounts: Account[];
  backendToken: string;
}

export default function DropZone({ accounts, backendToken }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState<string>("");
  const [statementSource, setStatementSource] = useState<string>("credit_card");
  const [status, setStatus] = useState<"idle" | "uploading" | "preview" | "confirmed" | "error">("idle");
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<"error" | "warning">("error");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleUpload = async () => {
    if (!file || !accountId) return;
    setStatus("uploading");
    setError("");
    setErrorKind("error");

    const form = new FormData();
    form.append("file", file);
    form.append("account_id", accountId);
    form.append("statement_source", statementSource);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${backendToken}`,
        },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.detail ?? "Upload failed";
        if (res.status === 409) {
          setError(detail);
          setErrorKind("warning");
          setStatus("error");
          return;
        }
        throw new Error(detail);
      }
      const data: UploadResponse = await res.json();
      setResult(data);
      setStatus("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    await fetch(`${apiUrl}/upload/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({ statement_id: result.statement.id }),
    });
    setStatus("confirmed");
  };

  if (status === "confirmed") {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <CheckCircle className="text-emerald-500" size={44} />
        <p className="text-lg font-semibold text-gray-700">Transactions saved!</p>
        <p className="text-sm text-gray-400">Your statement has been processed and added to your account.</p>
        <Button variant="outline" onClick={() => { setStatus("idle"); setFile(null); setResult(null); }}>
          Upload another
        </Button>
      </div>
    );
  }

  if (status === "preview" && result) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">{result.message}</p>
        <div className="max-h-80 overflow-y-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 border-b-2 border-gray-200">
              <tr>
                {["Date", "Description", "Amount", "Type", "Category"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.preview.map((tx: TransactionPreview, i: number) => (
                <tr key={i} className={clsx("border-t", tx.transaction_type === "credit" ? "bg-emerald-50/40 hover:bg-emerald-50" : "hover:bg-rose-50/30")}>
                  <td className="px-3 py-2 text-gray-400 text-xs">{tx.date}</td>
                  <td className="px-3 py-2 text-gray-800 font-medium max-w-xs truncate">{tx.description}</td>
                  <td className={clsx("px-3 py-2 font-semibold tabular-nums", tx.transaction_type === "credit" ? "text-emerald-600" : "text-rose-600")}>
                    {tx.transaction_type === "credit" ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", tx.transaction_type === "credit" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600")}>
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{tx.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleConfirm} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Save {result.preview.length} transactions
          </Button>
          <Button variant="outline" onClick={() => { setStatus("idle"); setFile(null); setResult(null); }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Account</label>
        <Select onValueChange={(v) => v && setAccountId(v)} value={accountId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select account...">
              {(v: string | null) => {
                if (!v) return "Select account...";
                const a = accounts.find((a) => String(a.id) === v);
                return a ? `${a.name}${a.last_four ? ` ···${a.last_four}` : ""}` : "Select account...";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name} {a.last_four ? `···${a.last_four}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Statement Type</label>
        <Select onValueChange={(v) => v && setStatementSource(v)} value={statementSource}>
          <SelectTrigger className="w-64">
            <SelectValue>
              {(v: string | null) =>
                v === "bank_account" ? "Bank Account Statement" : "Credit Card Statement"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="credit_card">Credit Card Statement</SelectItem>
            <SelectItem value="bank_account">Bank Account Statement</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-400">
          {statementSource === "credit_card"
            ? "Charges are debits, payments/refunds are credits"
            : "Deposits are credits (income in), withdrawals/payments are debits (money out)"}
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200",
          dragging ? "border-indigo-500 bg-indigo-50/60" : file ? "border-emerald-400 bg-emerald-50/40" : "border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30"
        )}
      >
        <input ref={inputRef} type="file" accept=".pdf,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
        {file ? (
          <>
            <div className="relative">
              <FileText className="text-indigo-500" size={48} />
              <CheckCircle className="absolute -bottom-1 -right-1 text-emerald-500 bg-white rounded-full" size={18} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="font-semibold text-gray-700">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · Ready to upload</p>
            </div>
          </>
        ) : (
          <>
            <Upload className="text-gray-300" size={48} />
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-medium text-gray-600">Drag & drop a PDF or CSV</p>
              <p className="text-xs text-gray-400">or click to browse files</p>
            </div>
          </>
        )}
      </div>

      {status === "error" && (
        <div className={clsx("flex items-center gap-2 text-sm", errorKind === "warning" ? "text-amber-600" : "text-red-600") }>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || !accountId || status === "uploading"}
        className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
      >
        {status === "uploading" ? "Parsing with AI..." : "Upload & Parse"}
      </Button>
    </div>
  );
}
