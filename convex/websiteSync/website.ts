/**
 * The small piece of Supabase's REST API this sync needs.
 *
 * Written by hand rather than pulling in @supabase/supabase-js: Convex actions
 * run on a V8 runtime, the whole client would be carried for four requests, and
 * the JS client's habit of resolving instead of throwing on failure is exactly
 * the habit that hides a broken sync.
 */

export interface WebsiteConfig {
  url: string;
  serviceKey: string;
}

/**
 * Read the website's details from the deployment's environment.
 *
 * Returns null when they are not set, so a preview or development deployment
 * does not write to the live website by accident. The caller is expected to say
 * so out loud rather than treat a missing configuration as a successful sync.
 */
export function readConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): WebsiteConfig | null {
  const url = (env.WEBSITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceKey = env.WEBSITE_SUPABASE_SERVICE_KEY || "";
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

function headers(config: WebsiteConfig, extra: Record<string, string> = {}) {
  return {
    apikey: config.serviceKey,
    Authorization: `Bearer ${config.serviceKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function request(
  config: WebsiteConfig,
  path: string,
  init: RequestInit
): Promise<unknown[]> {
  const response = await fetch(`${config.url}/rest/v1/${path}`, init);
  const text = await response.text();
  if (!response.ok) {
    // PostgREST puts the useful part in the body; the status alone says almost
    // nothing about which column or constraint was the problem.
    throw new Error(`Website replied ${response.status}: ${text.slice(0, 500)}`);
  }
  if (!text) return [];
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

const encode = (value: string) => encodeURIComponent(value);

export interface ProfileRow {
  id: string;
  name?: string;
  contact_email?: string;
  townstead_contact_id?: string | null;
  // Read so the sync can tell an empty gallery from one Joyce has filled. It
  // only ever adds a logo to an empty one.
  photos?: { url?: string }[] | null;
}

/** Rows matching one column exactly. */
export async function findProfiles(
  config: WebsiteConfig,
  column: string,
  value: string
): Promise<ProfileRow[]> {
  const select = "id,name,contact_email,townstead_contact_id,photos";
  const rows = await request(
    config,
    `business_profiles?${column}=eq.${encode(value)}&select=${select}`,
    { method: "GET", headers: headers(config) }
  );
  return rows as ProfileRow[];
}

export async function insertProfile(
  config: WebsiteConfig,
  // `object` rather than Record<string, unknown> so a precisely-typed payload
  // can be passed without a cast; the body is JSON either way.
  payload: object
): Promise<ProfileRow> {
  const rows = await request(config, "business_profiles", {
    method: "POST",
    headers: headers(config, { Prefer: "return=representation" }),
    body: JSON.stringify({ ...payload, created_at: new Date().toISOString() }),
  });
  const row = rows[0] as ProfileRow | undefined;
  if (!row) throw new Error("The website accepted the new business but returned nothing.");
  return row;
}

/**
 * Patch one row, and insist that it actually changed.
 *
 * `return=representation` is not decoration. A PATCH that matches no row is a
 * 200 with an empty body, so without asking for the rows back a sync that
 * updates nothing looks exactly like a sync that worked.
 */
export async function updateProfile(
  config: WebsiteConfig,
  id: string,
  payload: Record<string, unknown>
): Promise<ProfileRow> {
  const rows = await request(config, `business_profiles?id=eq.${encode(id)}`, {
    method: "PATCH",
    headers: headers(config, { Prefer: "return=representation" }),
    body: JSON.stringify(payload),
  });
  const row = rows[0] as ProfileRow | undefined;
  if (!row) throw new Error(`The website has no business with id ${id} to update.`);
  return row;
}
