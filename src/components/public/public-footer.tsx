"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCommunityFilter } from "@/hooks/use-community-filter";

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

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 1.09.05 1.573.1V8.07c-.48-.05-.826-.075-1.252-.075-1.776 0-2.464.673-2.464 2.423v1.627h3.525l-.605 3.667h-2.92v8.196C19.396 23.2 24 18.15 24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.628 3.874 10.35 9.101 11.691" />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7.03.084c-1.277.06-2.149.264-2.913.558a5.88 5.88 0 0 0-2.126 1.384A5.88 5.88 0 0 0 .607 4.152C.314 4.916.11 5.788.05 7.065.01 7.97 0 8.268 0 12.002s.01 4.032.05 4.937c.06 1.277.264 2.149.558 2.913.306.789.718 1.459 1.384 2.126A5.88 5.88 0 0 0 4.152 23.36c.764.294 1.636.498 2.913.558C7.97 23.96 8.268 24 12.002 24s4.032-.04 4.937-.08c1.277-.06 2.149-.264 2.913-.558a5.88 5.88 0 0 0 2.126-1.384 5.88 5.88 0 0 0 1.384-2.126c.294-.764.498-1.636.558-2.913.04-.905.08-1.203.08-4.937s-.04-4.032-.08-4.937c-.06-1.277-.264-2.149-.558-2.913a5.88 5.88 0 0 0-1.384-2.126A5.88 5.88 0 0 0 19.852.607C19.088.314 18.216.11 16.939.05 16.034.01 15.736 0 12.002 0S7.97.01 7.03.084m.14 21.693c-1.17-.054-1.805-.249-2.228-.415a3.72 3.72 0 0 1-1.382-.895 3.72 3.72 0 0 1-.895-1.382c-.166-.423-.361-1.058-.415-2.228-.06-1.265-.072-1.644-.072-4.848s.012-3.584.072-4.849c.054-1.17.249-1.805.415-2.228.218-.561.48-.96.895-1.382a3.72 3.72 0 0 1 1.382-.895c.423-.166 1.058-.361 2.228-.415C8.394 2.088 8.773 2.074 12 2.074s3.606.014 4.83.072c1.17.054 1.805.249 2.228.415.561.218.96.48 1.382.895.415.422.677.82.895 1.382.166.423.361 1.058.415 2.228.058 1.265.072 1.644.072 4.849s-.014 3.583-.072 4.848c-.054 1.17-.249 1.805-.415 2.228-.218.561-.48.96-.895 1.382a3.72 3.72 0 0 1-1.382.895c-.423.166-1.058.361-2.228.415-1.265.06-1.644.072-4.849.072s-3.584-.012-4.849-.072m9.783-16.192a1.44 1.44 0 1 0 1.44-1.44 1.44 1.44 0 0 0-1.44 1.44M5.838 12.002a6.163 6.163 0 1 0 12.326 0 6.163 6.163 0 0 0-12.326 0M8 12.002a4 4 0 1 1 4.002 4 4 4 0 0 1-4.002-4" />
    </svg>
  );
}

function XTwitterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

function YouTubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.186a3.02 3.02 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.02 3.02 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.02 3.02 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.02 3.02 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814M9.545 15.568V8.432L15.818 12z" />
    </svg>
  );
}

const SOCIAL_CONFIG: Record<string, { label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  facebook: { label: "Facebook", icon: FacebookIcon },
  instagram: { label: "Instagram", icon: InstagramIcon },
  twitter: { label: "Twitter / X", icon: XTwitterIcon },
  youtube: { label: "YouTube", icon: YouTubeIcon },
};

export function PublicFooter({ orgSlug }: PublicFooterProps) {
  const branding = useQuery(api.tenantBranding.queries.getBySlug, { orgSlug });
  const { buildHref } = useCommunityFilter(orgSlug);

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
              {activeSocials.map(([platform, url]) => {
                const config = SOCIAL_CONFIG[platform];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-surface-container p-2.5 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    aria-label={config.label}
                  >
                    <Icon className="size-5" />
                  </a>
                );
              })}
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
                  href={buildHref(segment)}
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
