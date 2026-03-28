import { internalMutation } from "../_generated/server";
import { DEFAULT_CONTACT_PERMISSIONS, DEFAULT_USER_PERMISSIONS } from "../permissions";

/**
 * One-time migration: converts clientLinks rows into orgPermissions rows.
 * Also seeds orgPermissionDefaults for each org that has clientLinks.
 *
 * Run via Convex dashboard: npx convex run migrations/migrateClientLinks:migrate
 *
 * Idempotent: skips clientLinks that already have a matching orgPermissions row.
 */
export const migrate = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allLinks = await ctx.db.query("clientLinks").collect();

    let migrated = 0;
    let skipped = 0;
    const seededOrgs = new Set<string>();

    for (const link of allLinks) {
      const existing = await ctx.db
        .query("orgPermissions")
        .withIndex("by_userId_and_orgId", (q) =>
          q.eq("userId", link.userId).eq("orgId", link.orgId)
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      const contactGrant = await ctx.db
        .query("orgPermissions")
        .withIndex("by_contactId", (q) => q.eq("contactId", link.contactId))
        .first();

      if (contactGrant) {
        skipped++;
        continue;
      }

      await ctx.db.insert("orgPermissions", {
        userId: link.userId,
        orgId: link.orgId,
        role: "contact",
        permissions: [],
        contactId: link.contactId,
        isActive: true,
      });
      migrated++;

      if (!seededOrgs.has(link.orgId)) {
        const existingDefaults = await ctx.db
          .query("orgPermissionDefaults")
          .withIndex("by_orgId", (q) => q.eq("orgId", link.orgId))
          .first();

        if (!existingDefaults) {
          await ctx.db.insert("orgPermissionDefaults", {
            orgId: link.orgId,
            contactDefaults: [...DEFAULT_CONTACT_PERMISSIONS],
            userDefaults: [...DEFAULT_USER_PERMISSIONS],
          });
        }
        seededOrgs.add(link.orgId);
      }
    }

    return { migrated, skipped, total: allLinks.length };
  },
});
