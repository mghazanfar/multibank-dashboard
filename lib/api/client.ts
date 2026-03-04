import type { PricePoint, TickerSummary } from "@/lib/types/market";
import type { LoginResponse } from "@/lib/types/auth";

export async function fetchTickers(): Promise<TickerSummary[]> {
  const response = await fetch("/api/tickers", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tickers");
  }

  const payload = (await response.json()) as { data: TickerSummary[] };
  return payload.data;
}

export async function fetchHistory(symbol: string, points = 120): Promise<PricePoint[]> {
  const response = await fetch(`/api/history?ticker=${encodeURIComponent(symbol)}&points=${points}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch history for ${symbol}`);
  }

  const payload = (await response.json()) as { data: PricePoint[] };
  return payload.data;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid credentials");
  }

  return (await response.json()) as LoginResponse;
}
