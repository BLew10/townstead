"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../../convex/_generated/dataModel";

interface SelectContactProps {
  value: Id<"contacts"> | null;
  onChange: (contactId: Id<"contacts">, contactLabel: string) => void;
}

export function SelectContact({ value, onChange }: SelectContactProps) {
  const { orgId, isReady } = useOrg();
  const contacts = useQuery(
    api.contacts.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const [search, setSearch] = useState("");

  const selectedContact = contacts?.find((c) => c._id === value);

  const filtered = contacts?.filter((c) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(term) ||
      c.lastName.toLowerCase().includes(term) ||
      (c.company ?? "").toLowerCase().includes(term) ||
      (c.email ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Select Contact</h3>
        <p className="text-sm text-muted-foreground">
          Choose the customer or advertiser for this purchase.
        </p>
      </div>

      <Input
        placeholder="Search by name, company, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {selectedContact && (
        <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">
                {selectedContact.firstName} {selectedContact.lastName}
              </p>
              {selectedContact.company && (
                <p className="text-sm text-muted-foreground">
                  {selectedContact.company}
                </p>
              )}
              {selectedContact.email && (
                <p className="text-sm text-muted-foreground">
                  {selectedContact.email}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
        {filtered?.map((contact) => {
          const label = `${contact.company ? contact.company + " — " : ""}${contact.firstName} ${contact.lastName}`;
          const isSelected = value === contact._id;

          return (
            <button
              key={contact._id}
              type="button"
              onClick={() => onChange(contact._id, label)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {contact.firstName} {contact.lastName}
                </p>
                {contact.company && (
                  <p className="truncate text-xs text-muted-foreground">
                    {contact.company}
                  </p>
                )}
              </div>
              {isSelected && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          );
        })}
        {filtered?.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No contacts found.
          </p>
        )}
      </div>
    </div>
  );
}
