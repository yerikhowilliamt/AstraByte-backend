import { createZodDto } from 'nestjs-zod';
import { AuthValidation } from '../auth.validation';

export class ValidateAuthRequest extends createZodDto(
  AuthValidation.VALIDATEUSER,
) {}
