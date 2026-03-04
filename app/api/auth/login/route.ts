import { NextRequest, NextResponse } from "next/server";

interface LoginBody {
  username?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as LoginBody;

  if (!body.username || !body.password) {
    return NextResponse.json({ error: "username and password are required" }, { status: 400 });
  }

  const token = Buffer.from(`${body.username}:${Date.now()}`).toString("base64");

  return NextResponse.json({
    token,
    user: {
      id: body.username.toLowerCase().replace(/\s+/g, "-"),
      name: body.username,
      role: "Trader",
    },
  });
}
