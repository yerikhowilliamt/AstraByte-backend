import { z } from 'zod';

export class UserValidation {
  static readonly UPDATE = z.object({
    name: z
      .string()
      .min(1, {
        message: 'Name cannot be empty.',
      })
      .max(100)
      .optional(),
    password: z
      .string()
      .min(1, {
        message: 'Password must be at least 8 characters long.',
      })
      .max(100)
      .optional(),
    address: z
      .string()
      .min(1, {
        message: 'Address cannot be empty.',
      })
      .optional(),
    phone: z
      .string()
      .min(10, {
        message: 'Phone number must be at least 10 characters long.',
      })
      .max(20)
      .optional(),
    role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
  });
}
