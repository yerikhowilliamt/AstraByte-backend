import { createZodDto } from 'nestjs-zod';
import { AddressValidation } from '../address.validation';

export class UpdateAddressRequest extends createZodDto(
  AddressValidation.UPDATE,
) {}
