import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "Missing email parameter" },
      { status: 400 }
    );
  }

  try {
    const clerk = await clerkClient();
    const { data: users } = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    if (users.length === 0) {
      return NextResponse.json({ found: false });
    }

    const user = users[0];
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;

    return NextResponse.json({
      found: true,
      userId: user.id,
      name,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to look up user" },
      { status: 500 }
    );
  }
}
