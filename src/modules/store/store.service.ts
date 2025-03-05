import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { handleErrorService } from '../../common/handle-error.service';
import { LoggerService } from '../../common/logger.service';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { Store, User } from '@prisma/client';
import { StoreResponse } from 'src/models/store.model';
import { CreateStoreRequest } from './dto/create-store.dto';
import { StoreValidation } from './store.validation';
import { UpdateStoreRequest } from './dto/update-store.dto';

@Injectable()
export class StoreService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private handleErrorService: handleErrorService,
  ) {}

  private toStoreResponse(store: Store): StoreResponse {
    return {
      id: store.id,
      userId: store.userId,
      name: store.name,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }

  async create(
    user: User,
    request: CreateStoreRequest,
  ): Promise<StoreResponse> {
    this.loggerService.info('STORE', 'service', 'Creating store initiated', {
      user_id: user.id,
    });

    try {
      const createRequest: CreateStoreRequest = this.validationService.validate(
        StoreValidation.CREATE,
        request,
      );

      await this.checkStoreNameExists(user.id, createRequest.name);

      const store = await this.prismaService.store.create({
        data: {
          userId: user.id,
          name: createRequest.name,
        },
      });

      this.loggerService.info(
        'STORE',
        'service',
        'Store created successfully',
        {
          user_id: user.id,
          store_id: store.id,
        },
      );

      return this.toStoreResponse(store);
    } catch (error) {
      this.handleErrorService.service(error, 'STORE', 'Error creating store', {
        user_id: user.id,
      });
    }
  }

  async get(user: User, id: number): Promise<StoreResponse> {
    try {
      this.loggerService.info('STORE', 'service', 'Fetching store initiated', {
        user_id: user.id,
        id,
      });

      const store = await this.checkExistingStore({id, userId:user.id});

      this.loggerService.info('STORE', 'service', 'Store fetched successfully');

      return this.toStoreResponse(store);
    } catch (error) {
      this.handleErrorService.service(error, 'STORE', 'Error fetching store', {
        user_id: user.id,
      });
    }
  }

  async update(
    user: User,
    id: number,
    request: UpdateStoreRequest,
  ): Promise<StoreResponse> {
    this.loggerService.info('STORE', 'service', 'Updating store initiated', {
      user_id: user.id,
      id,
    });

    try {
      const updateRequest: UpdateStoreRequest = this.validationService.validate(
        StoreValidation.UPDATE,
        request,
      );

      let store = await this.checkExistingStore({id, userId:user.id});

      await this.checkStoreNameExists(store.id, updateRequest.name);

      store = await this.prismaService.store.update({
        where: { id: store.id, userId: user.id },
        data: { name: updateRequest.name },
      });

      this.loggerService.info(
        'STORE',
        'service',
        'Store updated successfully',
        {
          user_id: store.userId,
          id: store.id,
        },
      );

      return this.toStoreResponse(store);
    } catch (error) {
      this.handleErrorService.service(error, 'STORE', 'Error updating store', {
        user_id: user.id,
        id,
      });
    }
  }

  async delete(
    user: User,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.loggerService.info('STORE', 'service', 'Deleting store initiated', {
      user_id: user.id,
      id,
    });

    try {
      const store = await this.checkExistingStore({id, userId:user.id});

      await this.prismaService.store.delete({
        where: { id: store.id },
      });

      this.loggerService.info(
        'STORE',
        'service',
        'Store deleted successfully',
        {
          user_id: store.userId,
          id: store.id,
        },
      );

      return { message: 'Store successfully deleted', success: true };
    } catch (error) {
      this.handleErrorService.service(error, 'STORE', 'Error deleting store', {
        user_id: user.id,
        id,
      });
    }
  }

  async checkExistingStore(params: { userId: number; id: number }): Promise<Store> {

    try {
      if (!params.id && !params.userId) {
        throw new BadRequestException('Please insert Store ID and User ID');
      }

      const store = await this.prismaService.store.findUnique({
        where: { id: params.id, userId: params.userId },
      });
  
      if (!store) {
        throw new NotFoundException(`Store not found`);
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

  private async checkStoreNameExists(
    userId: number,
    name: string,
  ): Promise<void> {
    const storeNameExists = await this.prismaService.store.findUnique({
      where: {
        userId,
        name,
      },
    });

    if (storeNameExists) {
      throw new BadRequestException('You have already added this store');
    }
  }
}
