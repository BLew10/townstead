import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { truncate } from "@/lib/seo";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const event = await fetchQuery(api.public.queries.getEvent, {
      id: id as Id<"events">,
    });

    if (!event) return { title: "Event Not Found" };

    const title = event.name;
    const description = event.description
      ? truncate(event.description, 160)
      : undefined;
    const eventDate = new Date(event.date);

    return {
      title,
      ...(description && { description }),
      openGraph: {
        title,
        ...(description && { description }),
        type: "article",
      },
      other: {
        "event:start_date": eventDate.toISOString(),
        ...(event.location && { "event:location": event.location }),
      },
    };
  } catch {
    return { title: "Event" };
  }
}

export default function EventDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
