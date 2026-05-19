import { auth } from "@/auth";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const session = await auth();
    if (!session?.user?.email) return {};
    
    // Get the JWT token from NextAuth
    const req = { headers: Object.fromEntries(await headers()) } as Parameters<typeof getToken>[0]["req"];
    const token = await getToken({ 
      req, 
      secret: process.env.AUTH_SECRET 
    });
    
    if (!token) return {};
    
    // Return the raw token string - NextAuth/JWT already encodes it properly
    return { "X-User-Email": token.email as string };
  } catch {
    return {};
  }
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
