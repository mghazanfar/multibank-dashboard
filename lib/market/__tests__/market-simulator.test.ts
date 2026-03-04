import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { MarketSimulator } from "../market-simulator";

describe("MarketSimulator", () => {
  it("lists supported tickers with current prices", () => {
    const market = new MarketSimulator({ now: () => Date.parse("2026-03-04T08:00:00.000Z") });

    const tickers = market.listTickers();

    assert.ok(tickers.length > 3);
    assert.ok("symbol" in tickers[0]);
    assert.ok("price" in tickers[0]);
  });

  it("emits tick events with valid payload", () => {
    const market = new MarketSimulator({
      rng: () => 0.8,
      now: () => Date.parse("2026-03-04T08:00:00.000Z"),
    });

    const listener = mock.fn();
    market.subscribe(listener);

    market.tickOnce();

    assert.ok(listener.mock.callCount() > 0);
    const firstTick = listener.mock.calls[0].arguments[0] as {
      type: string;
      price: number;
      symbol: string;
    };

    assert.equal(firstTick.type, "tick");
    assert.equal(typeof firstTick.price, "number");
    assert.equal(typeof firstTick.symbol, "string");
  });

  it("caches historical payloads for the same key", () => {
    let now = Date.parse("2026-03-04T08:00:00.000Z");
    const market = new MarketSimulator({
      now: () => now,
    });

    const first = market.getHistorical("AAPL", 50, 10_000);
    const second = market.getHistorical("AAPL", 50, 10_000);

    assert.equal(first, second);

    now += 25_000;
    const third = market.getHistorical("AAPL", 50, 10_000);
    assert.notEqual(third, first);
  });

  it("returns null for unknown symbols", () => {
    const market = new MarketSimulator();

    assert.equal(market.getSnapshot("INVALID"), null);
    assert.equal(market.getHistorical("INVALID"), null);
    assert.equal(market.isValidTicker("INVALID"), false);
  });
});
