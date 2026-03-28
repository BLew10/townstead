"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  CreditCard,
  FileText,
  ImageIcon,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard, color: "text-blue-500" },
  { label: "My Ads", href: "/portal/ads", icon: Megaphone, color: "text-orange-500" },
  { label: "Payments", href: "/portal/payments", icon: CreditCard, color: "text-emerald-500" },
  { label: "Invoices", href: "/portal/invoices", icon: FileText, color: "text-violet-500" },
  { label: "Assets", href: "/portal/assets", icon: ImageIcon, color: "text-rose-500" },
  { label: "Messages", href: "/portal/messages", icon: MessageSquare, color: "text-sky-500" },
];

export function PortalSidebar() {
  const pathname = usePathname();

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
          {navItems.map((item) => {
            const isActive =
              item.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
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
          })}
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

  return (
    <nav className="flex flex-col gap-1 px-2 py-2">
      {navItems.map((item) => {
        const isActive =
          item.href === "/portal"
            ? pathname === "/portal"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
      })}
    </nav>
  );
}
