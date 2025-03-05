import { createZodDto } from 'nestjs-zod';
import { CategoryValidation } from '../category.validation';

export class UpdateCategoryRequest extends createZodDto(
  CategoryValidation.UPDATE,
) {}
