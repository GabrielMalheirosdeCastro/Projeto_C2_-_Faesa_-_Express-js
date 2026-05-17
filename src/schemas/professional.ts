import { z } from 'zod';

export const createProfessionalSchema = z.object({
  specialty: z.string().min(2).max(120),
  bio: z.string().max(2000).optional(),
});

export const updateProfessionalSchema = createProfessionalSchema.partial();

export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>;
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;
