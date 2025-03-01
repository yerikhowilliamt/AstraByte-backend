import { createZodDto } from 'nestjs-zod';
import { StoreValidation } from '../store.validation';

export class CreateStoreRequest extends createZodDto(StoreValidation.CREATE) {}
