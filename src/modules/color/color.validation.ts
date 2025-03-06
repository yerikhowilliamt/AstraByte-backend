import { z } from 'zod';

export class ColorValidation {
  static readonly CREATE = z.object({
    name: z
      .string()
      .min(1, {
        message: 'Name cannot be empty.',
      })
      .default(''),
    value: z
      .string()
      .min(3, {
        message: 'Value cannot be empty.',
      })
      .max(6, {
        message: 'Max 6 character.',
      })
      .default(''),
  });

  static readonly UPDATE = z.object({
    name: z
      .string()
      .min(1, {
        message: 'Name cannot be empty.',
      })
      .optional()
      .default(''),
    value: z
      .string()
      .min(3, {
        message: 'Value cannot be empty.',
      })
      .max(6, {
        message: 'Max 6 character.',
      })
      .optional()
      .default(''),
  });
}
