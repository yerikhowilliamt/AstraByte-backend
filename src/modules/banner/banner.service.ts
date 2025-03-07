import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Banner, User } from '@prisma/client';
import { handleErrorService } from '../../common/handle-error.service';
import { LoggerService } from '../../common/logger.service';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { CreateBannerRequest } from './dto/create-banner.dto';
import { BannerResponse } from '../../models/banner.model';
import { BannerValidation } from './banner.validation';
import { ImageService } from '../image/image.service';
import WebResponse from '../../models/web.model';
import { UpdateBannerRequest } from './dto/update-banner.dto';
import { CloudinaryService } from '../../common/cloudinary.service';
import { StoreService } from '../store/store.service';

@Injectable()
export class BannerService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private storeService: StoreService,
    private cloudinaryService: CloudinaryService,
    private imageService: ImageService,
    private handleErrorService: handleErrorService,
  ) {}

  async create(
    user: User,
    storeId: number,
    request: CreateBannerRequest,
    image?: Express.Multer.File,
  ): Promise<BannerResponse> {
    this.loggerService.info('BANNER', 'service', 'Creating banner initiated', {
      user_id: user.id,
      store_id: storeId,
    });

    try {
      const store = await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });

      if (!request.name) {
        this.loggerService.warn(
          'BANNER',
          'service',
          'Checking for banner name failed - Banner name is missing',
          {
            name: request.name,
          },
        );
        throw new BadRequestException('Name cannot be empty.');
      }

      const createRequest: CreateBannerRequest =
        this.validationService.validate(BannerValidation.CREATE, request);

      await this.checkExistingBannerName({
        storeId: store.id,
        name: createRequest.name,
      });

      const uploadImage = await this.imageService.uploadImage(image);

      const banner = await this.prismaService.banner.create({
        data: {
          storeId: store.id,
          name: createRequest.name,
          publicId: uploadImage.publicId,
          imageUrl: uploadImage.imageUrl,
        },
      });

      this.loggerService.info(
        'BANNER',
        'service',
        'Banner created successfully',
        {
          id: banner.id,
          store_id: banner.storeId,
          public_id: banner.publicId,
        },
      );

      return this.toBannerResponse(banner);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BANNER',
        'An unexpected error occurred during creating new banner',
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
  ): Promise<WebResponse<BannerResponse[]>> {
    this.loggerService.info('BANNER', 'service', 'Fetching banners initiated', {
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

      const [banners, total] = await Promise.all([
        this.prismaService.banner.findMany({
          where: { storeId: store.id },
          skip: skip,
          take: limit,
        }),
        this.prismaService.banner.count({
          where: { storeId: store.id },
        }),
      ]);

      if (banners.length === 0) {
        this.loggerService.warn(
          'BANNER',
          'service',
          'No banners found when checking existing banners',
          {
            banners_length: banners.length,
          },
        );
        throw new NotFoundException('Banners not found');
      }

      const totalPages = Math.ceil(total / limit);

      this.loggerService.info(
        'BANNER',
        'service',
        'Banners fetched successfully',
        {
          user_id: user.id,
          total_banners: banners.length,
          total_pages: totalPages,
        },
      );

      return {
        data: banners.map(this.toBannerResponse),
        paging: {
          current_page: page,
          size: limit,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BANNER',
        'An unexpected error occurred during fetching banners',
        {
          user_id: user.id,
          store_id: storeId,
          page,
          limit,
        },
      );
    }
  }

  async get(user: User, storeId: number, id: number): Promise<BannerResponse> {
    this.loggerService.info('BANNER', 'service', 'Fetching banner initiated', {
      id,
      user_id: user.id,
      store_id: storeId,
    });

    try {
      const store = await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });

      const banner = await this.checkExistingBanner({
        id: id,
        storeId: store.id,
      });

      this.loggerService.info(
        'BANNER',
        'service',
        'Banner fetched successfully',
        {
          user_id: user.id,
          store_id: banner.storeId,
          public_id: banner.publicId,
        },
      );

      return this.toBannerResponse(banner);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BANNER',
        'An unexpected error occurred during fetching banner',
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
    request: UpdateBannerRequest,
    image?: Express.Multer.File,
  ): Promise<BannerResponse> {
    this.loggerService.info('BANNER', 'service', 'Updating banner initiated', {
      id,
      user_id: user.id,
      store_id: storeId,
    });

    try {
      const store = await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });

      const updateRequest: UpdateBannerRequest =
        this.validationService.validate(BannerValidation.UPDATE, request);

      let banner = await this.checkExistingBanner({
        id,
        storeId: store.id,
      });

      if (image) {
        const uploadImage = await this.imageService.uploadImage(image);
        await this.prismaService.banner.update({
          where: { id: banner.id },
          data: {
            imageUrl: uploadImage.imageUrl,
            publicId: uploadImage.publicId,
          },
        });
      }

      banner = await this.prismaService.banner.update({
        where: { id: banner.id },
        data: {
          name: updateRequest.name,
        },
      });

      this.loggerService.info(
        'BANNER',
        'service',
        'Banner updated successfully',
        {
          id: banner.id,
          user_id: user.id,
          store_id: storeId,
        },
      );

      return this.toBannerResponse(banner);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BANNER',
        'An unexpected error occurred during updating banner',
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
    this.loggerService.info('BANNER', 'service', 'Deleting banner initiated', {
      user_id: user.id,
      store_id: storeId,
      id,
    });

    try {
      const store = await this.storeService.checkExistingStore({
        id: storeId,
        userId: user.id,
      });
      const banner = await this.checkExistingBanner({ id, storeId: store.id });
      const publicId = banner.publicId.toString();

      await this.prismaService.banner.delete({
        where: { id: banner.id },
      });

      await this.cloudinaryService.deleteImage(publicId);

      this.loggerService.info(
        'BANNER',
        'service',
        'Banner deleted successfully',
        {
          id: banner.id,
          user_id: user.id,
          store_id: store.id,
        },
      );

      return { message: 'Banner successfully deleted', success: true };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BANNER',
        'An unexpected error occurred during deleting banner',
        {
          id,
          user_id: user.id,
          store_id: storeId,
        },
      );
    }
  }

  private toBannerResponse(banner: Banner): BannerResponse {
    return {
      id: banner.id,
      storeId: banner.storeId,
      publicId: banner.publicId,
      name: banner.name,
      imageUrl: banner.imageUrl,
      createdAt: banner.createdAt.toISOString(),
      updatedAt: banner.updatedAt.toISOString(),
    };
  }

  private async checkExistingBanner(params: {
    id: number;
    storeId: number;
  }): Promise<Banner> {
    this.loggerService.info(
      'BANNER',
      'service',
      'Check existing banner initiated',
      {
        id: params.id,
        store_id: params.storeId,
      },
    );

    if (!params.id || !params.storeId) {
      this.loggerService.warn(
        'BANNER',
        'service',
        'Checking for existing banner failed - Banner ID and Store ID is missing',
        {
          id: params.id,
          store_id: params.storeId,
        },
      );
      throw new BadRequestException('Please insert Banner ID and Store ID');
    }

    try {
      const banner = await this.prismaService.banner.findUnique({
        where: { id: params.id },
      });

      if (!banner) {
        this.loggerService.warn(
          'BANNER',
          'service',
          'Checking for existing banner failed - Banner not found',
          {
            id: params.id,
            store_id: params.storeId,
          },
        );
        throw new NotFoundException('Banner not found');
      }

      if (banner.storeId !== params.storeId) {
        this.loggerService.warn(
          'BANNER',
          'service',
          'Checking for existing banner failed - Store ID not matched',
          {
            id: banner.id,
            banner_store_id: banner.storeId,
            params_store_id: params.storeId,
          },
        );
        throw new ForbiddenException(
          'You do not have permission to access this banner',
        );
      }

      return banner;
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BANNER',
        'An unexpected error while checking existing banner',
        {
          id: params.id,
          store_id: params.storeId,
        },
      );
    }
  }

  private async checkExistingBannerName(params: {
    storeId: number;
    name: string;
  }): Promise<void> {
    this.loggerService.info(
      'BANNER',
      'service',
      'Checking existing banner name initiated',
      {
        store_id: params.storeId,
        name: params.name,
      },
    );

    if (!params.name || !params.storeId) {
      this.loggerService.warn(
        'BANNER',
        'service',
        'Checking for existing banner name failed - Banner name or Store ID is missing',
        {
          name: params.name,
          store_id: params.storeId,
        },
      );
      throw new BadRequestException('Please insert Banner name and Store ID');
    }

    try {
      const banner = await this.prismaService.banner.findUnique({
        where: {
          storeId_name: {
            storeId: params.storeId,
            name: params.name,
          },
        },
      });

      if (banner) {
        this.loggerService.warn(
          'BANNER',
          'service',
          'Checking for existing banner name failed - Banner name already exists',
          {
            store_id: params.storeId,
            name: params.name,
          },
        );

        throw new BadRequestException(
          'Banner already exists. Please Try a different one.',
        );
      }
    } catch (error) {
      this.handleErrorService.service(
        error,
        'BANNER',
        'An unexpected error occurred while checking existing banner name',
        {
          store_id: params.storeId,
          name: params.name,
        },
      );
    }
  }
}
