import { z } from 'zod';

export class ContactValidation {
  static readonly CREATE = z.object({
    phone: z.string()
    .regex(/^\+?[1-9]\d{8,14}$/, { message: 'Invalid phone number format' })
    .min(10, { message: 'Phone number must have at least 10 characters' })
    .max(20, { message: 'Phone number must not exceed 20 characters' }),
  })

  static readonly UPDATE = z.object({
    phone: z.string()
    .regex(/^\+?[1-9]\d{8,14}$/, { message: 'Invalid phone number format' })
    .min(10, { message: 'Phone number must have at least 10 characters' })
    .max(20, { message: 'Phone number must not exceed 20 characters' }),
  })
}