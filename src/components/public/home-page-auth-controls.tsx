"use client";

import { useAuth, SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HomePageAuthControls() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <div className="flex gap-2">
        <Button render={<Link href="/auth/redirect" />} variant="outline" size="sm">
          Dashboard
        </Button>
        <SignOutButton redirectUrl="/">
          <Button size="sm">Sign Out</Button>
        </SignOutButton>
      </div>
    );
  }

  return (
    <Button render={<Link href="/auth/login" />} size="sm">
      Sign In
    </Button>
  );
}
