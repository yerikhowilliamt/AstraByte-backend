import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { LoggerService } from '../../common/logger.service';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import WebResponse, { response } from '../../models/web.model';
import { AddressResponse } from '../../models/address.model';
import { CreateAddressRequest } from './dto/create-address.dto';
import { Auth } from '../../common/auth/auth.decorator';
import { User } from '@prisma/client';
import { handleErrorService } from '../../common/handle-error.service';
import { UpdateAddressRequest } from './dto/update-address.dto';

@Controller('users/:userId/addresses')
export class AddressController {
  constructor(
    private loggerService: LoggerService,
    private addressService: AddressService,
    private handleErrorService: handleErrorService
  ) { }
  
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() request: CreateAddressRequest
  ): Promise<WebResponse<AddressResponse>> {
    this.loggerService.debug('ADDRESS', 'controller', 'Creating new address initiated', {
      user_id: userId,
      street: request.street,
      city: request.city,
      province: request.province,
      postal_code: request.postalCode,
      country: request.country,
    });

    this.loggerService.debug('ADDRESS', 'controller', 'Created new contact initiated', {
      user_id: userId,
      city: request.city,
      province: request.province,
      country: request.country
    });

    try {
      this.checkAuthorization(userId, user);

      const result = await this.addressService.create(user, request);

      this.loggerService.info('ADDRESS', 'controller', 'Address created successfully', {
        user_id: result.userId,
        contact_id: result.id,
        response_status: 201,
      });

      return response(result, 201);
    } catch (error) {
      this.handleErrorService.controller(error, 'ADDRESS')
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<WebResponse<AddressResponse[]>> {
    this.loggerService.info('ADDRESS', 'controller', 'Fetching addresses initiated', {
      user_id: userId,
      limit: limit,
      page: page
    })

    try {
      this.checkAuthorization(userId, user);

      const result = await this.addressService.list(user, limit, page);
      const addressesId = result.data.map((address) => address.id).join(',');

      this.loggerService.info('ADDRESS', 'controller', 'Addresses fetched successfully', {
        user_id: userId,
        addresses_id: addressesId,
        data: result.paging.size,
        response_status: 200,
      });

      return response(result.data, 200, result.paging)
    } catch (error) {
      this.handleErrorService.controller(error, 'ADDRESS')
    }
  }

  @Get('primary')
  @UseGuards(JwtAuthGuard)
  async get(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<WebResponse<AddressResponse>> {
    this.loggerService.info('ADDRESS', 'controller', 'Fetching primary address initiated', {
      user_id: userId,
    })

    try {
      this.checkAuthorization(userId, user);

      const result = await this.addressService.getPrimary(user);

      this.loggerService.info('ADDRESS', 'controller', 'Primary address fetched successfully', {
        user_id: result.userId,
        address_id: result.id,
        response_status: 200,
      });

      return response(result, 200)
    } catch (error) {
      this.handleErrorService.controller(error, 'ADDRESS')
    }
  }

  @Put(':addressId')
  @UseGuards(JwtAuthGuard)
  async update(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() request: UpdateAddressRequest
  ): Promise<WebResponse<AddressResponse>> {
    this.loggerService.info('ADDRESS', 'controller', 'Updating address initiated', {
      user_id: userId,
      address_id: addressId
    })

    try {
      this.checkAuthorization(userId, user);

      const result = await this.addressService.update(user, addressId, request);

      this.loggerService.info('ADDRESS', 'controller', 'Address updated successfully', {
        user_id: result.userId,
        address_id: result.id,
        response_status: 200,
      });

      return response(result, 200)
    } catch (error) {
      this.handleErrorService.controller(error, 'ADDRESS',)
    }
  }

  @Delete(':addressId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('addressId', ParseIntPipe) addressId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    this.loggerService.info('ADDRESS', 'controller', 'Deleting address intiated', {
      address_id: addressId
    });

    try {
      this.checkAuthorization(userId, user);

      const result = await this.addressService.delete(user, addressId);

      this.loggerService.info('ADDRESS', 'controller', 'Address deleted successfully', {
        user_id: userId,
        addressId_id: addressId,
        response_status: 200,
      });

      return response({
        message: result.message,
        success: result.success
      }, 200)
    } catch (error) {
      this.handleErrorService.controller(error, 'ADDRESS')
    }
  }

  private checkAuthorization(userId: number, user: User): void {
    if (user.id !== userId) {
      this.loggerService.info('ADDRESS', 'controller', 'Checking authorization initiated');

      this.loggerService.debug('ADDRESS', 'controller', 'Chechking Authorization initiated', {
        user_id: user.id,
        email: user.email
      });
      throw new UnauthorizedException(
        `You are not authorized to access this user's addresses`,
      );
    }
  }
}
