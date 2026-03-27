"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Megaphone,
  ShoppingCart,
  CreditCard,
  CalendarDays,
  Grid3X3,
  BookOpen,
  Globe,
  MapPin,
  FileText,
  Tag,
  Ticket,
  Video,
  Palette,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
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
  icon: LucideIcon;
}

const coreNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Calendars", href: "/admin/calendars", icon: Calendar },
  { label: "Contacts", href: "/admin/contacts", icon: Users },
  { label: "Advertisements", href: "/admin/advertisements", icon: Megaphone },
  { label: "Purchases", href: "/admin/purchases", icon: ShoppingCart },
  { label: "Billing", href: "/admin/billing", icon: CreditCard },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Layouts", href: "/admin/layouts", icon: Grid3X3 },
  { label: "Address Books", href: "/admin/address-books", icon: BookOpen },
];

const communityNavItems: NavItem[] = [
  { label: "Communities", href: "/admin/communities", icon: MapPin },
  { label: "Blog", href: "/admin/blog", icon: FileText },
  { label: "Coupons", href: "/admin/coupons", icon: Ticket },
  { label: "Videos", href: "/admin/videos", icon: Video },
  { label: "Categories", href: "/admin/categories", icon: Tag },
  { label: "Site Branding", href: "/admin/branding", icon: Palette },
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
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        indented && "pl-9",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <item.icon className="size-4" />
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

  return (
    <Collapsible defaultOpen={hasActiveCommunityRoute}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground [&[data-state=open]>svg.chevron]:rotate-180">
        <Globe className="size-4" />
        <span className="flex-1 text-left">Community Site</span>
        <ChevronDown className="chevron size-4 transition-transform duration-200" />
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
          <Calendar className="size-5 text-primary" />
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
      {children}
    </nav>
  );
}
