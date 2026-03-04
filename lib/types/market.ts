export type AssetClass = "Equity" | "Crypto";

export interface TickerDefinition {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  basePrice: number;
  volatility: number;
}

export interface TickerSummary {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  price: number;
  updatedAt: string;
}

export interface PricePoint {
  timestamp: string;
  price: number;
}

export interface TickMessage {
  type: "tick";
  symbol: string;
  price: number;
  change: number;
  updatedAt: string;
}
