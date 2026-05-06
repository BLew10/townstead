import { mutation, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

async function resolvePortalContact(ctx: MutationCtx): Promise<{
  contactId: Id<"contacts">;
  orgId: string;
  userId: string;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const grant = await ctx.db
    .query("orgPermissions")
    .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
    .filter((q) =>
      q.and(q.eq(q.field("role"), "contact"), q.eq(q.field("isActive"), true))
    )
    .first();

  if (!grant) throw new Error("No portal access");
  if (!grant.contactId) throw new Error("No linked contact");

  return { contactId: grant.contactId, orgId: grant.orgId, userId: identity.subject };
}

export const updateMyProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    company: v.string(),
    phone: v.optional(v.string()),
    cellPhone: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.optional(v.string()),
        street2: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip: v.optional(v.string()),
      })
    ),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contactId } = await resolvePortalContact(ctx);

    const existing = await ctx.db.get(contactId);
    if (!existing) throw new Error("Contact not found");

    const searchText = [args.company, args.firstName, args.lastName, existing.email]
      .filter(Boolean)
      .join(" ");

    await ctx.db.patch(contactId, {
      firstName: args.firstName,
      lastName: args.lastName,
      company: args.company,
      phone: args.phone,
      cellPhone: args.cellPhone,
      address: args.address,
      website: args.website,
      searchText,
      updatedAt: Date.now(),
    });
  },
});
