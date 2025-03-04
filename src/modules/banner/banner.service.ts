import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Banner, Store, User } from '@prisma/client';
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

@Injectable()
export class BannerService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private cloudinaryService: CloudinaryService,
    private imageService: ImageService,
    private handleErrorService: handleErrorService
  ) { }

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

  private async checkExistingStore(params: {
    userId: number;
    storeId: number;
  }): Promise<Store> {
    this.loggerService.warn('BANNER', 'service', 'Check existing store with params:', {
      user_id: params.userId,
      store_id: params.storeId
    });

    const store = await this.prismaService.store.findUnique({
      where: { userId: params.userId, id: params.storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  private async checkExistingBanner(params: {
    id: number;
    storeId: number;
  }): Promise<Banner> {
    this.loggerService.warn(
      'BANNER', 'service', 'Check existing banner with params:', {
      id: params.id,
      store_id: params.storeId
    }
    );

    if (!params.id) {
      throw new BadRequestException('Banner ID is required.');
    }

    const banner = await this.prismaService.banner.findUnique({
      where: { id: params.id },
    });

    if (!banner || banner.storeId !== params.storeId) {
      throw new NotFoundException(
        'Banner not found or does not belong to the store.',
      );
    }

    return banner;
  }

  async create(
    user: User,
    storeId: number,
    request: CreateBannerRequest,
    image?: Express.Multer.File,
  ): Promise<BannerResponse> {
    this.loggerService.info('BANNER', 'service', 'Creating banner initiated', {
      user_id: user.id,
      store_id: storeId
    });

    try {
      const store = await this.checkExistingStore({
        userId: user.id,
        storeId,
      });

      if (!request.name) {
        throw new BadRequestException('Name cannot be empty.')
      }

      const createRequest: CreateBannerRequest =
        this.validationService.validate(BannerValidation.CREATE, request);

      const uploadImage = await this.imageService.uploadImage(image);

      const banner = await this.prismaService.banner.create({
        data: {
          storeId: store.id,
          name: createRequest.name,
          publicId: uploadImage.publicId,
          imageUrl: uploadImage.imageUrl,
        }
      })

      this.loggerService.info('BANNER', 'service', 'Banner created successfully', {
        id: banner.id,
        store_id: banner.storeId,
        public_id: banner.publicId,
      })

      return this.toBannerResponse(banner);
    } catch (error) {
      this.handleErrorService.service(error, 'BANNER', 'Failed to create new banner', {
        user_id: user.id,
        store_id: storeId
      });
    }
  }

  async list(
    user: User,
    storeId: number,
    limit: number,
    page: number,
  ): Promise<WebResponse<BannerResponse[]>> {
    this.loggerService.info('BANNER', 'service', 'Fetching banners initiated', {
      user_id: user.id, store_id: storeId, page, limit
    });

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const skip = (page - 1) * limit;

      const [banners, total] = await Promise.all([
        this.prismaService.banner.findMany({
          where: { storeId: store.id },
          skip: skip,
          take: limit
        }),
        await this.prismaService.banner.count({
          where: { storeId: store.id },
        })
      ])

      if (banners.length === 0) {
        throw new NotFoundException('Banners not found')
      }

      const totalPages = Math.ceil(total / limit);

      this.loggerService.info('BANNER', 'service', 'Banners fetched successfully', {
        user_id: user.id,
        total_banners: banners.length,
        total_pages: totalPages,
      });

      return {
        data: banners.map(this.toBannerResponse),
        paging: {
          current_page: page,
          size: limit,
          total_page: totalPages
        }
      }
    } catch (error) {
      this.handleErrorService.service(error, 'BANNER', 'Failed to fetching banners', {
        user_id: user.id,
        store_id: storeId
      })
    }
  }

  async get(user: User, storeId: number, id: number): Promise<BannerResponse> {
    this.loggerService.info('BANNER', 'service', 'Fetching banner initiated', {
      user_id: user.id, store_id: storeId
    });

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const banner = await this.checkExistingBanner({ id, storeId: store.id });

      this.loggerService.info('BANNER', 'service', 'Banner fetched successfully', {
        user_id: user.id,
        store_id: banner.storeId,
        public_id: banner.publicId,
      });

      return this.toBannerResponse(banner);
    } catch (error) {
      this.handleErrorService.service(error, 'BANNER', 'Failed to fetching banner', {
        id,
        user_id: user.id,
        store_id: storeId
      });
    }
  }

  async update(
    user: User,
    storeId: number,
    id: number,
    request: UpdateBannerRequest,
    image?: Express.Multer.File,
  ): Promise<BannerResponse> {
    this.loggerService.warn('BANNER', 'service', 'Updating banner initiated', {
      user_id: user.id, store_id: storeId
    });

    try {
      const store = await this.checkExistingStore({
        userId: user.id,
        storeId,
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
          data: {imageUrl: uploadImage.imageUrl, publicId: uploadImage.publicId}
        })
      }

      banner = await this.prismaService.banner.update({
        where: { id: banner.id },
        data: {
          name: updateRequest.name,
        },
      });

      this.loggerService.info('BANNER', 'service', 'Banner updated successfully', {
        id: banner.id,
        user_id: user.id,
        store_id: storeId,
      });

      return this.toBannerResponse(banner);
    } catch (error) {
      this.handleErrorService.service(error, 'BANNER', 'Failed to update banner', {
        id,
        user_id: user.id,
        store_id: storeId
      });
    }
  }

  async delete(
    user: User,
    storeId: number,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.loggerService.info('BANNER', 'service', 'deleting banner initiated', {
      user_id: user.id, store_id: storeId, id
    });

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });
      const banner = await this.checkExistingBanner({ id, storeId: store.id });
      const publicId = banner.publicId.toString();

      await this.prismaService.banner.delete({
        where: { id: banner.id },
      });

      await this.cloudinaryService.deleteImage(publicId)

      this.loggerService.info('BANNER', 'service', 'Banner deleted successfully', {
        id: banner.id,
        user_id: user.id,
        store_id: store.id,
      });

      return { message: 'Banner successfully deleted', success: true };
    } catch (error) {
      this.handleErrorService.service(error, 'BANNER', 'Failed to delete banner', {
        id,
        user_id: user.id,
        store_id: storeId
      });
    }
  }
}
