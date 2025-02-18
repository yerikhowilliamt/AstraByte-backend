import { z } from 'zod';

export class AuthValidation {
  static readonly REGISTER = z.object({
    name: z.string().min(1, { message: 'Name is required.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    password: z
      .string()
      .min(8, {
        message: 'Password is required. It must be at least 8 characters long.',
      }),
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
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    password: z
      .string()
      .min(8, {
        message: 'Password is required. It must be at least 8 characters long.',
      }),
  });
}
