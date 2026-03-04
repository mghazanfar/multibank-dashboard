"use client";

import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchHistory, fetchTickers } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { useMarketSocket } from "@/hooks/use-market-socket";
import type { TickerSummary } from "@/lib/types/market";

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function LoginCard() {
  const { login } = useAuth();
  const [username, setUsername] = useState("Senior Candidate");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);
      await login(username, password);
    } catch {
      setError("Unable to authenticate. Try any non-empty credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card">
      <h1>Real-Time Trading Dashboard</h1>
      <p>Mock auth via Context API. Enter any credentials to continue.</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="username">Username</label>
        <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <span className="error-text">{error}</span> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>;
}

function Header({ streamStatus }: { streamStatus: string }) {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div>
        <h1>MultiBank Market Terminal</h1>
        <p>
          Trader: <strong>{user?.name}</strong> | Feed: <span className={`pill ${streamStatus}`}>{streamStatus}</span>
        </p>
      </div>
      <button className="secondary-button" onClick={logout}>
        Logout
      </button>
    </header>
  );
}

function TickerList({
  tickers,
  selected,
  prices,
  onSelect,
}: {
  tickers: TickerSummary[];
  selected: string;
  prices: Record<string, number>;
  onSelect: (symbol: string) => void;
}) {
  return (
    <section className="panel ticker-list">
      <h2>Instruments</h2>
      <div className="ticker-grid">
        {tickers.map((ticker) => {
          const livePrice = prices[ticker.symbol] ?? ticker.price;

          return (
            <button
              key={ticker.symbol}
              className={`ticker-item ${selected === ticker.symbol ? "active" : ""}`}
              onClick={() => onSelect(ticker.symbol)}
            >
              <div>
                <strong>{ticker.symbol}</strong>
                <small>{ticker.name}</small>
              </div>
              <div className="ticker-price">${formatPrice(livePrice)}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PriceChart({
  symbol,
  prices,
  threshold,
  setThreshold,
}: {
  symbol: string;
  prices: Record<string, number>;
  threshold: string;
  setThreshold: (value: string) => void;
}) {
  const historyQuery = useQuery({
    queryKey: ["history", symbol],
    queryFn: () => fetchHistory(symbol, 150),
    staleTime: 30_000,
  });

  const latestPrice = prices[symbol];

  const chartData = useMemo(() => {
    const points = historyQuery.data ?? [];

    if (!latestPrice || points.length === 0) {
      return points;
    }

    return [
      ...points,
      {
        timestamp: new Date().toISOString(),
        price: latestPrice,
      },
    ];
  }, [historyQuery.data, latestPrice]);

  const thresholdValue = Number(threshold);
  const isThresholdHit = Number.isFinite(thresholdValue) && latestPrice >= thresholdValue;

  return (
    <section className="panel chart-panel">
      <div className="panel-title-row">
        <h2>{symbol} Live Chart</h2>
        <label>
          Alert threshold
          <input
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            placeholder="e.g. 62000"
            inputMode="decimal"
          />
        </label>
      </div>

      {isThresholdHit ? <p className="alert">Threshold hit at ${formatPrice(latestPrice)}</p> : null}

      {historyQuery.isLoading ? <EmptyState message="Loading chart data..." /> : null}
      {historyQuery.isError ? <EmptyState message="Unable to load chart history" /> : null}

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ left: 12, right: 12, top: 20, bottom: 20 }}>
            <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} minTickGap={28} />
            <YAxis domain={["auto", "auto"]} width={90} tickFormatter={(value) => `$${value}`} />
            <Tooltip
              formatter={(value) => `$${formatPrice(Number(value ?? 0))}`}
              labelFormatter={(value) => new Date(value).toLocaleString()}
            />
            <Line type="monotone" dataKey="price" stroke="#26f4c2" strokeWidth={2.2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </section>
  );
}

export function TradingDashboard() {
  const { user } = useAuth();
  const tickersQuery = useQuery({
    queryKey: ["tickers"],
    queryFn: fetchTickers,
    refetchInterval: 15_000,
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  const [threshold, setThreshold] = useState("");

  const symbols = useMemo(() => tickersQuery.data?.map((ticker) => ticker.symbol) ?? [], [tickersQuery.data]);
  const selected = symbols.includes(selectedSymbol) ? selectedSymbol : (symbols[0] ?? "");
  const stream = useMarketSocket(symbols);

  if (!user) {
    return <LoginCard />;
  }

  if (tickersQuery.isLoading) {
    return <EmptyState message="Loading instruments..." />;
  }

  if (tickersQuery.isError || !tickersQuery.data) {
    return <EmptyState message="Failed to load instrument list." />;
  }

  if (!selected) {
    return <EmptyState message="No instruments available." />;
  }

  return (
    <main className="dashboard-shell">
      <Header streamStatus={stream.status} />
      <TickerList
        tickers={tickersQuery.data}
        selected={selected}
        prices={stream.prices}
        onSelect={setSelectedSymbol}
      />
      <PriceChart symbol={selected} prices={stream.prices} threshold={threshold} setThreshold={setThreshold} />
    </main>
  );
}
