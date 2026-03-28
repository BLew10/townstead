"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in your .env file");
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 5 * 60 * 1000,
    },
  },
});

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export { convex, queryClient };
