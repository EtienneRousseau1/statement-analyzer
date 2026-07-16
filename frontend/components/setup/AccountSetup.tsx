"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  userEmail: string;
}

export default function AccountSetup({ userEmail }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [institution, setInstitution] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": userEmail },
        body: JSON.stringify({
          name: name.trim(),
          account_type: accountType,
          institution: institution.trim() || null,
          last_four: lastFour.trim() || null,
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail ?? "Failed to create account");
        setSaving(false);
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to StatementIQ</h1>
          <p className="text-sm text-gray-500 mt-1">Add your first account to get started</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Chase Sapphire, Wells Fargo Checking"
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
                <Label htmlFor="institution">Bank / Institution <span className="text-gray-400">(optional)</span></Label>
                <Input
                  id="institution"
                  placeholder="e.g. Chase, Wells Fargo"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastFour">Last 4 Digits <span className="text-gray-400">(optional)</span></Label>
                <Input
                  id="lastFour"
                  placeholder="1234"
                  maxLength={4}
                  value={lastFour}
                  onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                disabled={!name.trim() || saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? "Creating..." : "Create Account & Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
