"use client";

import { PortalSidebar } from "@/components/portal/sidebar";
import { PortalHeader } from "@/components/portal/header";
import { usePortalAuth } from "@/hooks/use-portal-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isLinked } = usePortalAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </div>
    );
  }

  if (!isLinked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">
          Account Not Linked
        </h1>
        <p className="mt-2 max-w-md text-center text-muted-foreground">
          Your account has not been linked to a client profile yet. Please
          contact your account administrator to get portal access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <PortalSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
