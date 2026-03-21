import { z } from "zod";

export const approveOrRejectSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"], {
    error: "error.approval.invalid_action",
  }),
  notes: z
    .string()
    .max(1000, "error.approval.notes_too_long")
    .optional()
    .nullable(),
});

export type ApproveOrRejectInput = z.infer<typeof approveOrRejectSchema>;
