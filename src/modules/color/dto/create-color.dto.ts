import { createZodDto } from 'nestjs-zod';
import { ColorValidation } from '../color.validation';

export class CreateColorRequest extends createZodDto(ColorValidation.CREATE) {
  
}