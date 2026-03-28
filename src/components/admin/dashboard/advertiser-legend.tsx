"use client";

import { getContactColor, getContrastText } from "@/lib/colors";

interface LegendContact {
  id: string;
  company: string;
}

export function AdvertiserLegend({ contacts }: { contacts: LegendContact[] }) {
  if (contacts.length === 0) return null;

  return (
    <div className="rounded-md border p-4 print:hidden">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        Advertiser Legend
      </h3>
      <div className="flex flex-wrap gap-2">
        {contacts.map((contact) => {
          const bg = getContactColor(contact.id);
          const fg = getContrastText(bg);
          return (
            <span
              key={contact.id}
              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: bg, color: fg }}
            >
              {contact.company}
            </span>
          );
        })}
      </div>
    </div>
  );
}
