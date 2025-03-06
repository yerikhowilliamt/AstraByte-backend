import { z } from 'zod';

export class AuthValidation {
  static readonly REGISTER = z.object({
    name: z.string().min(1, { message: 'Name is required.' }).default(''),
    email: z
      .string()
      .email({ message: 'Please enter a valid email address.' })
      .default(''),
    password: z
      .string()
      .min(8, {
        message: 'Password is required. It must be at least 8 characters long.',
      })
      .regex(/[A-Z]/, {
        message: 'Password must contain at least one uppercase letter.',
      })
      .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
      .default(''),
  });

  static readonly VALIDATEUSER = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    image: z.string().min(1),
    emailVerified: z.boolean().optional(),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).optional(),
    provider: z.string().min(1),
    providerAccountId: z.string().min(1),
  });

  static readonly LOGIN = z.object({
    email: z
      .string()
      .email({ message: 'Please enter a valid email address.' })
      .default(''),
    password: z
      .string()
      .min(8, {
        message: 'Password is required. It must be at least 8 characters long.',
      })
      .default(''),
  });
}
