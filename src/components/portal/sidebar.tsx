"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  CreditCard,
  FileText,
  ImageIcon,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePortalAuth } from "@/hooks/use-portal-auth";
import { PERMISSIONS } from "../../../convex/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  permission?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard, color: "text-blue-500", permission: PERMISSIONS.PORTAL_VIEW },
  { label: "My Ads", href: "/portal/ads", icon: Megaphone, color: "text-orange-500", permission: PERMISSIONS.PORTAL_VIEW },
  { label: "Payments", href: "/portal/payments", icon: CreditCard, color: "text-emerald-500", permission: PERMISSIONS.PORTAL_PAYMENTS },
  { label: "Invoices", href: "/portal/invoices", icon: FileText, color: "text-violet-500", permission: PERMISSIONS.PORTAL_INVOICES },
  { label: "Assets", href: "/portal/assets", icon: ImageIcon, color: "text-rose-500", permission: PERMISSIONS.PORTAL_ASSETS },
];

const profileItem: NavItem = {
  label: "My Profile",
  href: "/portal/profile",
  icon: UserCircle,
  color: "text-gray-500",
};

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const isActive =
    item.href === "/portal"
      ? pathname === "/portal"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? "border-l-3 border-primary bg-primary/10 text-foreground font-semibold"
          : "border-l-3 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className={cn("h-4 w-4", item.color)} />
      {item.label}
    </Link>
  );
}

export function PortalSidebar() {
  const pathname = usePathname();
  const { permissions } = usePortalAuth();

  const visibleItems = navItems.filter(
    (item) => !item.permission || permissions.includes(item.permission)
  );

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/portal" className="flex items-center gap-2 font-semibold">
          <LayoutDashboard className="h-4 w-4 text-primary" />
          Client Portal
        </Link>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {visibleItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
          <div className="my-2 border-t border-border/40" />
          <NavLink item={profileItem} pathname={pathname} />
        </nav>
      </ScrollArea>
    </aside>
  );
}

export function PortalSidebarMobile({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { permissions } = usePortalAuth();

  const visibleItems = navItems.filter(
    (item) => !item.permission || permissions.includes(item.permission)
  );

  return (
    <nav className="flex flex-col gap-1 px-2 py-2">
      {visibleItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onClick={onNavigate} />
      ))}
      <div className="my-2 border-t border-border/40" />
      <NavLink item={profileItem} pathname={pathname} onClick={onNavigate} />
    </nav>
  );
}
