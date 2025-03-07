import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoggerService } from '../../common/logger.service';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { StoreService } from '../store/store.service';
import { handleErrorService } from '../../common/handle-error.service';
import { ColorResponse } from '../../models/color.model';
import { Color, User } from '@prisma/client';
import { CreateColorRequest } from './dto/create-color.dto';
import { ColorValidation } from './color.validation';
import WebResponse from '../../models/web.model';
import { UpdateColorRequest } from './dto/update-color.dto';

@Injectable()
export class ColorService {
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
    request: CreateColorRequest,
  ): Promise<ColorResponse> {
    this.loggerService.info(
      'COLOR',
      'service',
      'Creating new color initiated',
      {
        user_id: user.id,
        store_id: storeId,
        name: request.name,
        value: request.value,
      },
    );

    try {
      const store = await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });
      const createRequest: CreateColorRequest = this.validationService.validate(
        ColorValidation.CREATE,
        request,
      );

      await this.validateColorExists({
        storeId: store.id,
        name: createRequest.name,
        value: createRequest.value,
      });

      const color = await this.prismaService.color.create({
        data: {
          storeId: store.id,
          name: createRequest.name,
          value: createRequest.value,
        },
      });

      this.loggerService.info(
        'COLOR',
        'service',
        'Color successfully created',
        {
          id: color.id,
          user_id: user.id,
          store_id: color.storeId,
          name: color.name,
          value: color.value,
        },
      );

      return this.toColorResponse(color);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'COLOR',
        'An unexpected error occurred during creating color',
        {
          user_id: user.id,
          store_id: storeId,
          name: request.name,
          value: request.value,
        },
      );
    }
  }

  async list(
    user: User,
    storeId: number,
    limit: number,
    page: number,
  ): Promise<WebResponse<ColorResponse[]>> {
    this.loggerService.info('COLOR', 'service', 'Fetching colors initiated', {
      user_id: user.id,
      store_id: storeId,
      page,
      limit,
    });

    try {
      const store = await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });
      const skip = (page - 1) * limit;

      const [colors, total] = await Promise.all([
        this.prismaService.color.findMany({
          where: { storeId: store.id },
          skip,
          take: limit,
        }),
        this.prismaService.color.count({
          where: { storeId: store.id },
        }),
      ]);

      if (colors.length === 0) {
        this.loggerService.warn(
          'COLOR',
          'service',
          'No colors found when checking existing banners',
          {
            colors_length: colors.length,
          },
        );
        throw new NotFoundException('Colors not found');
      }

      const totalPages = Math.ceil(total / limit);

      this.loggerService.info(
        'COLOR',
        'service',
        'Colors fetched successfully',
        {
          user_id: user.id,
          total_colors: colors.length,
          total_pages: totalPages,
        },
      );

      return {
        data: colors.map(this.toColorResponse),
        paging: {
          current_page: page,
          size: limit,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'COLOR',
        'An unexpected error occurred during fetching colors',
        {
          user_id: user.id,
          store_id: storeId,
        },
      );
    }
  }

  async get(user: User, storeId: number, id: number): Promise<ColorResponse> {
    this.loggerService.info('COLOR', 'service', 'Fetching color initiated', {
      id,
      user_id: user.id,
      store_id: storeId,
    });

    try {
      const store = await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });
      const color = await this.checkExistingColor({ id, storeId: store.id });

      this.loggerService.info(
        'COLOR',
        'service',
        'Color fetched successfully',
        {
          id: color.id,
          user_id: user.id,
          store_id: color.storeId,
          name: color.name,
          value: color.value,
        },
      );

      return this.toColorResponse(color);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BANNER',
        'An unexpected error occurred during fetching color',
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
    request: UpdateColorRequest,
  ): Promise<ColorResponse> {
    this.loggerService.info('BANNER', 'service', 'Updating color initiated', {
      id,
      user_id: user.id,
      store_id: storeId,
    });

    try {
      const store = await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });

      const updateRequest: UpdateColorRequest = this.validationService.validate(
        ColorValidation.UPDATE,
        request,
      );
      let color = await this.checkExistingColor({ id, storeId: store.id });
      color = await this.prismaService.color.update({
        where: { id: color.id },
        data: {
          storeId: color.storeId,
          name: updateRequest.name,
          value: updateRequest.value,
        },
      });

      this.loggerService.info(
        'COLOR',
        'service',
        'Color updated successfully',
        {
          id: color.id,
          user_id: user.id,
          store_id: storeId,
        },
      );

      return this.toColorResponse(color);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BANNER',
        'An unexpected error occurred during updating color',
        {
          id,
          user_id: user.id,
          store_id: storeId,
        },
      );
    }
  }

  async delete(
    user: User,
    storeId: number,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.loggerService.info('COLOR', 'service', 'Deleting color initiated', {
      id,
      user_id: user.id,
      store_id: storeId,
    });

    try {
      const store = await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });
      
      const color = await this.checkExistingColor({ id, storeId: store.id });
      
      await this.prismaService.color.delete({
        where: { id: color.id },
      });

      this.loggerService.info(
        'COLOR',
        'service',
        'Color deleted successfully',
        {
          id: color.id,
          user_id: user.id,
          store_id: store.id,
        },
      );

      return {
        message: 'Color successfully deleted',
        success: true,
      };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BANNER',
        'An unexpected error occurred during deleting color',
        {
          id,
          user_id: user.id,
          store_id: storeId,
        },
      );
    }
  }

  private toColorResponse(color: Color): ColorResponse {
    return {
      id: color.id,
      storeId: color.storeId,
      name: color.name,
      value: color.value,
      createdAt: color.createdAt.toISOString(),
      updatedAt: color.updatedAt.toISOString(),
    };
  }

  private async validateColorExists(params: {
    storeId: number;
    name: string;
    value: string;
  }): Promise<void> {
    this.loggerService.info(
      'COLOR',
      'service',
      'Checking same color exists initiated',
      {
        store_id: params.storeId,
        name: params.name,
        value: params.value,
      },
    );

    if (!params.storeId) {
      this.loggerService.warn(
        'COLOR',
        'service',
        'Checking for existing color failed - Store ID is missing',
        {
          store_id: params.storeId,
        },
      );
      throw new BadRequestException('Please insert Store ID');
    }
    
    try {
      const colorWithSameName = await this.prismaService.color.findUnique({
        where: { name: params.name },
      });
  
      const colorWithSameValue = await this.prismaService.color.findUnique({
        where: { value: params.value },
      });
  
      if (colorWithSameName || colorWithSameValue) {
        this.loggerService.warn(
          'COLOR',
          'service',
          'Checking for existing color failed - Color already exists',
          {
            store_id: params.storeId,
          },
        );
        throw new BadRequestException(
          'This color already exists. Please Try a different one.',
        );
      }
    } catch (error) {
      this.handleErrorService.service(
        error,
        'COLOR',
        'An unexpected error while validate existing color',
        {
          store_id: params.storeId,
          name: params.name,
          value: params.value
        },
      );
    }
  }

  private async checkExistingColor(params: {
    id: number;
    storeId: number;
  }): Promise<Color> {
    this.loggerService.info(
      'COLOR',
      'service',
      'Check existing color initiated',
      {
        id: params.id,
        store_id: params.storeId,
      },
    );
    
    if (!params.id || !params.storeId) {
      this.loggerService.warn(
        'COLOR',
        'service',
        'Checking for existing color failed - Color ID and Store ID is missing',
        {
          id: params.id,
          store_id: params.storeId,
        },
      );
      throw new BadRequestException('Please insert Color ID and Store ID');
    }
    
    try {
      const color = await this.prismaService.color.findUnique({
        where: { id: params.id },
      });

      if (!color) {
        this.loggerService.warn(
          'COLOR',
          'service',
          'Checking for existing color failed - Color not found',
          {
            id: params.id,
            store_id: params.storeId,
          },
        );
        throw new NotFoundException('Color not found');
      }

      if (color.storeId !== params.storeId) {
        this.loggerService.warn(
          'BANNER',
          'service',
          'Checking for existing color failed - Store ID not matched',
          {
            id: color.id,
            color_store_id: color.storeId,
            params_store_id: params.storeId,
          },
        );
        throw new ForbiddenException(
          'You do not have permission to access this color',
        );
      }

      return color;
    } catch (error) {
      this.handleErrorService.service(
        error,
        'COLOR',
        'An unexpected error while checking existing color',
        {
          id: params.id,
          store_id: params.storeId,
        },
      );
    }
  }
}
