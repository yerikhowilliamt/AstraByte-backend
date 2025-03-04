import {
  Body,
  Controller,
  DefaultValuePipe,
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
import WebResponse, { response } from '../../models/web.model';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Auth } from '../../common/auth/auth.decorator';
import { CreateContactRequest } from './dto/create-contact.dto';
import { ContactResponse } from '../../models/contact.model';
import { UpdateContactRequest } from './dto/update-contact.dto';
import { LoggerService } from '../../common/logger.service';
import { handleErrorService } from '../../common/handle-error.service';

@Controller('users/:userId/contacts')
export class ContactController {
  constructor(
    private loggerService: LoggerService,
    private contactService: ContactService,
    private handleErrorService: handleErrorService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() request: CreateContactRequest,
  ): Promise<WebResponse<ContactResponse>> {
    this.loggerService.debug('CONTACT', 'controller', 'Creating new contact initiated', {
      phone: request.phone
    });

    this.loggerService.info('CONTACT', 'controller', 'Created new contact initiated', {
      user_id: userId,
    })

    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.create(user, request);

      this.loggerService.info('CONTACT', 'controller', 'Contact created successfully', {
        user_id: result.userId,
        contact_id: result.id,
        response_status: 201,
      });
      
      return response(result, 201);
    } catch (error) {
      this.handleErrorService.controller(error, 'CONTACT');
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<WebResponse<ContactResponse[]>> {
    this.loggerService.info('CONTACT', 'controller', 'Fetching contacts initiated', {
      user_id: userId,
      limit: limit,
      page: page
    })
    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.list(user, limit, page);
      const contactsId = result.data.map((contact) => contact.id).join(',');

      this.loggerService.info('CONTACT', 'controller', 'Contacts fetched successfully', {
        user_id: userId,
        contacts_id: contactsId,
        data: result.paging.size,
        response_status: 200,
      });
      return response(result.data, 200, result.paging);
    } catch (error) {
      this.handleErrorService.controller(error, 'CONTACT');
    }
  }

  @Get(':contactId')
  @UseGuards(JwtAuthGuard)
  async get(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('contactId', ParseIntPipe) contactId: number,
  ): Promise<WebResponse<ContactResponse>> {
    this.loggerService.info('CONTACT', 'controller', 'Fetching contact initiated', {
      user_id: userId,
      contact_id: contactId
    });
    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.get(user, contactId);

      this.loggerService.info('CONTACT', 'controller', 'Contact fetched successfully', {
        user_id: result.userId,
        contact_id: result.id,
        response_status: 200,
      });
      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'CONTACT');
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
    this.loggerService.debug('CONTACT', 'controller', 'Updating contact intiated', {
      phone: request.phone
    });

    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.update(user, contactId, request);

      this.loggerService.info('CONTACT', 'controller', 'Contact updated successfully', {
        user_id: result.userId,
        contact_id: result.id,
        response_status: 200,
      });
      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'CONTACT');
    }
  }

  @Delete(':contactId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('contactId', ParseIntPipe) contactId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    this.loggerService.info('CONTACT', 'controller', 'Deleting contact intiated', {
      contact_id: contactId
    });

    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.delete(user, contactId);

      this.loggerService.info('CONTACT', 'controller', 'Contact deleted successfully', {
        user_id: userId,
        contact_id: contactId,
        response_status: 200,
      });
      return response(
        {
          message: result.message,
          success: result.success,
        },
        200,
      );
    } catch (error) {
      this.handleErrorService.controller(error, 'CONTACT');
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
}
