import { z } from 'zod';

const addressFields = {
  street: z.string().min(1, {
    message: 'Street address is required'
  }).max(255),
  city: z.string().min(1, {
    message: 'City is required'
  }).max(100),
  province: z.string().min(1, {
    message: 'Province is required'
  }).max(100),
  country: z.string().min(1, {
    message: 'Country is required'
  }).max(100),
  postalCode: z.string().min(1, {
    message: 'Postal code is required'
  }).max(10),
};

export class AddressValidation {
  static readonly CREATE = z.object({
    ...addressFields,
    isPrimary: z.boolean().default(false)
  });

  static readonly UPDATE = z.object({
    street: addressFields.street.optional(),
    city: addressFields.city.optional(),
    province: addressFields.province.optional(),
    country: addressFields.country.optional(),
    postalCode: addressFields.postalCode.optional(),
    isPrimary: z.boolean().default(false).optional(),
  });
}