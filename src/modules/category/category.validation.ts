import { z } from 'zod';

export class CategoryValidation {
  static readonly CREATE = z.object({
    name: z
      .string()
      .min(1, {
        message: 'Name cannot be empty.',
      })
      .default(''),
  });

  static readonly UPDATE = z.object({
    name: z
      .string()
      .min(1, {
        message: 'Name cannot be empty.',
      })
      .default(''),
  });
}
