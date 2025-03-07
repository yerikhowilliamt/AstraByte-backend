import { z } from 'zod';

export class UserValidation {
  static readonly UPDATE = z.object({
    name: z
      .string()
      .min(1, {
        message: 'Name cannot be empty.',
      })
      .max(100)
      .default('')
      .optional(),
    password: z
      .string()
      .min(1, {
        message: 'Password must be at least 8 characters long.',
      })
      .max(100)
      .default('')
      .optional(),
    role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
  });
}
