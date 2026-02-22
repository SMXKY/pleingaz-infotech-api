import { z } from "zod";

export const createAdminConfigSchema = z.object({
  companyEmail: z.string().email(),
  supportEmail: z.string().email(),
  companyPhoneNumber: z.string().min(8).max(20),
  companyPrefix: z.string().min(2).max(10).default("INF"),
  logoUrl: z.string().url().optional(),
});

export const updateAdminConfigSchema = z.object({
  companyEmail: z.string().email().optional(),
  supportEmail: z.string().email().optional(),
  companyPhoneNumber: z.string().min(8).max(20).optional(),
  companyPrefix: z.string().min(2).max(10).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export type CreateAdminConfigInput = z.infer<typeof createAdminConfigSchema>;
export type UpdateAdminConfigInput = z.infer<typeof updateAdminConfigSchema>;
