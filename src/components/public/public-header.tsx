"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Menu, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommunityFilter } from "@/hooks/use-community-filter";

const NAV_ITEMS = [
  { label: "Home", segment: "" },
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
  const {
    communitySlug,
    activeCommunity,
    communities,
    buildHref,
    setCommunity,
  } = useCommunityFilter(orgSlug);

  const orgSiteName = branding?.siteName ?? "Community";
  const displayName = activeCommunity?.name ?? orgSiteName;

  function normalizedPath() {
    if (communitySlug) {
      const prefix = `/${orgSlug}/${communitySlug}`;
      if (pathname.startsWith(prefix)) {
        const rest = pathname.slice(prefix.length);
        return `/${orgSlug}${rest}`;
      }
    }
    return pathname;
  }

  function isActive(segment: string) {
    const norm = normalizedPath();
    if (segment === "")
      return norm === `/${orgSlug}` || norm === `/${orgSlug}/`;
    return norm.startsWith(`/${orgSlug}/${segment}`);
  }

  const showCommunityPicker = communities.length > 0;

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-surface/80 glass-nav">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 md:px-8">
          <Link
            href={buildHref("")}
            className="flex items-center gap-3"
          >
            {branding?.logoUrl ? (
              <Image
                src={branding.logoUrl}
                alt={displayName}
                width={160}
                height={48}
                className="h-10 w-auto object-contain"
                priority
              />
            ) : (
              <span className="font-headline text-2xl font-bold italic text-primary">
                {displayName}
              </span>
            )}
            {activeCommunity && (
              <span className="hidden text-xs font-semibold text-on-surface/40 sm:inline">
                {orgSiteName}
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center space-x-8 md:flex">
            {NAV_ITEMS.map(({ label, segment }) => (
              <Link
                key={label}
                href={buildHref(segment)}
                className={cn(
                  "font-body text-sm font-semibold transition-all duration-300",
                  isActive(segment)
                    ? "border-b-2 border-primary pb-1 text-primary"
                    : "text-on-surface/60 hover:text-primary",
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
          <div className="border-t border-outline-variant/20 bg-surface px-4 pb-8 pt-4 sm:px-6 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ label, segment }) => (
                <Link
                  key={label}
                  href={buildHref(segment)}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-3 font-body text-sm font-semibold transition-colors",
                    isActive(segment)
                      ? "bg-surface-container-low text-primary"
                      : "text-on-surface/60 hover:bg-surface-container-low hover:text-primary",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Community picker in mobile nav */}
            {showCommunityPicker && (
              <div className="mt-4 border-t border-outline-variant/20 pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <MapPin className="size-3" />
                  Community
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCommunity(undefined);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      !communitySlug
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-container-low text-on-surface/70",
                    )}
                  >
                    All
                  </button>
                  {communities.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        setCommunity(
                          communitySlug === c.slug ? undefined : c.slug,
                        );
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        communitySlug === c.slug
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-container-low text-on-surface/70",
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

      {/* Community picker — rendered outside nav so it's always in document flow */}
      {showCommunityPicker && (
        <div className="sticky top-20 z-40 border-b border-outline-variant/10 bg-surface/90 backdrop-blur-sm">
          <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6 md:px-8">
            <MapPin
              className="size-3.5 shrink-0 text-on-surface/40"
              strokeWidth={1.5}
            />
            <button
              type="button"
              onClick={() => setCommunity(undefined)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                !communitySlug
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-low text-on-surface/70 hover:bg-surface-container hover:text-on-surface",
              )}
            >
              All
            </button>
            {communities.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() =>
                  setCommunity(communitySlug === c.slug ? undefined : c.slug)
                }
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  communitySlug === c.slug
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-container-low text-on-surface/70 hover:bg-surface-container hover:text-on-surface",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
