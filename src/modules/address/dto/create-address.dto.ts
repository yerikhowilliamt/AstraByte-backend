import { createZodDto } from 'nestjs-zod';
import { AddressValidation } from '../address.validation';

export class CreateAddressRequest extends createZodDto(
  AddressValidation.CREATE,
) {}
