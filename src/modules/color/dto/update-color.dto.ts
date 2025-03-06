import { createZodDto } from 'nestjs-zod';
import { ColorValidation } from '../color.validation';

export class UpdateColorRequest extends createZodDto(ColorValidation.UPDATE) {}
