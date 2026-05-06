"use client";

import { useAuth } from "@clerk/nextjs";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, orgRole, orgId } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8">
        <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">
          No Organization Selected
        </h1>
        <p className="mt-2 max-w-md text-center text-muted-foreground">
          Please select an organization to access the admin dashboard.
        </p>
      </div>
    );
  }

  if (orgRole !== "org:admin") {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8">
        <ShieldAlert className="mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
        <p className="mt-2 max-w-md text-center text-muted-foreground">
          You don&apos;t have permission to access the admin dashboard. Contact
          your organization administrator if you believe this is an error.
        </p>
        <Button render={<Link href="/" />} className="mt-6">
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <AdminBreadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
