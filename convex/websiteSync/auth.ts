import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../auth.helpers";

/**
 * Refuse a backfill to anyone who is not signed in to this publisher.
 *
 * The check lives in a query because that is where `ctx.auth` and the database
 * are both available, and because an action that calls it through `runQuery`
 * still carries the caller's identity.
 *
 * `requireAuth` reads the organisation out of the Clerk token; comparing it to
 * the org passed in is what stops one publisher running a backfill over
 * another's advertisers. The rest of this codebase takes `orgId` as an ordinary
 * argument and trusts it, which is survivable for a screen but not for a
 * function that copies every contact to an external website, so the claim is
 * checked here.
 */
export const assertOwner = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    if (auth.orgId !== args.orgId) {
      throw new Error("You are not signed in to that organization.");
    }
    return true;
  },
});
