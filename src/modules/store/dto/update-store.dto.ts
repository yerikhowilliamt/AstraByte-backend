import { createZodDto } from 'nestjs-zod';
import { StoreValidation } from '../store.validation';

export class UpdateStoreRequest extends createZodDto(StoreValidation.UPDATE) {}
