import { createZodDto } from 'nestjs-zod';
import { CategoryValidation } from '../category.validation';

export class CreateCategoryRequest extends createZodDto(
  CategoryValidation.CREATE,
) {}
