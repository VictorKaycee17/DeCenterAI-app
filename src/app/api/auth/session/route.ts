import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { wallet } = await req.json();

  (await cookies()).set("tw_wallet", wallet, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  (await cookies()).delete("tw_wallet");
  return NextResponse.json({ success: true });
}
