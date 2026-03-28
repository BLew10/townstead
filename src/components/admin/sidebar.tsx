"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Calendar,
  Users,
  Megaphone,
  ShoppingCart,
  Money,
  CreditCard,
  CalendarDots,
  GridNine,
  BookOpen,
  Globe,
  MapPin,
  FileText,
  Tag,
  Ticket,
  VideoCamera,
  Palette,
  GearSix,
  CaretDown,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItem {
  label: string;
  href: string;
  icon: Icon;
  color: string;
}

const coreNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: SquaresFour, color: "text-blue-500" },
  { label: "Calendars", href: "/admin/calendars", icon: Calendar, color: "text-indigo-500" },
  { label: "Contacts", href: "/admin/contacts", icon: Users, color: "text-violet-500" },
  { label: "Advertisements", href: "/admin/advertisements", icon: Megaphone, color: "text-orange-500" },
  { label: "Purchases", href: "/admin/purchases", icon: ShoppingCart, color: "text-emerald-500" },
  { label: "Payments", href: "/admin/payments", icon: Money, color: "text-lime-500" },
  { label: "Billing", href: "/admin/billing", icon: CreditCard, color: "text-rose-500" },
  { label: "Layouts", href: "/admin/layouts", icon: GridNine, color: "text-cyan-500" },
  { label: "Address Books", href: "/admin/address-books", icon: BookOpen, color: "text-amber-500" },
];

const communityNavItems: NavItem[] = [
  { label: "Events", href: "/admin/events", icon: CalendarDots, color: "text-pink-500" },
  { label: "Communities", href: "/admin/communities", icon: MapPin, color: "text-green-500" },
  { label: "Blog", href: "/admin/blog", icon: FileText, color: "text-slate-500" },
  { label: "Coupons", href: "/admin/coupons", icon: Ticket, color: "text-yellow-500" },
  { label: "Videos", href: "/admin/videos", icon: VideoCamera, color: "text-red-500" },
  { label: "Categories", href: "/admin/categories", icon: Tag, color: "text-teal-500" },
  { label: "Site Branding", href: "/admin/branding", icon: Palette, color: "text-purple-500" },
];

const communityPrefixes = communityNavItems.map((item) => item.href);

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  onClick,
  indented,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
  indented?: boolean;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        indented && "pl-9",
        active
          ? "border-l-3 border-primary bg-primary/10 text-foreground font-semibold"
          : "border-l-3 border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <item.icon className={cn("size-5 shrink-0", item.color)} weight="duotone" />
      {item.label}
    </Link>
  );
}

function CommunitySiteGroup({
  pathname,
  onClick,
}: {
  pathname: string;
  onClick?: () => void;
}) {
  const hasActiveCommunityRoute = communityPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const [open, setOpen] = useState(hasActiveCommunityRoute);

  useEffect(() => {
    if (hasActiveCommunityRoute) {
      setOpen(true);
    }
  }, [hasActiveCommunityRoute]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground [&[data-state=open]>svg.chevron]:rotate-180">
        <Globe className="size-5 shrink-0 text-sky-500" weight="duotone" />
        <span className="flex-1 text-left">Community Site</span>
        <CaretDown className="chevron size-4 transition-transform duration-200" weight="bold" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-0.5 pt-0.5">
        {communityNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={onClick}
            indented
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-border/60 bg-sidebar md:flex md:w-64 md:flex-col">
      <div className="flex h-14 items-center border-b border-border/60 px-5">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
        >
          <Calendar className="size-5 text-primary" weight="duotone" />
          <span>Planner App</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-3">
          {coreNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
          <div className="my-2 border-t border-border/40" />
          <CommunitySiteGroup pathname={pathname} />
          <div className="my-2 border-t border-border/40" />
          <NavLink
            item={{ label: "Settings", href: "/admin/settings", icon: GearSix, color: "text-gray-500" }}
            pathname={pathname}
          />
        </nav>
      </ScrollArea>
    </aside>
  );
}

export function AdminSidebarMobile({
  children,
  onNavigate,
}: {
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-3">
      {coreNavItems.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          pathname={pathname}
          onClick={onNavigate}
        />
      ))}
      <div className="my-2 border-t border-border/40" />
      <CommunitySiteGroup pathname={pathname} onClick={onNavigate} />
      <div className="my-2 border-t border-border/40" />
      <NavLink
        item={{ label: "Settings", href: "/admin/settings", icon: GearSix, color: "text-gray-500" }}
        pathname={pathname}
        onClick={onNavigate}
      />
      {children}
    </nav>
  );
}
