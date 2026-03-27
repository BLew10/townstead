"use client";

import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export function OrgSlugShell({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  return (
    <div className="theme-curator flex min-h-screen flex-col bg-surface font-body text-on-surface">
      <PublicHeader orgSlug={orgSlug} />
      <main className="flex-1">{children}</main>
      <PublicFooter orgSlug={orgSlug} />
    </div>
  );
}
