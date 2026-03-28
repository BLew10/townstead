import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, requirePublicAuth } from "../auth.helpers";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export const create = mutation({
  args: {
    contactId: v.id("contacts"),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.orgId !== orgId) {
      throw new Error("Contact not found");
    }

    const existingGrant = await ctx.db
      .query("orgPermissions")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .first();
    if (existingGrant) {
      throw new Error("This contact already has portal access");
    }

    const existingInvite = await ctx.db
      .query("portalInvites")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (existingInvite) {
      if (existingInvite.expiresAt > Date.now()) {
        throw new Error("A pending invite already exists for this contact");
      }
      await ctx.db.patch(existingInvite._id, { status: "expired" });
    }

    const token = generateToken();
    const now = Date.now();

    await ctx.db.insert("portalInvites", {
      contactId: args.contactId,
      orgId,
      token,
      permissions: args.permissions,
      expiresAt: now + THIRTY_DAYS_MS,
      status: "pending",
      createdAt: now,
    });

    return token;
  },
});

export const redeem = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePublicAuth(ctx);

    const invite = await ctx.db
      .query("portalInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) {
      throw new Error("Invalid invite link");
    }

    if (invite.status !== "pending") {
      throw new Error(
        invite.status === "redeemed"
          ? "This invite has already been used"
          : invite.status === "revoked"
            ? "This invite has been revoked"
            : "This invite has expired"
      );
    }

    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("This invite has expired");
    }

    const existingGrant = await ctx.db
      .query("orgPermissions")
      .withIndex("by_contactId", (q) => q.eq("contactId", invite.contactId))
      .first();
    if (existingGrant) {
      await ctx.db.patch(invite._id, {
        status: "redeemed",
        redeemedByUserId: userId,
        redeemedAt: Date.now(),
      });
      throw new Error("This contact already has portal access");
    }

    const existingUserGrant = await ctx.db
      .query("orgPermissions")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", userId).eq("orgId", invite.orgId)
      )
      .first();
    if (existingUserGrant) {
      throw new Error("Your account is already linked to another contact");
    }

    await ctx.db.insert("orgPermissions", {
      userId,
      orgId: invite.orgId,
      role: "contact",
      permissions: invite.permissions,
      contactId: invite.contactId,
      isActive: true,
    });

    await ctx.db.patch(invite._id, {
      status: "redeemed",
      redeemedByUserId: userId,
      redeemedAt: Date.now(),
    });

    return { orgId: invite.orgId, contactId: invite.contactId };
  },
});

export const revoke = mutation({
  args: {
    id: v.id("portalInvites"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const invite = await ctx.db.get(args.id);
    if (!invite || invite.orgId !== orgId) {
      throw new Error("Invite not found");
    }

    if (invite.status !== "pending") {
      throw new Error("Can only revoke pending invites");
    }

    await ctx.db.patch(args.id, { status: "revoked" });
  },
});

export const resend = mutation({
  args: {
    id: v.id("portalInvites"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const invite = await ctx.db.get(args.id);
    if (!invite || invite.orgId !== orgId) {
      throw new Error("Invite not found");
    }

    if (invite.status !== "pending") {
      throw new Error("Can only resend pending invites");
    }

    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("This invite has expired");
    }

    return invite.token;
  },
});
