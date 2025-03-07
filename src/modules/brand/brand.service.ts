import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoggerService } from '../../common/logger.service';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { StoreService } from '../store/store.service';
import { handleErrorService } from '../../common/handle-error.service';
import { BrandResponse } from '../../models/brand.model';
import { Brand, User } from '@prisma/client';
import { CreateBrandRequest } from './dto/create-brand.dto';
import { BrandValidation } from './brand.validation';
import WebResponse from '../../models/web.model';
import { UpdateBrandRequest } from './dto/update-brand.dto';

@Injectable()
export class BrandService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private storeService: StoreService,
    private handleErrorService: handleErrorService,
  ) {}

  async create(
    user: User,
    storeId: number,
    request: CreateBrandRequest,
  ): Promise<BrandResponse> {
    this.loggerService.info(
      'BRAND',
      'service',
      'Creating new brand initiated',
      {
        user_id: user.id,
        store_id: storeId,
        name: request.name,
      },
    );

    try {
      const store = await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });
      const createRequest: CreateBrandRequest = this.validationService.validate(
        BrandValidation.CREATE,
        request,
      );

      const name = createRequest.name.toUpperCase();

      await this.chekExistingBrandName(name);

      const brand = await this.prismaService.brand.create({
        data: {
          storeId: store.id,
          name,
        },
      });

      this.loggerService.info(
        'BRAND',
        'service',
        'Brand created successfully',
        {
          id: brand.id,
          store_id: brand.storeId,
          name: brand.name,
        },
      );

      return this.toBrandResponse(brand);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BRAND',
        'An unexpected error occurred during creating new brand',
        {
          user_id: user.id,
          store_id: storeId,
          name: request.name,
        },
      );
    }
  }

  async list(
    user: User,
    storeId: number,
    limit: number,
    page: number,
  ): Promise<WebResponse<BrandResponse[]>> {
    this.loggerService.info('Brand', 'service', 'Fetching brands initiated', {
      user_id: user.id,
      store_id: storeId,
      page,
      limit,
    });

    try {
      await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });

      const skip = (page - 1) * limit;

      const [brands, total] = await Promise.all([
        this.prismaService.brand.findMany({
          skip: skip,
          take: limit,
        }),
        this.prismaService.brand.count(),
      ]);

      if (brands.length === 0) {
        this.loggerService.warn(
          'BRAND',
          'service',
          'No brands found when checking existing brands',
          {
            BRANDs_length: brands.length,
          },
        );
        throw new NotFoundException('Brands not found');
      }

      const totalPages = Math.ceil(total / limit);

      this.loggerService.info(
        'BRAND',
        'service',
        'Brands fetched successfully',
        {
          user_id: user.id,
          total_brands: brands.length,
          total_pages: totalPages,
        },
      );

      return {
        data: brands.map(this.toBrandResponse),
        paging: {
          current_page: page,
          size: limit,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BRAND',
        'An unexpected error occurred during fetching brands',
        {
          user_id: user.id,
          store_id: storeId,
          page,
          limit,
        },
      );
    }
  }

  async get(user: User, storeId: number, id: number): Promise<BrandResponse> {
    this.loggerService.info('BRAND', 'service', 'Fetching brand initiated', {
      id,
      user_id: user.id,
      store_id: storeId,
    });

    try {
      await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });

      const brand = await this.checkExistingBrand(id);

      this.loggerService.info(
        'BRAND',
        'service',
        'Brand fetched successfully',
        {
          user_id: user.id,
          store_id: brand.storeId,
          name: brand.name,
        },
      );

      return this.toBrandResponse(brand);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BRAND',
        'An unexpected error occurred during fetching brand',
        {
          id,
          user_id: user.id,
          store_id: storeId,
        },
      );
    }
  }

  async update(
    user: User,
    storeId: number,
    id: number,
    request: UpdateBrandRequest,
  ): Promise<BrandResponse> {
    this.loggerService.info('BRAND', 'service', 'Updating brand initiated', {
      id,
      user_id: user.id,
      store_id: storeId,
      name: request.name,
    });

    try {
      await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });

      const updateRequest: UpdateBrandRequest = this.validationService.validate(
        BrandValidation.UPDATE,
        request,
      );

      const upperCaseName = updateRequest.name.toUpperCase();

      let brand = await this.checkExistingBrand(id);

      brand = await this.prismaService.brand.update({
        where: { id: brand.id },
        data: {
          name: upperCaseName,
        },
      });

      this.loggerService.info(
        'BRAND',
        'service',
        'Brand updated successfully',
        {
          id: brand.id,
          user_id: user.id,
          store_id: storeId,
          name: brand.name,
        },
      );

      return this.toBrandResponse(brand);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BRAND',
        'An unexpected error occurred during updating brand',
        {
          id,
          user_id: user.id,
          store_id: storeId,
          name: request.name,
        },
      );
    }
  }

  async delete(
    user: User,
    storeId: number,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.loggerService.info('BRAND', 'service', 'Deleting brand initiated', {
      id,
      user_id: user.id,
      store_id: storeId,
    });

    if (!id) {
      this.loggerService.info(
        'BRAND',
        'service',
        'Checking for existing brand failed - Brand ID is missing',
        {
          id,
        },
      );

      throw new BadRequestException('Brand ID is missing');
    }

    try {
      await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });

      const brand = await this.checkExistingBrand(id);

      await this.prismaService.brand.delete({
        where: { id: brand.id },
      });

      this.loggerService.info(
        'BRAND',
        'service',
        'Brand deleted successfully',
        {
          id: brand.id,
          user_id: user.id,
          store_id: brand.storeId,
        },
      );

      return {
        message: 'Brand successfully deleted',
        success: true,
      };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BRAND',
        'An unexpected error occurred during deleting brand',
        {
          id,
          user_id: user.id,
          store_id: storeId,
        },
      );
    }
  }

  private toBrandResponse(brand: Brand): BrandResponse {
    return {
      id: brand.id,
      storeId: brand.storeId,
      name: brand.name,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  private async chekExistingBrandName(name: string): Promise<void> {
    this.loggerService.info(
      'BRAND',
      'service',
      'Validating brand name exists initiated',
      {
        name,
      },
    );

    if (!name) {
      this.loggerService.info(
        'BRAND',
        'service',
        'Checking for existing brand failed - Brand name is missing',
        {
          name,
        },
      );

      throw new BadRequestException('Brand name is missing');
    }

    try {
      const brand = await this.prismaService.brand.findUnique({
        where: {
          name,
        },
      });

      if (brand) {
        this.loggerService.info(
          'BRAND',
          'service',
          'Checking for existing brand failed - Brand name already exists',
          {
            name,
          },
        );

        throw new BadRequestException('Brand already exists');
      }
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BRAND',
        'An unexpected error occurred while checking existing brand name',
        {
          name,
        },
      );
    }
  }

  private async checkExistingBrand(id: number): Promise<Brand> {
    this.loggerService.info(
      'BRAND',
      'service',
      'Check existing brand initiated',
      {
        id,
      },
    );

    if (!id) {
      this.loggerService.warn(
        'BRAND',
        'service',
        'Checking for existing brand failed - Brand ID is missing',
        {
          id,
        },
      );
      throw new BadRequestException('Brand ID is missing');
    }

    try {
      const brand = await this.prismaService.brand.findUnique({
        where: { id },
      });

      if (!brand) {
        this.loggerService.warn(
          'BRAND',
          'service',
          'Checking for existing brand failed - Brand not found',
          {
            id: brand.id,
            store_id: brand.storeId,
            name: brand.name,
          },
        );
        throw new NotFoundException('Brand not found');
      }
      return brand;
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BRAND',
        'An unexpected error while checking existing brand',
        {
          id,
        },
      );
    }
  }
}
