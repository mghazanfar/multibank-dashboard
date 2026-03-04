"use client";

import { useEffect, useRef, useState } from "react";
import type { TickMessage } from "@/lib/types/market";

interface StreamState {
  prices: Record<string, number>;
  status: "connecting" | "connected" | "disconnected";
}

export function useMarketSocket(symbols: string[], enabled: boolean) {
  const [state, setState] = useState<StreamState>({
    prices: {},
    status: "disconnected",
  });
  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const latestSymbolsRef = useRef<string[]>(symbols);

  useEffect(() => {
    if (!enabled) {
      subscriptionsRef.current = new Set();
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((current) => ({ ...current, status: "connected" }));

      latestSymbolsRef.current.forEach((symbol) => {
        subscriptionsRef.current.add(symbol);
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
  }, [enabled]);

  useEffect(() => {
    latestSymbolsRef.current = symbols;

    if (!enabled) {
      return;
    }

    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const currentSymbols = new Set(symbols);

    subscriptionsRef.current.forEach((symbol) => {
      if (!currentSymbols.has(symbol)) {
        ws.send(JSON.stringify({ type: "unsubscribe", symbol }));
        subscriptionsRef.current.delete(symbol);
      }
    });

    currentSymbols.forEach((symbol) => {
      if (!subscriptionsRef.current.has(symbol)) {
        ws.send(JSON.stringify({ type: "subscribe", symbol }));
        subscriptionsRef.current.add(symbol);
      }
    });
  }, [enabled, symbols]);

  if (!enabled) {
    return { prices: {}, status: "disconnected" as const };
  }

  return state;
}
