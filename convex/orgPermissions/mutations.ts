import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../auth.helpers";
import {
  DEFAULT_CONTACT_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
} from "../permissions";

export const grantPermission = mutation({
  args: {
    userId: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("contact"),
      v.literal("user")
    ),
    permissions: v.optional(v.array(v.string())),
    contactId: v.optional(v.id("contacts")),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    if (args.role === "contact" && !args.contactId) {
      throw new Error("contactId is required for contact role");
    }

    const existing = await ctx.db
      .query("orgPermissions")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", args.userId).eq("orgId", orgId)
      )
      .first();

    if (existing) {
      throw new Error("User already has a permission grant for this organization");
    }

    if (args.contactId) {
      const contact = await ctx.db.get(args.contactId);
      if (!contact || contact.orgId !== orgId) {
        throw new Error("Contact not found");
      }

      const existingContactGrant = await ctx.db
        .query("orgPermissions")
        .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
        .filter((q) => q.eq(q.field("orgId"), orgId))
        .first();
      if (existingContactGrant) {
        throw new Error("This contact already has a linked account");
      }
    }

    return await ctx.db.insert("orgPermissions", {
      userId: args.userId,
      orgId,
      role: args.role,
      permissions: args.permissions ?? [],
      contactId: args.contactId,
      isActive: true,
    });
  },
});

export const revokePermission = mutation({
  args: { id: v.id("orgPermissions") },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const grant = await ctx.db.get(args.id);
    if (!grant || grant.orgId !== orgId) throw new Error("Not found");

    await ctx.db.delete(args.id);
  },
});

export const toggleActive = mutation({
  args: {
    id: v.id("orgPermissions"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const grant = await ctx.db.get(args.id);
    if (!grant || grant.orgId !== orgId) throw new Error("Not found");

    await ctx.db.patch(args.id, { isActive: args.isActive });
  },
});

export const updatePermissions = mutation({
  args: {
    id: v.id("orgPermissions"),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const grant = await ctx.db.get(args.id);
    if (!grant || grant.orgId !== orgId) throw new Error("Not found");

    await ctx.db.patch(args.id, { permissions: args.permissions });
  },
});

export const linkContact = mutation({
  args: {
    userId: v.string(),
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.orgId !== orgId) {
      throw new Error("Contact not found");
    }

    const existingContactGrant = await ctx.db
      .query("orgPermissions")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .filter((q) => q.eq(q.field("orgId"), orgId))
      .first();
    if (existingContactGrant) {
      if (existingContactGrant.userId === args.userId) {
        return existingContactGrant._id;
      }
      throw new Error("This contact already has a linked client account");
    }

    const existingUserGrant = await ctx.db
      .query("orgPermissions")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", args.userId).eq("orgId", orgId)
      )
      .first();
    if (existingUserGrant) {
      if (existingUserGrant.contactId === args.contactId) {
        return existingUserGrant._id;
      }
      throw new Error("This user ID is already linked to another contact");
    }

    return await ctx.db.insert("orgPermissions", {
      userId: args.userId,
      orgId,
      role: "contact",
      permissions: [],
      contactId: args.contactId,
      isActive: true,
    });
  },
});

export const unlinkContact = mutation({
  args: { id: v.id("orgPermissions") },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const grant = await ctx.db.get(args.id);
    if (!grant || grant.orgId !== orgId) throw new Error("Not found");
    if (grant.role !== "contact") {
      throw new Error("Can only unlink contact-role grants");
    }

    await ctx.db.delete(args.id);
  },
});

export const updateDefaults = mutation({
  args: {
    contactDefaults: v.array(v.string()),
    userDefaults: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const existing = await ctx.db
      .query("orgPermissionDefaults")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        contactDefaults: args.contactDefaults,
        userDefaults: args.userDefaults,
      });
      return existing._id;
    }

    return await ctx.db.insert("orgPermissionDefaults", {
      orgId,
      contactDefaults: args.contactDefaults,
      userDefaults: args.userDefaults,
    });
  },
});

export const ensureDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireAuth(ctx);

    const existing = await ctx.db
      .query("orgPermissionDefaults")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("orgPermissionDefaults", {
      orgId,
      contactDefaults: [...DEFAULT_CONTACT_PERMISSIONS],
      userDefaults: [...DEFAULT_USER_PERMISSIONS],
    });
  },
});
