import { auth } from "@/auth";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAuthHeader(): Promise<Record<string, string>> {
  const session = await auth();
  if (!session) return {};
  // For server components/actions we use the raw JWT via getToken
  const req = { headers: Object.fromEntries(await headers()) } as Parameters<typeof getToken>[0]["req"];
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token) return {};
  // Reconstruct a compact JWT-like string from the token payload for FastAPI
  // In production, configure NextAuth to expose the raw token or use a shared secret
  return { Authorization: `Bearer ${token.__raw ?? JSON.stringify(token)}` };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Request failed");
  }
  return res.json();
}

// Client-side fetch (uses session token from cookie)
export async function clientFetch<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Request failed");
  }
  return res.json();
}
