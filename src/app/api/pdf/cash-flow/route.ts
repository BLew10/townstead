import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexClient } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { generateCashFlowPdf } from "@/lib/pdf/cash-flow";

export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const editionId = searchParams.get("editionId");
  const yearStr = searchParams.get("year");

  if (!editionId || !yearStr) {
    return NextResponse.json(
      { error: "Missing editionId or year" },
      { status: 400 }
    );
  }

  const year = parseInt(yearStr, 10);
  const convex = getConvexClient();

  const [report, edition] = await Promise.all([
    convex.query(api.billing.queries.getCashFlowReport, {
      orgId,
      calendarEditionId: editionId as Id<"calendarEditions">,
      year,
    }),
    convex.query(api.calendarEditions.queries.getById, {
      id: editionId as Id<"calendarEditions">,
    }),
  ]);

  const pdfBytes = await generateCashFlowPdf({
    editionName: edition?.name ?? "Unknown",
    year,
    rows: report.rows,
    summary: report.summary,
  });

  const filename = `cash-flow-${edition?.name ?? "report"}-${year}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
