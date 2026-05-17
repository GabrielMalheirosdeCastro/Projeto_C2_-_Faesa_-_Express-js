import { z } from 'zod';

export const appointmentStatusEnum = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
]);

export const createAppointmentSchema = z.object({
  serviceId: z.string().min(1),
  scheduledAt: z.coerce.date(),
  notes: z.string().max(2000).optional(),
});

export const updateAppointmentSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  status: appointmentStatusEnum.optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
