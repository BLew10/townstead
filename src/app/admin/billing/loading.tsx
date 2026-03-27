import { TableSkeleton } from "@/components/shared/table-skeleton";

export default function BillingLoading() {
  return <TableSkeleton columns={6} rows={10} />;
}
