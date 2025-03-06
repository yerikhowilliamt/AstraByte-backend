import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Address, User } from '@prisma/client';
import { LoggerService } from '../../common/logger.service';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { CreateAddressRequest } from './dto/create-address.dto';
import { AddressResponse } from '../../models/address.model';
import { AddressValidation } from './address.validation';
import WebResponse from '../../models/web.model';
import { UpdateAddressRequest } from './dto/update-address.dto';
import { handleErrorService } from '../../common/handle-error.service';
import { UserService } from '../user/user.service';

@Injectable()
export class AddressService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private userService: UserService,
    private handleErrorService: handleErrorService,
  ) {}

  async create(
    user: User,
    request: CreateAddressRequest,
  ): Promise<AddressResponse> {
    this.loggerService.info('ADDRESS', 'service', 'Create address initiated', {
      user_id: user.id,
    });

    try {
      const createRequest: CreateAddressRequest =
        this.validationService.validate(AddressValidation.CREATE, request);

      await this.checkSameAddressExists(user.id, createRequest);

      const currentPrimaryAddress = await this.prismaService.address.findFirst({
        where: { userId: user.id, isPrimary: true },
      });

      if (!currentPrimaryAddress && createRequest.isPrimary === false) {
        createRequest.isPrimary = true;
      }

      const address = await this.prismaService.address.create({
        data: {
          userId: user.id,
          street: createRequest.street,
          city: createRequest.city,
          province: createRequest.province,
          country: createRequest.country,
          postalCode: createRequest.postalCode,
          isPrimary: createRequest.isPrimary,
        },
      });

      this.loggerService.info(
        'ADDRESS',
        'service',
        'Address successfully created',
        {
          user_id: user.id,
          address_id: address.id,
        },
      );

      return this.toAddressResponse(
        await this.setPrimaryAddress({address, userId: user.id}),
      );
    } catch (error) {
      this.handleErrorService.service(
        error,
        'ADDRESS',
        'An unexpected error occurred while creating address',
        {
          user_id: user.id,
        },
      );
    }
  }

  async list(
    user: User,
    limit: number,
    page: number,
  ): Promise<WebResponse<AddressResponse[]>> {
    this.loggerService.info(
      'ADDRESS',
      'service',
      'Fetching addresses initiated',
      {
        user_id: user.id,
        page: page,
        limit: limit,
      },
    );

    try {
      const currentUser = await this.userService.checkExistingUser(user.email);

      const skip = (page - 1) * limit;

      const [addresses, total] = await Promise.all([
        this.prismaService.address.findMany({
          where: { userId: currentUser.id },
          skip: skip,
          take: limit,
        }),
        this.prismaService.address.count({
          where: { userId: currentUser.id },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.loggerService.info(
        'ADDRESS',
        'service',
        'Addresses fetched successfully',
        {
          user_id: user.id,
          total_data: addresses.length,
          total_page: totalPages,
          address_ids: addresses.map((address) => address.id).join(','),
        },
      );
      return {
        data: addresses.map(this.toAddressResponse),
        paging: {
          size: limit,
          current_page: page,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'ADDRESS',
        'An unexpected error occurred while fetching addresses',
        {
          user_id: user.id,
          limit,
          page,
        },
      );
    }
  }

  async getPrimary(user: User): Promise<AddressResponse> {
    this.loggerService.info(
      'ADDRESS',
      'service',
      'Fetching primary address initiated',
      {
        user_id: user.id,
      },
    );

    try {
      const primaryAddress = await this.prismaService.address.findFirst({
        where: {
          userId: user.id,
          isPrimary: true,
        },
      });

      if (!primaryAddress) {
        this.loggerService.warn(
          'ADDRESS',
          'service',
          'Checking for existing primary address failed - Primary adress not found',
          {
            id: primaryAddress.id,
            user_id: user.id,
          },
        );
        throw new NotFoundException('Primary address not found');
      }

      this.loggerService.info(
        'ADDRESS',
        'service',
        'Primary address fetched successfully',
        {
          user_id: user.id,
          address_id: primaryAddress.id,
        },
      );

      return this.toAddressResponse(primaryAddress);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'ADDRESS',
        'An unexpected error occurred while fetching primary address',
        {
          user_id: user.id,
        },
      );
    }
  }

  async update(
    user: User,
    addressId: number,
    request: UpdateAddressRequest,
  ): Promise<AddressResponse> {
    this.loggerService.info(
      'ADDRESS',
      'service',
      'Updating address initiated',
      {
        user_id: user.id,
        address_id: addressId,
      },
    );

    try {
      const updateRequest: UpdateAddressRequest =
        this.validationService.validate(AddressValidation.UPDATE, request);

      let address = await this.checkExistingAddress({
        id: addressId,
        userId: user.id,
      });

      if (updateRequest.street) {
        this.loggerService.warn(
          'ADDRESS',
          'service',
          'Checking for street update request',
          {
            id: address.id,
            user_id: user.id,
            street: updateRequest.street,
          },
        );

        await this.checkSameAddressExists(user.id, {
          street: updateRequest.street,
        });
      }

      if (updateRequest.isPrimary === true) {
        await this.ensureSinglePrimaryAddress({
          userId: user.id,
          excludeId: addressId,
        });
      }

      address = await this.prismaService.address.update({
        where: { id: addressId, userId: user.id },
        data: updateRequest,
      });

      this.loggerService.info(
        'ADDRESS',
        'service',
        'Address successfully updated',
        {
          user_id: address.userId,
          address_id: address.id,
        },
      );

      return this.toAddressResponse(
        await this.setPrimaryAddress({address, userId: user.id}),
      );
    } catch (error) {
      this.handleErrorService.service(
        error,
        'ADDRESS',
        'An unexpected error occurred during updating contact',
        {
          user_id: user.id,
          address_id: addressId,
        },
      );
    }
  }

  async delete(
    user: User,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.loggerService.info(
      'ADDRESS',
      'service',
      'Deleting address initiated',
      { id, user_id: user.id },
    );

    try {
      const address = await this.checkExistingAddress({ id, userId: user.id });

      await this.prismaService.address.delete({
        where: { id: address.id },
      });

      this.loggerService.info(
        'ADDRESS',
        'service',
        'Address deleted successfully',
        {
          user_id: address.userId,
          address_id: address.id,
        },
      );

      return { message: 'Address successfully deleted', success: true };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'ADDRESS',
        'An unexpected error occurred during deleting address',
        {
          user_id: user.id,
          address_id: id,
        },
      );
    }
  }

  private toAddressResponse(address: Address) {
    return {
      id: address.id,
      userId: address.userId,
      street: address.street,
      city: address.city,
      province: address.province,
      country: address.country,
      postalCode: address.postalCode,
      isPrimary: address.isPrimary,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }
  private async checkExistingAddress(params: {
    id: number;
    userId: number;
  }): Promise<Address> {
    this.loggerService.info(
      'ADDRESS',
      'service',
      'Checking address existence initiated',
      {
        id: params.id,
        user_id: params.userId,
      },
    );

    try {
      const address = await this.prismaService.address.findUnique({
        where: { id: params.id },
      });

      if (!address) {
        this.loggerService.warn(
          'ADDRESS',
          'service',
          'Checking for existing address failed - Address not found',
          {
            id: address.id,
          },
        );
        throw new NotFoundException('Address not found');
      }

      if (address.userId !== params.userId) {
        this.loggerService.warn(
          'ADDRESS',
          'service',
          'Checking for existing address failed - User ID not matched',
          {
            id: params.id,
            user_id: params.userId,
          },
        );
        throw new ForbiddenException(
          'You do not have permission to access this address',
        );
      }

      this.loggerService.info(
        'ADDRESS',
        'service',
        'Address existence verified',
        {
          user_id: address.userId,
          address_id: address.id,
        },
      );

      return address;
    } catch (error) {
      this.handleErrorService.service(
        error,
        'ADDRESS',
        'An unexpected error occurred while checking existing address',
        {
          id: params.id,
          user_id: params.userId,
        },
      );
    }
  }

  private async checkSameAddressExists(
    userId: number,
    params: Partial<Address>,
  ): Promise<void> {
    this.loggerService.info(
      'ADDRESS',
      'service',
      'Checking same address existence initiated',
      {
        userId,
        street: params.street,
        city: params.city,
        province: params.province,
        country: params.country,
        postalCode: params.postalCode,
      },
    );

    if (
      !params.street ||
      !params.city ||
      !params.province ||
      !params.country ||
      !params.postalCode
    ) {
      this.loggerService.warn(
        'ADDRESS',
        'service',
        'Checking failed - Missing required fields',
        {
          street: params.street,
          city: params.city,
          province: params.province,
          country: params.country,
          postalCode: params.postalCode,
        },
      );
      throw new BadRequestException('All address fields must be provided.');
    }

    try {
      const existingAddress = await this.prismaService.address.findUnique({
        where: {
          userId_street_city_province_country_postalCode: {
            userId,
            street: params.street,
            city: params.city,
            province: params.province,
            country: params.country,
            postalCode: params.postalCode,
          },
        },
      });

      if (existingAddress) {
        this.loggerService.warn(
          'ADDRESS',
          'service',
          'Checking for existing same address failed - Address already exists',
          {
            id: existingAddress.id,
          },
        );
        throw new BadRequestException('This address already exists.');
      }
    } catch (error) {
      this.handleErrorService.service(
        error,
        'ADDRESS',
        'An unexpected error occurred while checking same address exists',
        {
          user_id: userId,
        },
      );
    }
  }

  private async ensureSinglePrimaryAddress(params: {
    userId: number;
    excludeId?: number;
  }): Promise<void> {
    this.loggerService.info(
      'ADDRESS',
      'service',
      'Ensuring only one primary address initiated',
      {
        user_id: params.userId,
        exclude_id: params.excludeId || null,
      },
    );

    if (!params.userId) {
      this.loggerService.warn(
        'ADDRESS',
        'service',
        'Ensuring a single primary address failed - User ID is missing',
        {
          user_id: params.userId,
          exclude_id: params.excludeId || null
        },
      );
      throw new BadRequestException('Please insert User ID');
    }

    try {
      await this.prismaService.address.updateMany({
        where: {
          userId: params.userId,
          isPrimary: true,
          ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
        },
        data: { isPrimary: false },
      });

      this.loggerService.info(
        'ADDRESS',
        'service',
        `Primary address update completed`,
        {
          user_id: params.userId,
          exclude_id: params.excludeId || null,
        },
      );
    } catch (error) {
      this.handleErrorService.service(
        error,
        'ADDRESS',
        'An unexpected error occurred while ensuring a single primary address',
        {
          user_id: params.userId,
          exclude_id: params.excludeId || null,
        },
      );
    }
  }

  private async setPrimaryAddress(
    params: {
      address: Address,
      userId: number,
    }
  ): Promise<Address> {
    this.loggerService.info(
      'ADDRESS',
      'service',
      'Set user address as primary initiated',
      {
        id: params.address.id,
        user_id: params.userId
      }
    );

    if (!params.address || !params.userId) {
      this.loggerService.warn(
        'ADDRESS',
        'service',
        'Checking for set primary address failed - Address ID or User ID is missing',
        {
          id: params.address.id,
          user_id: params.userId,
        },
      );
      throw new BadRequestException('Please insert Address and User ID');
    }

    try {
      const currentPrimaryAddress = await this.prismaService.address.findFirst({
        where: { userId: params.userId, isPrimary: true },
      });

      if (!currentPrimaryAddress && params.address.isPrimary) {
        return this.prismaService.address.update({
          where: { id: params.address.id },
          data: { isPrimary: true },
        });
      }

      if (params.address.isPrimary && currentPrimaryAddress?.id !== params.address.id) {
        await this.prismaService.address.update({
          where: { id: currentPrimaryAddress.id },
          data: { isPrimary: false },
        });

        this.loggerService.info(
          'ADDRESS',
          'service',
          'Primary address updated successfully',
          {
            user_id: params.address.userId,
            address_id: params.address.id,
            address_primary: params.address.isPrimary,
          },
        );

        return this.prismaService.address.update({
          where: { id: params.address.id },
          data: { isPrimary: true },
        });
      }

      return params.address;
    } catch (error) {
      this.handleErrorService.service(
        error,
        'ADDRESS',
        'An unexpected error occurred while set user address as primary',
        {
          id: params.address.id,
          user_id: params.userId,
        },
      );
    }
  }
}
