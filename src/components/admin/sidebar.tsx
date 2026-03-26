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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Calendars", href: "/admin/calendars", icon: Calendar },
  { label: "Contacts", href: "/admin/contacts", icon: Users },
  { label: "Advertisements", href: "/admin/advertisements", icon: Megaphone },
  { label: "Purchases", href: "/admin/purchases", icon: ShoppingCart },
  { label: "Billing", href: "/admin/billing", icon: CreditCard },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Layouts", href: "/admin/layouts", icon: Grid3X3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Calendar className="h-5 w-5" />
          <span>Planner App</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}

export function AdminSidebarMobile({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <nav className="flex flex-col gap-1 px-2 py-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
      {children}
    </nav>
  );
}
