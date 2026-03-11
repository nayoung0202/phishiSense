import { z } from "zod";

export const PLATFORM_PRODUCT_ID = "PHISHSENSE";
export const PLATFORM_ACTIVE_STATUS = "ACTIVE";

export const platformEntitlementCallbackSchema = z.object({
  version: z.string().trim().min(1),
  eventId: z.string().trim().min(1),
  eventType: z.string().trim().min(1),
  occurredAt: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  entitlement: z.object({
    planCode: z.string().trim().min(1).nullable().optional(),
    status: z.string().trim().min(1),
    seatLimit: z.number().int().nullable().optional(),
    expiresAt: z.string().trim().min(1).nullable().optional(),
    sourceType: z.string().trim().min(1).nullable().optional(),
  }),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const platformMeTenantSchema = z.object({
  tenantId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
});

export const platformCreateTenantResponseSchema = z.object({
  tenantId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
});

export const platformMeProductSchema = z.object({
  tenantId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  status: z.string().trim().min(1),
  plan: z.string().trim().min(1).nullable().optional(),
  seatLimit: z.number().int().nullable().optional(),
  expiresAt: z.string().trim().min(1).nullable().optional(),
});

export const platformMeResponseSchema = z.object({
  userId: z.string().trim().min(1),
  email: z.string().trim().min(1).nullable().optional(),
  hasTenant: z.boolean(),
  currentTenantId: z.string().trim().min(1).nullable(),
  tenants: z.array(platformMeTenantSchema).default([]),
  products: z.array(platformMeProductSchema).default([]),
});

export type PlatformEntitlementCallbackPayload = z.infer<
  typeof platformEntitlementCallbackSchema
>;
export type PlatformMeTenant = z.infer<typeof platformMeTenantSchema>;
export type PlatformMeProduct = z.infer<typeof platformMeProductSchema>;
export type PlatformMeResponse = z.infer<typeof platformMeResponseSchema>;
export type PlatformCreateTenantResponse = z.infer<
  typeof platformCreateTenantResponseSchema
>;

export type PlatformContextStatus =
  | "ready"
  | "dev_bypass"
  | "tenant_missing"
  | "tenant_selection_required"
  | "entitlement_pending"
  | "entitlement_inactive"
  | "platform_token_missing"
  | "platform_not_configured"
  | "platform_unauthorized"
  | "platform_unavailable";
