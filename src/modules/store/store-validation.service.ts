import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LoggerService } from '../../common/logger.service';
import { handleErrorService } from '../../common/handle-error.service';

@Injectable()
export class StoreValidationService {
  constructor(
    private prismaService: PrismaService,
    private loggerService: LoggerService,
    private handleErrorService: handleErrorService
  ) { }

  async validateStore(storeId: number) {
    this.loggerService.info('STORE', 'service', 'Validating Store ID', {
      id: storeId
    })

    try {
      const store = await this.prismaService.store.findUnique({
        where: { id: storeId },
      });
  
      if (!store) {
        this.loggerService.error('STORE', 'service' , 'Missing Store ID in request body', {store_id: storeId});
        throw new NotFoundException(`Store with ID ${storeId} not found.`);
      }
  
      return store;
    } catch (error) {
      this.handleErrorService.service(error, 'STORE', 'Failed to validate store ID', {
        id: storeId
      })
    }
  }

  async validateStoreForUser(userId: number, storeId: number) {
    const store = await this.prismaService.store.findFirst({
      where: {
        id: storeId,
        userId: userId,
      },
    });

    if (!store) {
      this.loggerService.error('STORE', 'service' , 'Store not fund', {store_id: storeId});
      throw new ForbiddenException(`Store with ID ${storeId} is not owned by the user.`);
    }

    return store;
  }
}