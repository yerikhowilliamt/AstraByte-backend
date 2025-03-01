import { z } from 'zod';

export class StoreValidation {
  static readonly CREATE = z.object({
    name: z.string().min(1, {
      message: 'Name cannot be empty.'
    })
  }) 

  static readonly UPDATE = z.object({
    name: z.string().min(1, {
      message: 'Name cannot be empty.'
    }).optional()
  }) 
}