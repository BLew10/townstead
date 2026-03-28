import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexClient } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { buildEventExportMonthGroups } from "@/lib/events-export";
import { generateEventsExportPdf } from "@/lib/pdf/events-export";

export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const yearStr = searchParams.get("year");

  if (!yearStr) {
    return NextResponse.json({ error: "Missing year" }, { status: 400 });
  }

  const year = parseInt(yearStr, 10);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const convex = getConvexClient();
  const communityIdParam = searchParams.get("communityId");

  let communityId: Id<"communities"> | null = null;
  let editionLabel: string | undefined;
  let communitySlug = "";

  if (communityIdParam) {
    const community = await convex.query(api.communities.queries.getById, {
      id: communityIdParam as Id<"communities">,
    });
    if (!community || community.orgId !== orgId || community.isDeleted) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    communityId = community._id;
    editionLabel = `Community: ${community.name}`;
    communitySlug = community.slug || community.name.replace(/[^\w\-]+/g, "-").replace(/^-|-$/g, "") || "community";
  }

  const events = await convex.query(api.events.queries.list, { orgId });
  const months = buildEventExportMonthGroups(events, year, communityId);

  const pdfBytes = await generateEventsExportPdf({
    year,
    editionLabel,
    months,
  });

  const filename = communitySlug
    ? `events-${year}-${communitySlug}.pdf`
    : `events-calendar-${year}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
