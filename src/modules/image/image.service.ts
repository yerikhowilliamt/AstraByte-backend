import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CloudinaryService } from 'src/common/cloudinary.service';
import { handleErrorService } from 'src/common/handle-error.service';
import { LoggerService } from 'src/common/logger.service';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';

@Injectable()
export class ImageService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private cloudinaryService: CloudinaryService,
    private validationService: ValidationService,
    private handleErrorService: handleErrorService
  ) { }
  
  async uploadImage(image: Express.Multer.File): Promise<{ imageUrl: string; publicId: string; }> {
    if (!image) {
      throw new BadRequestException('No image provided for upload');
    }

    try {
      const uploadResult = await this.cloudinaryService.uploadImage(image);
      if (!uploadResult?.secure_url) {
        throw new InternalServerErrorException(
          'Failed to upload image to Cloudinary. Please try again',
        );
      }

      this.loggerService.warn('IMAGE', 'service', 'Image uploaded successfully');
      return {
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id
      };
    } catch (error) {
      this.handleErrorService.service(error, 'IMAGE', 'Failed to upload image. Please try again');
    }
  }

}
