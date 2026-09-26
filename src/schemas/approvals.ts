import { z } from "zod";

export const UrgencySchema = z.enum(["high", "medium", "low"]);

export const ApprovalItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["Folder", "Demo Video", "PDF", "Image"]),
  submittedBy: z.string().min(1),
  status: z.literal("Pending Review"),
  submittedAt: z.string().datetime(),
  urgency: UrgencySchema,
  tags: z.array(z.string()).default([]),
});

export const ApprovalQueueSchema = z.array(ApprovalItemSchema);

export type ApprovalItem = z.infer<typeof ApprovalItemSchema>;
export type Urgency = z.infer<typeof UrgencySchema>;
