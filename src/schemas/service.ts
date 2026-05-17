import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  durationMin: z.number().int().positive().max(24 * 60),
  priceCents: z.number().int().nonnegative(),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
