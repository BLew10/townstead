"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface PublicFooterProps {
  orgSlug: string;
}

const QUICK_LINKS = [
  { label: "Events Calendar", segment: "events" },
  { label: "Business Directory", segment: "directory" },
  { label: "Member Coupons", segment: "coupons" },
  { label: "Local Blog", segment: "blog" },
  { label: "Videos", segment: "videos" },
];

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter / X",
  youtube: "YouTube",
};

export function PublicFooter({ orgSlug }: PublicFooterProps) {
  const branding = useQuery(api.tenantBranding.queries.getBySlug, { orgSlug });

  const siteName = branding?.siteName ?? "Community";
  const footerText = branding?.footerText;
  const socialLinks = branding?.socialLinks;
  const year = new Date().getFullYear();

  const activeSocials = socialLinks
    ? Object.entries(socialLinks).filter(
        ([, url]) => !!url
      ) as [string, string][]
    : [];

  return (
    <footer className="mt-24 w-full rounded-t-[3rem] bg-surface-container-low">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-8 py-20 md:grid-cols-4">
        {/* Brand column */}
        <div className="md:col-span-1">
          <Link
            href={`/${orgSlug}`}
            className="mb-6 block font-headline text-xl italic text-primary"
          >
            {siteName}
          </Link>
          {footerText && (
            <p className="mb-8 text-sm leading-relaxed text-on-surface/70">
              {footerText}
            </p>
          )}
          {activeSocials.length > 0 && (
            <div className="flex gap-4">
              {activeSocials.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-surface-container p-2 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label={SOCIAL_LABELS[platform] ?? platform}
                >
                  <span className="text-sm font-semibold">
                    {(SOCIAL_LABELS[platform] ?? platform).charAt(0)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="md:col-span-1">
          <h6 className="mb-6 text-sm font-bold uppercase tracking-widest text-on-surface/50">
            Quick Links
          </h6>
          <ul className="space-y-4">
            {QUICK_LINKS.map(({ label, segment }) => (
              <li key={segment}>
                <Link
                  href={`/${orgSlug}/${segment}`}
                  className="block text-sm text-on-surface/70 transition-all duration-200 hover:translate-x-1 hover:text-primary"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div className="md:col-span-1">
          <h6 className="mb-6 text-sm font-bold uppercase tracking-widest text-on-surface/50">
            Company
          </h6>
          <ul className="space-y-4">
            <li>
              <span className="block text-sm text-on-surface/70">About Us</span>
            </li>
            <li>
              <span className="block text-sm text-on-surface/70">Contact</span>
            </li>
            <li>
              <span className="block text-sm text-on-surface/70">
                Privacy Policy
              </span>
            </li>
            <li>
              <span className="block text-sm text-on-surface/70">
                Terms of Service
              </span>
            </li>
          </ul>
        </div>

        {/* Operator info */}
        <div className="md:col-span-1">
          <h6 className="mb-6 text-sm font-bold uppercase tracking-widest text-on-surface/50">
            Operator Info
          </h6>
          <div className="rounded-lg bg-surface-container p-6">
            <p className="mb-2 text-sm font-bold text-primary">{siteName}</p>
            {footerText && (
              <p className="mb-4 text-xs italic leading-relaxed text-on-surface/70">
                {footerText}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-on-surface/5 px-8 py-10 md:flex-row">
        <p className="text-xs text-on-surface/50">
          &copy; {year} {siteName}. All rights reserved.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-on-surface/30">
            Built for
          </span>
          <span className="font-headline text-sm italic text-primary">
            The Community
          </span>
        </div>
      </div>
    </footer>
  );
}
