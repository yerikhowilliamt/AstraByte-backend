import { createZodDto } from 'nestjs-zod';
import { BrandValidation } from '../brand.validation';

export class CreateBrandRequest extends createZodDto(BrandValidation.CREATE) {}
