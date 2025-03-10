import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, User } from '@prisma/client';
import { handleErrorService } from '../../common/handle-error.service';
import { LoggerService } from '../../common/logger.service';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { CategoryResponse } from '../../models/category.model';
import { CreateCategoryRequest } from './dto/create-category.dto';

import { CategoryValidation } from './category.validation';
import WebResponse from '../../models/web.model';
import { StoreService } from '../store/store.service';
import { UpdateCategoryRequest } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private storeService: StoreService,
    private handleErrorService: handleErrorService,
  ) {}

  private toCategoryResponse(category: Category): CategoryResponse {
    return {
      id: category.id,
      storeId: category.storeId,
      name: category.name,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  async create(
    user: User,
    storeId: number,
    request: CreateCategoryRequest,
  ): Promise<CategoryResponse> {
    this.loggerService.info(
      'CATEGORY',
      'service',
      'Creating new category initiated',
      {
        user_id: user.id,
        store_id: storeId,
        name: request.name
      },
    );

    try {
      const store = await this.storeService.checkExistingStore({id: storeId, userId: user.id});

      const createRequest: CreateCategoryRequest =
        this.validationService.validate(CategoryValidation.CREATE, request);

      await this.checkCategoryNameExists(createRequest.name);

      const category = await this.prismaService.category.create({
        data: {
          name: createRequest.name,
          storeId: store.id,
        },
      });

      this.loggerService.info(
        'CATEGORY',
        'service',
        'Category successfully created',
        {
          id: category.id,
          user_id: user.id,
          store_id: category.storeId,
          name: category.name
        },
      );

      return this.toCategoryResponse(category);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'CATEGORY',
        'An unexpected error occurred during creating category',
        {
          user_id: user.id,
          store_id: storeId,
        },
      );
    }
  }

  async list(
    user: User,
    storeId: number,
    limit: number,
    page: number,
  ): Promise<WebResponse<CategoryResponse[]>> {
    this.loggerService.info(
      'CATEGORY',
      'service',
      'Fetching categories initiated',
      {
        user_id: user.id,
        page: page,
        limit: limit,
      },
    );

    try {
      const store = await this.storeService.checkExistingStore({id: storeId, userId: user.id});

      const skip = (page - 1) * limit;

      const [categories, total] = await Promise.all([
        this.prismaService.category.findMany({
          where: { storeId: store.id },
          skip: skip,
          take: limit,
        }),
        await this.prismaService.category.count({
          where: { storeId: store.id },
        }),
      ]);

      if (categories.length === 0) {
        throw new NotFoundException('Categories not found');
      }

      const totalPages = Math.ceil(total / limit);

      this.loggerService.info(
        'CATEGORY',
        'service',
        'Categories fetched successfully',
        {
          user_id: user.id,
          total_data: categories.length,
          total_page: totalPages,
          contact_ids: categories.map((contact) => contact.id).join(','),
        },
      );

      return {
        data: categories.map(this.toCategoryResponse),
        paging: {
          current_page: page,
          size: limit,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'CATEGORY',
        'An unexpected error occurred during fetching categories',
      );
    }
  }

  async get(
    user: User,
    storeId: number,
    id: number,
  ): Promise<CategoryResponse> {
    this.loggerService.info(
      'CATEGORY',
      'service',
      'Fetching category initiated',
      {
        id,
        user_id: user.id,
        store_id: storeId,
      },
    );
    try {
      const store = await this.storeService.checkExistingStore({id: storeId, userId: user.id});

      const category = await this.checkExistingCategory({id, storeId: store.id});

      this.loggerService.info(
        'CATEGORY',
        'service',
        'Category fetched successfully',
        {
          id: category.id,
          user_id: user.id,
          store_id: category.storeId,
        },
      );

      return this.toCategoryResponse(category);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'CATEGORY',
        'An unexpected error occurred during fetching category',
      );
    }
  }

  async update(
    user: User,
    storeId: number,
    id: number,
    request: UpdateCategoryRequest,
  ): Promise<CategoryResponse> {
    this.loggerService.info(
      'CATEGORY',
      'service',
      'Updating category initiated',
      {
        id,
        user_id: user.id,
        store_id: storeId,
      },
    );

    try {
      const store = await this.storeService.checkExistingStore({id: storeId, userId: user.id});

      const updateRequest: UpdateCategoryRequest =
        this.validationService.validate(CategoryValidation.UPDATE, request);

      let category = await this.checkExistingCategory({id, storeId: store.id});

      category = await this.prismaService.category.update({
        where: { id: category.id },
        data: {
          name: updateRequest.name,
        },
      });

      return this.toCategoryResponse(category);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'CATEGORY',
        'An unexpected error occurred during updating category',
      );
    }
  }

  async delete(
    user: User,
    storeId: number,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.loggerService.info(
      'CATEGORY',
      'service',
      `Deleting category with id: ${JSON.stringify(id)} initiated`,
    );

    try {
      const store = await this.storeService.checkExistingStore({id: storeId, userId: user.id});

      const category = await this.checkExistingCategory({id, storeId: store.id});

      await this.prismaService.category.delete({
        where: { id: category.id },
      });

      this.loggerService.info(
        'CATEGORY',
        'service',
        'Category deleted successfully',
        {
          id: category.id,
          user_id: user.id,
          store_id: store.id,
        },
      );

      return { message: 'Category successfully deleted', success: true };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'CATEGORY',
        'An unexpected error occurred during deleting category',
        {
          id,
          user_id: user.id,
          store_id: storeId,
        },
      );
    }
  }

  private async checkExistingCategory(params: {
    id: number,
    storeId: number
  }): Promise<Category> {
    this.loggerService.info(
      'CATEGORY',
      'service',
      'Checking existing category with ID: ',
      {
        id: params.id,
        store_id: params.storeId
      },
    );

    if (!params.id || params.storeId) {
      this.loggerService.warn(
        'CATEGORY',
        'service',
        'Checking for existing category failed - Category ID or Store ID is missing',
        {
          id: params.id,
          store_id: params.storeId
        },
      );
      throw new BadRequestException('Please insert Category ID and Store ID');
    }
    
    try {
      const category = await this.prismaService.category.findUnique({
        where: { id: params.id },
      });

      if (!category) {
        this.loggerService.warn(
          'CATEGORY',
          'service',
          'Checking for existing category failed - Category not found',
          {
            id: category.id,
            store_id: category.storeId
          },
        );
        throw new NotFoundException('Category not found');
      }

      if (category.storeId !== params.storeId) {
        this.loggerService.warn('CATEGORY', 'service', 'Checking for existing category failed - Store ID not matched', {
          id: category.id,
          category_store_id: category.storeId,
          params_store_id: params.storeId
        })
        throw new ForbiddenException(
          'You do not have permission to access this banner',
        );
      }

      this.loggerService.info(
        'CATEGORY',
        'service',
        'Checking for existing category successfully',
        {
          id: category.id,
          store_id: category.storeId,
        },
      );

      return category;
    } catch (error) {
      this.handleErrorService.service(
        error,
        'CATEGORY',
        'An unexpected error while checking existing category',
        {
          id: params.id,
          store_id: params.storeId
        },
      );
    }
  }

  private async checkCategoryNameExists(
    name: string
  ): Promise<void> {
    this.loggerService.info(
      'CATEGORY',
      'service',
      'Checking same category name',
      {
        name
      },
    );

    if (!name) {
      this.loggerService.warn(
        'CATEGORY',
        'service',
        'Checking for existing category name failed - Category name is missing',
        {
          name,
        },
      );
      throw new BadRequestException('Please insert category name');
    }
    
    try {
      const category = await this.prismaService.category.findUnique({
        where: {
          name
        },
      });
  
      if (category) {
        this.loggerService.warn(
          'CATEGORY',
          'service',
          'Checking for existing category name failed - Category with the same name already exists',
          {
            name
          },
        );
        throw new BadRequestException('This category already exists');
      }
    } catch (error) {
      this.handleErrorService.service(
        error,
        'CATEGORY',
        'An unexpected error occurred while checking existing category name',
        {
          name
        },
      );
    }
  }
}
