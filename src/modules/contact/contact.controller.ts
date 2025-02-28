import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import WebResponse, { Paging } from '../../models/web.model';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Auth } from '../../common/auth/auth.decorator';
import { CreateContactRequest } from './dto/create-contact.dto';
import { ContactResponse } from '../../models/contact.model';
import { UpdateContactRequest } from './dto/update-contact.dto';
import { LoggerService } from '../../common/logger.service';

@Controller('users/:userId/contacts')
export class ContactController {
  constructor(
    private loggerService: LoggerService,
    private contactService: ContactService,
  ) {}

  private toContactResponse<T>(
    data: T,
    statusCode: number,
    paging?: Paging,
  ): WebResponse<T> {
    return {
      data,
      statusCode,
      ...(paging ? { paging } : {}),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() request: CreateContactRequest,
  ): Promise<WebResponse<ContactResponse>> {
    this.loggerService.debug('CONTACT', 'controller', 'Created new contact initiated', {
      phone: request.phone
    });

    this.loggerService.info('CONTACT', 'controller', 'Created new contact initiated')

    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.create(user, request);

      this.loggerService.info('CONTACT', 'controller', 'Created contact success', {
        user_id: result.userId,
        contact_id: result.id,
        response_status: 201,
      });
      return this.toContactResponse(result, 201);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ): Promise<WebResponse<ContactResponse[]>> {
    this.loggerService.info('CONTACT', 'controller', 'Retrive data contacts initiated', {
      user_id: userId,
      limit: limit,
      page: page
    })
    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.list(user, page, limit);
      const contactsId = result.data.map((contact) => contact.id).join(',');

      this.loggerService.info('CONTACT', 'controller', 'Retrive data contacts success', {
        user_id: userId,
        contacts_id: contactsId,
        data: result.paging.size,
        response_status: 200,
      });
      return this.toContactResponse(result.data, 200, result.paging);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':contactId')
  @UseGuards(JwtAuthGuard)
  async get(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('contactId', ParseIntPipe) contactId: number,
  ): Promise<WebResponse<ContactResponse>> {
    this.loggerService.info('CONTACT', 'controller', 'Retrive data contact initiated', {
      user_id: userId,
      contact_id: contactId
    });
    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.get(user, contactId);

      this.loggerService.info('CONTACT', 'controller', 'Retrive data contact success', {
        user_id: result.userId,
        contact_id: result.id,
        response_status: 200,
      });
      return this.toContactResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put(':contactId')
  @UseGuards(JwtAuthGuard)
  async update(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('contactId', ParseIntPipe) contactId: number,
    @Body() request: UpdateContactRequest,
  ): Promise<WebResponse<ContactResponse>> {
    this.loggerService.debug('CONTACT', 'controller', 'Updated data contact intiated', {
      phone: request.phone
    });

    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.update(user, contactId, request);
      this.loggerService.info('CONTACT', 'controller', 'Updated data contact success', {
        user_id: result.userId,
        contact_id: result.id,
        response_status: 200,
      });
      return this.toContactResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':contactId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('contactId', ParseIntPipe) contactId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.delete(user, contactId);

      this.loggerService.info('CONTACT', 'controller', 'Deleted data contact success', {
        user_id: userId,
        contact_id: contactId,
        response_status: 200,
      });
      return this.toContactResponse(
        {
          message: result.message,
          success: result.success,
        },
        200,
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  private checkAuthorization(userId: number, user: User): void {
    if (user.id !== userId) {
      this.loggerService.info('CONTACT', 'controller', 'Checking authorization initiated');

      this.loggerService.debug('CONTACT', 'controller', 'Chechking Authorization initiated', {
        user_id: user.id,
        email: user.email
      });
      throw new UnauthorizedException(
        `You are not authorized to access this user's contacts`,
      );
    }
  }

  private handleError(error: Error): never {
    if (error instanceof UnauthorizedException) {
      this.loggerService.error('CONTACT', 'controller', 'Unautorized user', {
        error: error.message,
        stack: error.stack,
        response_status: 401
      });
      throw error;
    }

    this.loggerService.error('CONTACT', 'controller', 'Internal server error', {
      error: error.message,
      stack: error.stack,
      response_status: 500
    });
    throw error;
  }
}
