import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { sendStatementEmail } from "@/lib/email/send-statement";
import { sendPurchaseStatementEmail } from "@/lib/email/send-purchase-statement";

export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { contactId, purchaseId } = body as {
    contactId?: string;
    purchaseId?: string;
  };

  if (!contactId && !purchaseId) {
    return NextResponse.json(
      { error: "Missing contactId or purchaseId" },
      { status: 400 }
    );
  }

  try {
    if (purchaseId) {
      await sendPurchaseStatementEmail(
        purchaseId as Id<"purchases">,
        orgId
      );
    } else {
      await sendStatementEmail(contactId as Id<"contacts">, orgId);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
