import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Contact, User } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { CreateContactRequest } from './dto/create-contact.dto';
import { ContactResponse } from '../../models/contact.model';
import { ContactValidation } from './contact.validation';
import WebResponse from '../../models/web.model';
import { UpdateContactRequest } from './dto/update-contact.dto';
import { LoggerService } from '../../common/logger.service';
import { handleErrorService } from '../../common/handle-error.service';

@Injectable()
export class ContactService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private handleErrorService: handleErrorService
  ) {}

  async create(
    user: User,
    request: CreateContactRequest,
  ): Promise<ContactResponse> {
    this.loggerService.info('CONTACT', 'service', 'Create contact initiated', {
      user_id: user.id,
    });
    try {
      const createRequest = this.validationService.validate(
        ContactValidation.CREATE,
        request,
      );
      await this.checkPhoneExists(user.id, createRequest.phone);
      const contact = await this.prismaService.contact.create({
        data: { userId: user.id, phone: createRequest.phone },
      });
      this.loggerService.info('CONTACT', 'service', 'Contact created successfully', {
        user_id: user.id,
        contact_id: contact.id,
      });
      return this.toContactResponse(contact);
    } catch (error) {
      this.handleErrorService.service(error,'CONTACT', 'Failed to create contact', { user_id: user.id });
    }
  }

  async list(
    user: User,
    limit: number,
    page: number,
  ): Promise<WebResponse<ContactResponse[]>> {
    this.loggerService.info(
      'CONTACT',
      'service',
      'Fetching contacts initiated',
      { user_id: user.id, page, limit },
    );
    try {
      const currentUser = await this.checkExistingUser(user.id);
      const skip = (page - 1) * limit;
      const [contacts, total] = await Promise.all([
        this.prismaService.contact.findMany({
          where: { userId: currentUser.id },
          skip,
          take: limit,
        }),
        this.prismaService.contact.count({ where: { userId: currentUser.id } }),
      ]);
      if (contacts.length === 0)
        throw new NotFoundException('No contacts found');
      const totalPages = Math.ceil(total / limit);
      this.loggerService.info('CONTACT', 'service', 'Contacts fetched successfully', {
        user_id: user.id,
        total_contacts: contacts.length,
        total_pages: totalPages,
      });
      return {
        data: contacts.map(this.toContactResponse),
        paging: { current_page: page, size: limit, total_page: totalPages },
      };
    } catch (error) {
      this.handleErrorService.service(error,'CONTACT', 'Failed to fetch contacts', { user_id: user.id });
    }
  }

  async get(user: User, id: number): Promise<ContactResponse> {
    this.loggerService.info(
      'CONTACT',
      'service',
      'Fetching contact initiated',
      { user_id: user.id, contact_id: id },
    );
    try {
      const contact = await this.checkExistingContact(id, user.id);

      this.loggerService.info('CONTACT', 'service', 'Contact fetched successfully', {
        user_id: user.id,
        contact_id: id,
      });

      return this.toContactResponse(contact);
    } catch (error) {
      this.handleErrorService.service(error,'CONTACT', 'Failed to fetch contact', {
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
    this.loggerService.info(
      'CONTACT',
      'service',
      'Updating contact initiated',
      { user_id: user.id, contact_id: contactId },
    );
    try {
      const updateRequest = this.validationService.validate(
        ContactValidation.UPDATE,
        request,
      );
      let contact = await this.checkExistingContact(contactId, user.id);
      await this.checkPhoneExists(user.id, updateRequest.phone, contact.id);
      
      contact = await this.prismaService.contact.update({
        where: { id: contactId },
        data: { phone: updateRequest.phone },
      });

      this.loggerService.info('CONTACT', 'service', 'Contact updated successfully', {
        user_id: user.id,
        contact_id: contactId,
      });

      return this.toContactResponse(contact);
    } catch (error) {
      this.handleErrorService.service(error,'CONTACT', 'Failed to update contact', {
        user_id: user.id,
        contact_id: contactId,
      });
    }
  }

  async delete(
    user: User,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.loggerService.info(
      'CONTACT',
      'service',
      'Deleting contact initiated',
      { user_id: user.id, contact_id: id },
    );
    try {
      const contact = await this.checkExistingContact(id, user.id);
      await this.prismaService.contact.delete({ where: { id: contact.id } });
      
      this.loggerService.info('CONTACT', 'service', 'Contact deleted successfully', {
        user_id: user.id,
        contact_id: contact.id,
      });
      
      return { message: 'Contact successfully deleted', success: true };
    } catch (error) {
      this.handleErrorService.service(error,'CONTACT', 'Failed to delete contact', {
        user_id: user.id,
        contact_id: id,
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
    this.loggerService.info('CONTACT', 'service', 'Checking user existence', {
      user_id: id,
    });
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async checkExistingContact(
    id: number,
    userId: number,
  ): Promise<Contact> {
    this.loggerService.info(
      'CONTACT',
      'service',
      'Checking contact existence',
      { user_id: userId, contact_id: id },
    );
    const contact = await this.prismaService.contact.findFirst({
      where: { id, userId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  private async checkPhoneExists(
    userId: number,
    phone: string,
    excludeId?: number,
  ): Promise<void> {
    this.loggerService.warn('CONTACT', 'service', 'Checking phone existence', {
      user_id: userId,
    });

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
}
