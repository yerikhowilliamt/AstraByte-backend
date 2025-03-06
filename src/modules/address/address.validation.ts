import { z } from 'zod';

const addressFields = {
  street: z
    .string()
    .min(1, {
      message: 'Street address is required',
    })
    .max(255)
    .default(''),
  city: z
    .string()
    .min(1, {
      message: 'City is required',
    })
    .max(100)
    .default(''),
  province: z
    .string()
    .min(1, {
      message: 'Province is required',
    })
    .max(100)
    .default(''),
  country: z
    .string()
    .min(1, {
      message: 'Country is required',
    })
    .max(100)
    .default(''),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, {
      message: 'Postal code must be exactly 5 digits',
    })
    .default(''),
};

export class AddressValidation {
  static readonly CREATE = z.object({
    ...addressFields,
    isPrimary: z.boolean().default(false),
  });

  static readonly UPDATE = z.object({
    street: addressFields.street.optional().default(''),
    city: addressFields.city.optional().default(''),
    province: addressFields.province.optional().default(''),
    country: addressFields.country.optional().default(''),
    postalCode: addressFields.postalCode.optional().default(''),
    isPrimary: z.boolean().default(false).optional(),
  });
}
