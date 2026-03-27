import pg from "pg";
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../.env.local") });

export function createPgPool(): pg.Pool {
  const url = process.env.V1_DATABASE_URL;
  if (!url) throw new Error("V1_DATABASE_URL not set in .env.local");
  return new pg.Pool({ connectionString: url });
}

export function createConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not set in .env.local");
  return new ConvexHttpClient(url);
}

export function getOrgId(): string {
  const orgId = process.env.MIGRATION_ORG_ID;
  if (!orgId) throw new Error("MIGRATION_ORG_ID not set in .env.local");
  return orgId;
}

export function decimalToCents(d: string | number | null | undefined): number {
  if (d == null) return 0;
  return Math.round(parseFloat(String(d)) * 100);
}

export function toTimestamp(
  v1Date: string | Date | null | undefined
): number | undefined {
  if (!v1Date) return undefined;
  const d = new Date(v1Date);
  return isNaN(d.getTime()) ? undefined : d.getTime();
}

export function buildSearchText(fields: {
  company?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}): string {
  return [fields.company, fields.firstName, fields.lastName, fields.email, fields.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function normalizeForDedup(
  company: string | null | undefined,
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined
): string {
  return [company, firstName, lastName, email]
    .map((s) => (s ?? "").trim().toLowerCase())
    .join("|");
}

export function log(step: string, msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${step}] ${msg}`);
}

export type MigrationStep = {
  name: string;
  run: (pg: pg.Pool, convex: ConvexHttpClient, orgId: string) => Promise<void>;
};
