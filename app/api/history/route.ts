import { NextRequest, NextResponse } from "next/server";
import { marketSimulator } from "@/lib/market/instance";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.toUpperCase();
  const points = Number(request.nextUrl.searchParams.get("points") ?? 120);

  if (!ticker) {
    return NextResponse.json({ error: "ticker query param is required" }, { status: 400 });
  }

  if (!marketSimulator.isValidTicker(ticker)) {
    return NextResponse.json({ error: `Unknown ticker: ${ticker}` }, { status: 404 });
  }

  const sanitizedPoints = Number.isFinite(points) ? Math.max(30, Math.min(500, points)) : 120;
  const history = marketSimulator.getHistorical(ticker, sanitizedPoints);

  return NextResponse.json({
    ticker,
    data: history,
    points: sanitizedPoints,
    cachedForMs: 20000,
  });
}
