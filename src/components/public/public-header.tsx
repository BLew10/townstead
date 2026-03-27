"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Events", segment: "events" },
  { label: "Directory", segment: "directory" },
  { label: "Coupons", segment: "coupons" },
  { label: "Blog", segment: "blog" },
  { label: "Videos", segment: "videos" },
] as const;

interface PublicHeaderProps {
  orgSlug: string;
}

export function PublicHeader({ orgSlug }: PublicHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const branding = useQuery(api.tenantBranding.queries.getBySlug, { orgSlug });

  const siteName = branding?.siteName ?? "Community";

  function isActive(segment: string) {
    return pathname.startsWith(`/${orgSlug}/${segment}`);
  }

  return (
    <nav className="fixed top-0 z-50 w-full bg-surface/80 glass-nav">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">
        <Link
          href={`/${orgSlug}`}
          className="font-headline text-2xl font-bold italic text-primary"
        >
          {siteName}
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center space-x-8 md:flex">
          {NAV_ITEMS.map(({ label, segment }) => (
            <Link
              key={segment}
              href={`/${orgSlug}/${segment}`}
              className={cn(
                "font-body text-sm font-semibold transition-all duration-300",
                isActive(segment)
                  ? "border-b-2 border-primary pb-1 text-primary"
                  : "text-on-surface/60 hover:text-primary"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="rounded-full px-6 py-2.5 font-body text-sm font-semibold text-primary transition-all hover:bg-surface-container-low">
                Login
              </button>
            </SignInButton>
          )}

          {/* Mobile toggle */}
          <button
            className="text-on-surface md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-outline-variant/20 bg-surface px-8 pb-8 pt-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ label, segment }) => (
              <Link
                key={segment}
                href={`/${orgSlug}/${segment}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-4 py-3 font-body text-sm font-semibold transition-colors",
                  isActive(segment)
                    ? "bg-surface-container-low text-primary"
                    : "text-on-surface/60 hover:bg-surface-container-low hover:text-primary"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-6 border-t border-outline-variant/20 pt-6">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="w-full rounded-full bg-primary px-6 py-3 font-body text-sm font-semibold text-primary-foreground">
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
