"use client";

import { useEffect, useRef, useState } from "react";
import type { TickMessage } from "@/lib/types/market";

interface StreamState {
  prices: Record<string, number>;
  status: "connecting" | "connected" | "disconnected";
}

export function useMarketSocket(symbols: string[]) {
  const [state, setState] = useState<StreamState>({
    prices: {},
    status: "connecting",
  });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((current) => ({ ...current, status: "connected" }));
      symbols.forEach((symbol) => {
        ws.send(JSON.stringify({ type: "subscribe", symbol }));
      });
    };

    ws.onclose = () => {
      setState((current) => ({ ...current, status: "disconnected" }));
    };

    ws.onerror = () => {
      setState((current) => ({ ...current, status: "disconnected" }));
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as Partial<TickMessage> & { type?: string };

      if (payload.type !== "tick" || !payload.symbol || typeof payload.price !== "number") {
        return;
      }

      const symbol = payload.symbol;
      const price = payload.price;

      setState((current) => ({
        ...current,
        prices: {
          ...current.prices,
          [symbol]: price,
        },
      }));
    };

    return () => {
      ws.close();
    };
  }, [symbols]);

  return state;
}
