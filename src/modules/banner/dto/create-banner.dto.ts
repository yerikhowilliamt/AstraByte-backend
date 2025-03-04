import { createZodDto } from 'nestjs-zod';
import { BannerValidation } from '../banner.validation';

export class CreateBannerRequest extends createZodDto(
  BannerValidation.CREATE,
) {}
