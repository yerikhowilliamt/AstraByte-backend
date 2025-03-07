import { z } from 'zod';

export class BrandValidation {
  static readonly CREATE = z.object({
    name: z
      .string()
      .min(1, {
        message: 'Name cannot be empty.',
      })
      .max(100)
      .default(''),
  });

  static readonly UPDATE = z.object({
    name: z
      .string()
      .min(1, {
        message: 'Name cannot be empty.',
      })
      .max(100)
      .default(''),
  });
}
