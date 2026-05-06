import { ShieldX } from "lucide-react";

export function PortalNoAccess() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <ShieldX className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Access Restricted</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        You don&apos;t have permission to view this section. Contact your
        account administrator to request access.
      </p>
    </div>
  );
}
