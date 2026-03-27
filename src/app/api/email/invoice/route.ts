import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { sendInvoiceEmail } from "@/lib/email/send-invoice";

export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { purchaseId } = body as { purchaseId: string };

  if (!purchaseId) {
    return NextResponse.json(
      { error: "Missing purchaseId" },
      { status: 400 }
    );
  }

  try {
    await sendInvoiceEmail(purchaseId as Id<"purchases">, orgId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
