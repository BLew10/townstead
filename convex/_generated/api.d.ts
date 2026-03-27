/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adPlacements_mutations from "../adPlacements/mutations.js";
import type * as adPlacements_queries from "../adPlacements/queries.js";
import type * as adPricing_mutations from "../adPricing/mutations.js";
import type * as adPricing_queries from "../adPricing/queries.js";
import type * as adSlots_queries from "../adSlots/queries.js";
import type * as addressBooks_mutations from "../addressBooks/mutations.js";
import type * as addressBooks_queries from "../addressBooks/queries.js";
import type * as advertisements_mutations from "../advertisements/mutations.js";
import type * as advertisements_queries from "../advertisements/queries.js";
import type * as billing_helpers from "../billing/helpers.js";
import type * as billing_queries from "../billing/queries.js";
import type * as blog_mutations from "../blog/mutations.js";
import type * as blog_queries from "../blog/queries.js";
import type * as calendarEditionLayouts_mutations from "../calendarEditionLayouts/mutations.js";
import type * as calendarEditionLayouts_queries from "../calendarEditionLayouts/queries.js";
import type * as calendarEditions_mutations from "../calendarEditions/mutations.js";
import type * as calendarEditions_queries from "../calendarEditions/queries.js";
import type * as categories_mutations from "../categories/mutations.js";
import type * as categories_queries from "../categories/queries.js";
import type * as clientAssets_mutations from "../clientAssets/mutations.js";
import type * as clientAssets_queries from "../clientAssets/queries.js";
import type * as clientLinks_mutations from "../clientLinks/mutations.js";
import type * as clientLinks_queries from "../clientLinks/queries.js";
import type * as communities_mutations from "../communities/mutations.js";
import type * as communities_queries from "../communities/queries.js";
import type * as contacts_mutations from "../contacts/mutations.js";
import type * as contacts_queries from "../contacts/queries.js";
import type * as coupons_mutations from "../coupons/mutations.js";
import type * as coupons_queries from "../coupons/queries.js";
import type * as dashboard_queries from "../dashboard/queries.js";
import type * as events_mutations from "../events/mutations.js";
import type * as events_queries from "../events/queries.js";
import type * as files from "../files.js";
import type * as layouts_mutations from "../layouts/mutations.js";
import type * as layouts_queries from "../layouts/queries.js";
import type * as messages_mutations from "../messages/mutations.js";
import type * as messages_queries from "../messages/queries.js";
import type * as migration from "../migration.js";
import type * as payments_mutations from "../payments/mutations.js";
import type * as payments_queries from "../payments/queries.js";
import type * as portal_queries from "../portal/queries.js";
import type * as public_mutations from "../public/mutations.js";
import type * as public_queries from "../public/queries.js";
import type * as purchases_mutations from "../purchases/mutations.js";
import type * as purchases_queries from "../purchases/queries.js";
import type * as scheduledPayments_mutations from "../scheduledPayments/mutations.js";
import type * as scheduledPayments_queries from "../scheduledPayments/queries.js";
import type * as settings_mutations from "../settings/mutations.js";
import type * as settings_queries from "../settings/queries.js";
import type * as storage from "../storage.js";
import type * as tenantBranding_mutations from "../tenantBranding/mutations.js";
import type * as tenantBranding_queries from "../tenantBranding/queries.js";
import type * as videos_mutations from "../videos/mutations.js";
import type * as videos_queries from "../videos/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "adPlacements/mutations": typeof adPlacements_mutations;
  "adPlacements/queries": typeof adPlacements_queries;
  "adPricing/mutations": typeof adPricing_mutations;
  "adPricing/queries": typeof adPricing_queries;
  "adSlots/queries": typeof adSlots_queries;
  "addressBooks/mutations": typeof addressBooks_mutations;
  "addressBooks/queries": typeof addressBooks_queries;
  "advertisements/mutations": typeof advertisements_mutations;
  "advertisements/queries": typeof advertisements_queries;
  "billing/helpers": typeof billing_helpers;
  "billing/queries": typeof billing_queries;
  "blog/mutations": typeof blog_mutations;
  "blog/queries": typeof blog_queries;
  "calendarEditionLayouts/mutations": typeof calendarEditionLayouts_mutations;
  "calendarEditionLayouts/queries": typeof calendarEditionLayouts_queries;
  "calendarEditions/mutations": typeof calendarEditions_mutations;
  "calendarEditions/queries": typeof calendarEditions_queries;
  "categories/mutations": typeof categories_mutations;
  "categories/queries": typeof categories_queries;
  "clientAssets/mutations": typeof clientAssets_mutations;
  "clientAssets/queries": typeof clientAssets_queries;
  "clientLinks/mutations": typeof clientLinks_mutations;
  "clientLinks/queries": typeof clientLinks_queries;
  "communities/mutations": typeof communities_mutations;
  "communities/queries": typeof communities_queries;
  "contacts/mutations": typeof contacts_mutations;
  "contacts/queries": typeof contacts_queries;
  "coupons/mutations": typeof coupons_mutations;
  "coupons/queries": typeof coupons_queries;
  "dashboard/queries": typeof dashboard_queries;
  "events/mutations": typeof events_mutations;
  "events/queries": typeof events_queries;
  files: typeof files;
  "layouts/mutations": typeof layouts_mutations;
  "layouts/queries": typeof layouts_queries;
  "messages/mutations": typeof messages_mutations;
  "messages/queries": typeof messages_queries;
  migration: typeof migration;
  "payments/mutations": typeof payments_mutations;
  "payments/queries": typeof payments_queries;
  "portal/queries": typeof portal_queries;
  "public/mutations": typeof public_mutations;
  "public/queries": typeof public_queries;
  "purchases/mutations": typeof purchases_mutations;
  "purchases/queries": typeof purchases_queries;
  "scheduledPayments/mutations": typeof scheduledPayments_mutations;
  "scheduledPayments/queries": typeof scheduledPayments_queries;
  "settings/mutations": typeof settings_mutations;
  "settings/queries": typeof settings_queries;
  storage: typeof storage;
  "tenantBranding/mutations": typeof tenantBranding_mutations;
  "tenantBranding/queries": typeof tenantBranding_queries;
  "videos/mutations": typeof videos_mutations;
  "videos/queries": typeof videos_queries;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
