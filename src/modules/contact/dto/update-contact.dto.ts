import { createZodDto } from 'nestjs-zod';
import { ContactValidation } from '../contact.validation';

export class UpdateContactRequest extends createZodDto(
  ContactValidation.UPDATE,
) {}
