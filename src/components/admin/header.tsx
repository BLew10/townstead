"use client";

import { useState } from "react";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { AdminSidebarMobile } from "./sidebar";

export function AdminHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AdminSidebarMobile>
            <div className="mt-4 border-t pt-4 px-3">
              <OrganizationSwitcher />
            </div>
          </AdminSidebarMobile>
        </SheetContent>
      </Sheet>

      <div className="hidden md:block">
        <OrganizationSwitcher />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <UserButton />
      </div>
    </header>
  );
}
