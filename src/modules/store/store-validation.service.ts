import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LoggerService } from '../../common/logger.service';
import { handleErrorService } from '../../common/handle-error.service';
import { Store } from '@prisma/client';

@Injectable()
export class StoreValidationService {
  constructor(
    private prismaService: PrismaService,
    private loggerService: LoggerService,
    private handleErrorService: handleErrorService,
  ) {}

  async validateStore(params: { userId: number; id: number }): Promise<Store> {
    this.loggerService.info(
      'STORE',
      'service',
      'Validating Store ID with params: ',
      {
        id: params.id,
        user_id: params.userId,
      },
    );

    try {
      if (!params.id && !params.userId) {
        throw new BadRequestException('Please insert Store ID and User ID');
      }

      const store = await this.prismaService.store.findUnique({
        where: { id: params.id, userId: params.userId },
      });

      if (!store) {
        throw new NotFoundException('Store not found');
      }

      this.loggerService.info(
        'STORE',
        'service',
        'Store validated successfully',
        {
          id: store.id,
          user_id: store.userId,
        },
      );

      return store;
    } catch (error) {
      this.handleErrorService.service(
        error,
        'STORE',
        'Failed validating store with params: ',
        {
          id: params.id,
          user_id: params.userId,
        },
      );
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
      this.loggerService.error('STORE', 'service', 'Store not fund', {
        store_id: storeId,
      });
      throw new ForbiddenException(
        `Store with ID ${storeId} is not owned by the user.`,
      );
    }

    return store;
  }
}
