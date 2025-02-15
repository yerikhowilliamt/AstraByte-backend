import { createZodDto } from 'nestjs-zod';
import { AuthValidation } from '../auth.validation';

export class RegisterAuthRequest extends createZodDto(
  AuthValidation.REGISTER,
) {}
