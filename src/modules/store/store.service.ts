import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { handleErrorService } from '../../common/handle-error.service';
import { LoggerService } from '../../common/logger.service';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { Store, User } from '@prisma/client';
import { StoreResponse } from '../../models/store.model';
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

      await this.checkStoreNameExists(createRequest.name);

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
      this.handleErrorService.service(
        error,
        'STORE',
        'An unexpected error occurred during creating new store',
        {
          user_id: user.id,
        },
      );
    }
  }

  async get(user: User, id: number): Promise<StoreResponse> {
    this.loggerService.info('STORE', 'service', 'Fetching store initiated', {
      id,
      user_id: user.id,
    });

    try {
      this.loggerService.info('STORE', 'service', 'Fetching store initiated', {
        user_id: user.id,
        id,
      });

      const store = await this.checkExistingStore({ id, userId: user.id });

      this.loggerService.info('STORE', 'service', 'Store fetched successfully');

      return this.toStoreResponse(store);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'STORE',
        'An unexpected error occurred during fetching store',
        {
          user_id: user.id,
        },
      );
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

      let store = await this.checkExistingStore({ id, userId: user.id });

      await this.checkStoreNameExists(updateRequest.name);

      store = await this.prismaService.store.update({
        where: { id: store.id },
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
      this.handleErrorService.service(
        error,
        'STORE',
        'An unexpected error occurred during updating store',
        {
          user_id: user.id,
          id,
        },
      );
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
      const store = await this.checkExistingStore({ id, userId: user.id });

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
      this.handleErrorService.service(
        error,
        'STORE',
        'An unexpected error occurred during deleting store',
        {
          user_id: user.id,
          id,
        },
      );
    }
  }

  private toStoreResponse(store: Store): StoreResponse {
    return {
      id: store.id,
      userId: store.userId,
      name: store.name,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }

  async checkExistingStore(params: {
    id: number;
    userId: number;
  }): Promise<Store> {
    this.loggerService.info(
      'STORE',
      'service',
      'Check existing store with params:',
      {
        id: params.id,
        user_id: params.userId,
      },
    );

    if (!params.id || !params.userId) {
      this.loggerService.warn(
        'STORE',
        'service',
        'Checking for existing store failed - Store ID and User ID is missing',
        {
          id: params.id,
          user_id: params.userId,
        },
      );
      throw new BadRequestException('Please insert Store ID and User ID');
    }

    try {
      const store = await this.prismaService.store.findUnique({
        where: { id: params.id },
      });

      if (!store) {
        this.loggerService.warn(
          'STORE',
          'service',
          'Checking for existing store failed - Store not found',
          {
            id: params.id,
            user_id: params.userId,
          },
        );
        throw new NotFoundException(
          `Store not found. Please check and try again.`,
        );
      }

      if (store.userId !== params.userId) {
        this.loggerService.warn(
          'STORE',
          'service',
          'Checking for existing store failed - User ID not matched',
          {
            id: params.id,
            user_id: params.userId,
          },
        );
        throw new ForbiddenException(
          'You do not have permission to access this store',
        );
      }

      this.loggerService.info(
        'STORE',
        'service',
        'Checking store successfully',
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
        'An unexpected error occurred while checking existing store',
        {
          id: params.id,
          user_id: params.userId,
        },
      );
    }
  }

  private async checkStoreNameExists(name: string): Promise<void> {
    this.loggerService.info(
      'STORE',
      'service',
      'Checking store name initiated',
      {
        name,
      },
    );

    if (!name) {
      this.loggerService.warn(
        'STORE',
        'service',
        'Checking for existing store name failed - Store name is missing',
        {
          name,
        },
      );
      throw new BadRequestException('Please insert Store name');
    }

    try {
      const storeNameExists = await this.prismaService.store.findUnique({
        where: {
          name,
        },
      });

      if (storeNameExists) {
        this.loggerService.warn(
          'STORE',
          'service',
          'Checking for existing store name failed - Store name already exists',
          {
            name,
          },
        );
        throw new BadRequestException(
          `Oops! ${storeNameExists.name} is already in use. Try a different one.`,
        );
      }
    } catch (error) {
      this.handleErrorService.service(
        error,
        'STORE',
        'An unexpected error occurred while checking existing store name',
        {
          name,
        },
      );
    }
  }
}
