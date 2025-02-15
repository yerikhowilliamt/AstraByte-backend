import { createZodDto } from 'nestjs-zod';
import { UserValidation } from '../user.validation';

export class UpdateUserRequest extends createZodDto(UserValidation.UPDATE) {}
