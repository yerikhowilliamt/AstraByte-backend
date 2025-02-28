import { createZodDto } from 'nestjs-zod';
import { ContactValidation } from '../contact.validation';

export class CreateContactRequest extends createZodDto(
  ContactValidation.CREATE,
) {}
