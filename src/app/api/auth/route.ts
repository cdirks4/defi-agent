import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";

const privy = new PrivyClient(
  process.env.PRIVY_SECRET_KEY!,
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!
);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    // Verify the user's authentication token
    const { userId } = await privy.verifyAuthToken(token);

    return NextResponse.json({
      authenticated: true,
      userId,
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}
