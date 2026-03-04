import { NextResponse } from "next/server";
import { marketSimulator } from "@/lib/market/instance";

export async function GET() {
  return NextResponse.json({
    data: marketSimulator.listTickers(),
  });
}
