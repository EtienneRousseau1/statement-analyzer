"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Account, UploadResponse, TransactionPreview } from "@/types";
import { clsx } from "clsx";

interface Props {
  accounts: Account[];
  userEmail: string;
}

export default function DropZone({ accounts, userEmail }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState<string>("");
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

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/upload`, {
        method: "POST",
        headers: {
          "X-User-Email": userEmail,
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
        "X-User-Email": userEmail,
      },
      body: JSON.stringify({ statement_id: result.statement.id }),
    });
    setStatus("confirmed");
  };

  if (status === "confirmed") {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <CheckCircle className="text-green-500" size={40} />
        <p className="text-lg font-semibold text-gray-700">Transactions saved!</p>
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
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {["Date", "Description", "Amount", "Type", "Category"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.preview.map((tx: TransactionPreview, i: number) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">{tx.date}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-xs truncate">{tx.description}</td>
                  <td className="px-3 py-2 font-medium">${parseFloat(tx.amount).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", tx.transaction_type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{tx.category}</td>
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
            <SelectValue placeholder="Select account..." />
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

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors",
          dragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-gray-400"
        )}
      >
        <input ref={inputRef} type="file" accept=".pdf,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
        {file ? (
          <>
            <FileText className="text-indigo-500" size={36} />
            <p className="font-medium text-gray-700">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </>
        ) : (
          <>
            <Upload className="text-gray-400" size={36} />
            <p className="text-sm text-gray-500">Drag & drop a PDF or CSV, or click to browse</p>
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
        className="bg-indigo-600 hover:bg-indigo-700 text-white w-fit"
      >
        {status === "uploading" ? "Parsing with AI..." : "Upload & Parse"}
      </Button>
    </div>
  );
}
