"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, PlusCircle } from "lucide-react";
import { Account } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TYPE_LABELS: Record<string, string> = {
  credit: "Credit Card",
  checking: "Checking",
  savings: "Savings",
};

interface Props {
  initialAccounts: Account[];
  backendToken: string;
}

export default function AccountManager({ initialAccounts, backendToken }: Props) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [institution, setInstitution] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const authHeader = { Authorization: `Bearer ${backendToken}` };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          name: name.trim(),
          account_type: accountType,
          institution: institution.trim() || null,
          last_four: lastFour.trim() || null,
        }),
      });

      if (res.ok) {
        const created: Account = await res.json();
        setAccounts((prev) => [...prev, created]);
        setName("");
        setInstitution("");
        setLastFour("");
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail ?? "Failed to create account");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`${API_URL}/accounts/${id}`, {
      method: "DELETE",
      headers: authHeader,
    });
    if (res.ok) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Existing accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Accounts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {accounts.length === 0 && (
            <p className="text-sm text-gray-400">No accounts yet.</p>
          )}
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 border rounded-lg hover:bg-gray-50 group">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {a.name}{a.last_four ? ` ···${a.last_four}` : ""}
                </p>
                <p className="text-xs text-gray-400">
                  {TYPE_LABELS[a.account_type] ?? a.account_type}
                  {a.institution ? ` · ${a.institution}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                aria-label="Delete account"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add account form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PlusCircle size={16} />
            Add Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Chase Sapphire"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Account Type</Label>
                <Select value={accountType} onValueChange={(v) => v && setAccountType(v)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(v: string | null) =>
                        v === "credit" ? "Credit Card" : v === "savings" ? "Savings" : "Checking"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="institution">Institution <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="institution"
                  placeholder="e.g. Wells Fargo"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastFour">Last 4 Digits <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="lastFour"
                  placeholder="1234"
                  maxLength={4}
                  value={lastFour}
                  onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              disabled={!name.trim() || saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-fit"
            >
              {saving ? "Adding..." : "Add Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
