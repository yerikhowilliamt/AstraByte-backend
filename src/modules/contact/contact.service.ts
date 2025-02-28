import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Contact, User } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { CreateContactRequest } from './dto/create-contact.dto';
import { ContactResponse } from '../../models/contact.model';
import { ContactValidation } from './contact.validation';
import { ZodError } from 'zod';
import WebResponse from '../../models/web.model';
import { UpdateContactRequest } from './dto/update-contact.dto';
import { randomUUID } from 'crypto';
import { LoggerService } from '../../common/logger.service';

@Injectable()
export class ContactService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
  ) {}

  async create(
    user: User,
    request: CreateContactRequest,
  ): Promise<ContactResponse> {
    this.loggerService.info('CONTACT', 'service', 'Create contact initiated', {
      user_id: user.id
    });

    try {
      const createRequest = this.validationService.validate(
        ContactValidation.CREATE,
        request,
      );

      await this.checkPhoneExists(user.id, createRequest.phone);

      const contact = await this.prismaService.contact.create({
        data: {
          userId: user.id,
          phone: createRequest.phone,
        },
      });

      this.loggerService.info('CONTACT', 'service', 'Create contact success', {
        user_id: user.id,
        contact_id: contact.id,
      });

      return this.toContactResponse(contact);
    } catch (error) {
      this.handleError(error, 'Error creating contact', {
        user_id: user.id
      });
    }
  }

  async list(
    user: User,
    page: number = 1,
    limit: number = 10,
  ): Promise<WebResponse<ContactResponse[]>> {
    this.loggerService.info('CONTACT', 'service', 'Retrive contacts initiated', {
      user_id: user.id,
      page: page,
      limit: limit,
    });

    try {
      const currentUser = await this.checkExistingUser(user.id);

      const skip = (page - 1) * limit;

      const [contacts, total] = await Promise.all([
        this.prismaService.contact.findMany({
          where: { userId: currentUser.id },
          skip: skip,
          take: limit,
        }),
        this.prismaService.contact.count({
          where: { userId: currentUser.id },
        }),
      ]);

      if (contacts.length === 0) {
        throw new NotFoundException('Contacts not found');
      }

      const totalPage = Math.ceil(total / limit);

      this.loggerService.info('CONTACT', 'service', 'Retrive contacts success', {
        user_id: user.id,
        total_data: contacts.length,
        total_page: totalPage,
        contact_ids: contacts.map((contact) => contact.id).join(','),
      });

      return {
        data: contacts.map(this.toContactResponse),
        paging: {
          current_page: page,
          size: limit,
          total_page: totalPage,
        },
      };
    } catch (error) {
      this.handleError(error, 'Error fetching contact list', {
        user_id: user.id
      });
    }
  }

  async get(user: User, id: number): Promise<ContactResponse> {
    this.loggerService.info('CONTACT', 'service', 'Retrive contact initiated', {
      user_id: user.id,
      contact_id: id,
    });

    try {
      const contact = await this.checkExistingContact(id, user.id);

      this.loggerService.info('CONTACT', 'service', 'Retrive contact success', {
        user_id: user.id,
        contact_id: id,
      });

      return this.toContactResponse(contact);
    } catch (error) {
      this.handleError(error, 'Error fetching contact', {
        user_id: user.id,
        contact_id: id,
      });
    }
  }

  async update(
    user: User,
    contactId: number,
    request: UpdateContactRequest,
  ): Promise<ContactResponse> {
    this.loggerService.info('CONTACT', 'service', 'Updating contact initiated', {
      user_id: user.id,
      contact_id: contactId,
    });

    try {
      const updateRequest: UpdateContactRequest =
        this.validationService.validate(ContactValidation.UPDATE, request);

      let contact = await this.checkExistingContact(contactId, user.id);

      await this.checkPhoneExists(user.id, updateRequest.phone, contact.id);

      contact = await this.prismaService.contact.update({
        where: { id: contactId },
        data: {
          phone: updateRequest.phone,
        },
      });

      this.loggerService.info('CONTACT', 'service', 'Updated contact success', {
        user_id: user.id,
        contact_id: contactId,
      });

      return this.toContactResponse(contact);
    } catch (error) {
      this.handleError(error, 'Error updating contact', {
        user_id: user.id,
        contact_id: contactId
      });
    }
  }

  async delete(
    user: User,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.loggerService.info('CONTACT', 'service', 'Deleting contact', {
      user_id: user.id,
      contactId: id,
    });

    try {
      const contact = await this.checkExistingContact(id, user.id);

      await this.prismaService.contact.delete({
        where: { id: contact.id },
      });

      this.loggerService.info('CONTACT', 'service', 'Deleted contact success', {
        user_id: user.id,
        contactId: contact.id,
      });

      return { message: 'Contact successfully deleted', success: true };
    } catch (error) {
      this.handleError(error, 'Error deleting contact', {
        user_id: user.id,
        contactId: id,
      });
    }
  }

  private toContactResponse(contact: Contact): ContactResponse {
    return {
      id: contact.id,
      userId: contact.userId,
      phone: contact.phone,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    };
  }

  private async checkExistingUser(id: number): Promise<User> {
    
    this.loggerService.warn('CONTACT', 'service', 'Chechking user existence', {
      user_id: id
    });

    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async checkExistingContact(
    id: number,
    userId: number,
  ): Promise<Contact> {

    this.loggerService.warn('CONTACT', 'service', 'Checking contact existence', {
      user_id: userId,
      contact_id: id,
    });

    const contact = await this.prismaService.contact.findFirst({
      where: { id, userId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  private async checkPhoneExists(
    userId: number,
    phone: string,
    excludeId?: number,
  ): Promise<void> {
    this.loggerService.warn('CONTACT', 'service', 'Checking phone existence', {
      user_id: userId
    })

    const existingContact = await this.prismaService.contact.findFirst({
      where: {
        userId,
        phone,
        NOT: { id: excludeId },
      },
    });

    if (existingContact) {
      throw new BadRequestException('You have already added this phone number');
    }
  }

  private handleError(
    error: Error,
    message: string,
    details?: object,
  ): never {
    this.loggerService.error('CONTACT', 'service', message, {
      ...details,
      error: error.message,
      stack: error.stack,
    });
    if (error instanceof ZodError) {
      throw new BadRequestException(error);
    } else if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    } else {
      throw new InternalServerErrorException(
        'An unexpected error occurred. Please try again.',
      );
    }
  }
}
