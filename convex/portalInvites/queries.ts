import { query } from "../_generated/server";
import { v } from "convex/values";

export const getByContact = query({
  args: {
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const orgId = identity.orgId as string;
    if (!orgId) return null;

    const invites = await ctx.db
      .query("portalInvites")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .collect();

    const orgInvites = invites.filter((inv) => inv.orgId === orgId);

    const pending = orgInvites.find(
      (inv) => inv.status === "pending" && inv.expiresAt > Date.now()
    );
    if (pending) return pending;

    const redeemed = orgInvites.find((inv) => inv.status === "redeemed");
    if (redeemed) return redeemed;

    return null;
  },
});

export const validateToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("portalInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) {
      return { valid: false, error: "Invalid invite link" } as const;
    }

    if (invite.status !== "pending") {
      const error =
        invite.status === "redeemed"
          ? "This invite has already been used"
          : invite.status === "revoked"
            ? "This invite has been revoked"
            : "This invite has expired";
      return { valid: false, error } as const;
    }

    if (invite.expiresAt < Date.now()) {
      return { valid: false, error: "This invite has expired" } as const;
    }

    const contact = await ctx.db.get(invite.contactId);
    const orgSettings = await ctx.db
      .query("orgSettings")
      .withIndex("by_orgId", (q) => q.eq("orgId", invite.orgId))
      .first();

    return {
      valid: true,
      orgName: orgSettings?.businessName ?? "the organization",
      contactName: contact
        ? `${contact.firstName} ${contact.lastName}`
        : undefined,
      companyName: contact?.company,
    } as const;
  },
});
