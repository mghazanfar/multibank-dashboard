import { MarketSimulator } from "./market-simulator";

declare global {
  var __marketSimulator: MarketSimulator | undefined;
}

const simulator = globalThis.__marketSimulator ?? new MarketSimulator();

if (!globalThis.__marketSimulator) {
  simulator.start();
  globalThis.__marketSimulator = simulator;
}

export const marketSimulator = simulator;
