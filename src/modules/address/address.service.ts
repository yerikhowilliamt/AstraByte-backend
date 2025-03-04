import {
  BadRequestException,
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

@Injectable()
export class AddressService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private handleErrorService: handleErrorService
  ) {}

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
        await this.setPrimaryAddress(address, user.id),
      );
    } catch (error) {
      this.handleErrorService.service(error, 'ADDRESS', 'Error creating address', {
        user_id: user.id,
      });
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
      const currentUser = await this.checkExistingUser(user.email);

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
        'Addresses retrieved successfully',
        {
          user_id: user.id,
          total_data: addresses.length,
          total_page: totalPages,
          contact_ids: addresses.map((contact) => contact.id).join(','),
        },
      );
      return {
        data: addresses.map(this.toAddressResponse),
        paging: {
          size: limit,
          current_page: page,
          total_page: totalPages,
        },
      };
    } catch (error) {
      this.handleErrorService.service(error, 'ADDRESS', 'Error fetching addresses', {
        user_id: user.id,
        limit,
        page
      });
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
      const address = await this.prismaService.address.findFirst({
        where: {
          userId: user.id,
          isPrimary: true
        },
      });

      if (!address) {
        throw new NotFoundException('Primary address not found');
      }

      this.loggerService.info(
        'ADDRESS',
        'service',
        'Primary address fetched successfully',
        {
          user_id: user.id,
          address_id: address.id,
        },
      );

      return this.toAddressResponse(address);
    } catch (error) {
      this.handleErrorService.service(error, 'ADDRESS', 'Error fetching primary address', {
        user_id: user.id
      });
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

      let address = await this.checkExistingAddress(addressId, user.id);

      if (updateRequest.street) {
        await this.checkSameAddressExists(
          user.id,
          { street: updateRequest.street },
          addressId,
        );
      }

      if (updateRequest.isPrimary === true) {
        await this.ensureSinglePrimaryAddress(user.id, addressId);
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
        await this.setPrimaryAddress(address, user.id),
      );
    } catch (error) {
      this.handleErrorService.service(error, 'ADDRESS', 'Error updating contact', {
        user_id: user.id,
        address_id: addressId,
      });
    }
  }

  async delete(
    user: User,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.loggerService.info('ADDRESS', 'service', 'Deleting address initiated', {id, user_id: user.id});

    try {
      const address = await this.checkExistingAddress(id, user.id);

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
      this.handleErrorService.service(error, 'ADDRESS', 'Error deleting address', {
        user_id: user.id,
        address_id: id,
      });
    }
  }

  private async checkExistingUser(email: string): Promise<User> {
    this.loggerService.warn(
      'ADDRESS',
      'service',
      'Checking user existence initiated',
    );

    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.loggerService.warn('ADDRESS', 'service', 'User existence verified', {
      user_id: user.id,
    });

    return user;
  }

  private async checkExistingAddress(
    id: number,
    userId: number,
  ): Promise<Address> {
    this.loggerService.warn(
      'ADDRESS',
      'service',
      'Checking address existence initiated',
      {
        user_id: userId,
        id: id
      }
    );

    const address = await this.prismaService.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    this.loggerService.warn(
      'ADDRESS',
      'service',
      'Address existence verified',
      {
        user_id: address.userId,
        address_id: address.id,
      },
    );

    return address;
  }

  private async checkSameAddressExists(
    userId: number,
    params: Partial<Address>,
    excludeId?: number,
  ): Promise<void> {
    this.loggerService.warn(
      'ADDRESS',
      'service',
      'Checking same address existence initiated',
    );

    const existingAddress = await this.prismaService.address.findFirst({
      where: {
        ...params,
        userId,
        NOT: { id: excludeId },
      },
    });

    if (existingAddress) {
      throw new BadRequestException('This Address already exists');
    }
  }

  private async ensureSinglePrimaryAddress(userId: number, excludeId?: number): Promise<void> {
    this.loggerService.warn(
      'ADDRESS',
      'service',
      `Ensuring only one primary address for userId: ${userId}, excluding id: ${excludeId ?? 'none'}`
    );
  
    await this.prismaService.address.updateMany({
      where: {
        userId,
        isPrimary: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      data: { isPrimary: false },
    });
  
    this.loggerService.info(
      'ADDRESS',
      'service',
      `Primary address update completed for userId: ${userId}`
    );
  }  

  private async setPrimaryAddress(
    address: Address,
    userId: number,
  ): Promise<Address> {
    this.loggerService.warn(
      'ADDRESS',
      'service',
      'Set user address as primary initiated',
    );

    const currentPrimaryAddress = await this.prismaService.address.findFirst({
      where: { userId, isPrimary: true },
    });

    if (!currentPrimaryAddress && address.isPrimary) {
      return this.prismaService.address.update({
        where: { id: address.id },
        data: { isPrimary: true },
      });
    }

    if (address.isPrimary && currentPrimaryAddress?.id !== address.id) {
      await this.prismaService.address.update({
        where: { id: currentPrimaryAddress.id },
        data: { isPrimary: false },
      });

      this.loggerService.warn(
        'ADDRESS',
        'service',
        'Primary address updated successfully',
        {
          user_id: address.userId,
          address_id: address.id,
          address_primary: address.isPrimary,
        },
      );

      return this.prismaService.address.update({
        where: { id: address.id },
        data: { isPrimary: true },
      });
    }

    return address;
  }
}
