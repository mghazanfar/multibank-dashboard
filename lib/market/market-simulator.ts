import type { PricePoint, TickMessage, TickerDefinition, TickerSummary } from "../types/market";

const DEFAULT_TICKERS: TickerDefinition[] = [
  { symbol: "AAPL", name: "Apple Inc.", assetClass: "Equity", basePrice: 196.2, volatility: 1.1 },
  { symbol: "TSLA", name: "Tesla Inc.", assetClass: "Equity", basePrice: 207.75, volatility: 2.2 },
  { symbol: "BTC-USD", name: "Bitcoin / US Dollar", assetClass: "Crypto", basePrice: 61450, volatility: 45 },
  { symbol: "ETH-USD", name: "Ethereum / US Dollar", assetClass: "Crypto", basePrice: 3310, volatility: 8.6 },
  { symbol: "MSFT", name: "Microsoft Corp.", assetClass: "Equity", basePrice: 417.1, volatility: 1.4 },
];

type TickListener = (tick: TickMessage) => void;

interface HistoryCacheEntry {
  expiresAt: number;
  payload: PricePoint[];
}

interface MarketSimulatorOptions {
  rng?: () => number;
  now?: () => number;
  tickIntervalMs?: number;
}

export class MarketSimulator {
  private readonly rng: () => number;
  private readonly now: () => number;
  private readonly tickIntervalMs: number;
  private readonly tickers: TickerDefinition[];
  private readonly prices = new Map<string, number>();
  private readonly listeners = new Set<TickListener>();
  private readonly historyCache = new Map<string, HistoryCacheEntry>();
  private timer?: NodeJS.Timeout;

  constructor(options: MarketSimulatorOptions = {}) {
    this.rng = options.rng ?? Math.random;
    this.now = options.now ?? Date.now;
    this.tickIntervalMs = options.tickIntervalMs ?? 1000;
    this.tickers = DEFAULT_TICKERS;

    this.tickers.forEach((ticker) => {
      this.prices.set(ticker.symbol, ticker.basePrice);
    });
  }

  start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.tickOnce();
    }, this.tickIntervalMs);
  }

  stop() {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }

  tickOnce() {
    for (const ticker of this.tickers) {
      const current = this.prices.get(ticker.symbol) ?? ticker.basePrice;
      const centeredRandom = (this.rng() - 0.5) * 2;
      const delta = centeredRandom * ticker.volatility;
      const nextPrice = this.clampPrice(current + delta, ticker.basePrice);

      this.prices.set(ticker.symbol, nextPrice);

      const tick: TickMessage = {
        type: "tick",
        symbol: ticker.symbol,
        price: this.roundPrice(nextPrice),
        change: this.roundPrice(nextPrice - current),
        updatedAt: new Date(this.now()).toISOString(),
      };

      this.listeners.forEach((listener) => listener(tick));
    }
  }

  subscribe(listener: TickListener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  listTickers(): TickerSummary[] {
    const updatedAt = new Date(this.now()).toISOString();

    return this.tickers.map((ticker) => ({
      symbol: ticker.symbol,
      name: ticker.name,
      assetClass: ticker.assetClass,
      price: this.roundPrice(this.prices.get(ticker.symbol) ?? ticker.basePrice),
      updatedAt,
    }));
  }

  getSnapshot(symbol: string): TickerSummary | null {
    const ticker = this.tickers.find((item) => item.symbol === symbol);

    if (!ticker) {
      return null;
    }

    return {
      symbol: ticker.symbol,
      name: ticker.name,
      assetClass: ticker.assetClass,
      price: this.roundPrice(this.prices.get(symbol) ?? ticker.basePrice),
      updatedAt: new Date(this.now()).toISOString(),
    };
  }

  getHistorical(symbol: string, points = 120, intervalMs = 15_000): PricePoint[] | null {
    const ticker = this.tickers.find((item) => item.symbol === symbol);

    if (!ticker) {
      return null;
    }

    const now = this.now();
    const cacheKey = `${symbol}:${points}:${intervalMs}`;
    const cacheEntry = this.historyCache.get(cacheKey);

    if (cacheEntry && cacheEntry.expiresAt > now) {
      return cacheEntry.payload;
    }

    const series: PricePoint[] = [];
    const start = now - points * intervalMs;

    for (let index = 0; index < points; index += 1) {
      const timestamp = start + index * intervalMs;
      const waveA = Math.sin((index + this.seed(symbol)) / 5) * ticker.volatility;
      const waveB = Math.cos((index + this.seed(symbol)) / 11) * ticker.volatility * 0.65;
      const trend = index * ticker.volatility * 0.02;
      const price = ticker.basePrice + waveA + waveB + trend;

      series.push({
        timestamp: new Date(timestamp).toISOString(),
        price: this.roundPrice(price),
      });
    }

    this.historyCache.set(cacheKey, {
      payload: series,
      expiresAt: now + 20_000,
    });

    return series;
  }

  isValidTicker(symbol: string): boolean {
    return this.tickers.some((ticker) => ticker.symbol === symbol);
  }

  private seed(symbol: string): number {
    return symbol.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  }

  private roundPrice(value: number): number {
    return Number(value.toFixed(2));
  }

  private clampPrice(value: number, basePrice: number): number {
    return Math.max(basePrice * 0.4, value);
  }
}
