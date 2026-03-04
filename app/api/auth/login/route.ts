import { NextRequest, NextResponse } from "next/server";
import { DEMO_PASSWORD, DEMO_USERNAME } from "@/lib/auth/credentials";

interface LoginBody {
  username?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as LoginBody;
  const username = body.username?.trim();
  const password = body.password?.trim();

  if (!username || !password) {
    return NextResponse.json({ error: "username and password are required" }, { status: 400 });
  }

  if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");

  return NextResponse.json({
    token,
    user: {
      id: username.toLowerCase().replace(/\s+/g, "-"),
      name: "Senior Trader",
      role: "Trader",
    },
  });
}
