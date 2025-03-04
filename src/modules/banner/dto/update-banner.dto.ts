import { createZodDto } from 'nestjs-zod';
import { BannerValidation } from '../banner.validation';

export class UpdateBannerRequest extends createZodDto(
  BannerValidation.UPDATE,
) {}
