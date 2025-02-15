import { createZodDto } from 'nestjs-zod';
import { AuthValidation } from '../auth.validation';

export class LoginAuthRequest extends createZodDto(AuthValidation.LOGIN) {}
