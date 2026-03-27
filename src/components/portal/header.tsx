"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { PortalSidebarMobile } from "./sidebar";
import { usePortalAuth } from "@/hooks/use-portal-auth";

export function PortalHeader() {
  const [open, setOpen] = useState(false);
  const { contact } = usePortalAuth();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="md:hidden" />}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <PortalSidebarMobile onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {contact?.company && (
        <span className="hidden md:block text-sm font-medium">
          {contact.company}
        </span>
      )}

      <div className="ml-auto flex items-center gap-4">
        <UserButton />
      </div>
    </header>
  );
}
