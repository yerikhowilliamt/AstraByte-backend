import { createZodDto } from 'nestjs-zod';
import { BrandValidation } from '../brand.validation';

export class UpdateBrandRequest extends createZodDto(BrandValidation.UPDATE) {}
