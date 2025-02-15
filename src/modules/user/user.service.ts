import { Inject, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { Logger } from 'winston'
import { User } from '@prisma/client';
import { UserResponse } from '../../models/user.model';
import { UpdateUserRequest } from './dto/update-user.dto';
import { UserValidation } from './user.validation';

@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
  ) { }
  
  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      createdAt: user.createdAt.toString(),
      updatedAt: user.updatedAt.toString(),
    };
  }

  private handleError(error: any): never {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    if (error instanceof NotFoundException) {
      throw error;
    }
    this.logger.error('Internal Server Error:', error);
    throw new InternalServerErrorException(error);
  }

  async get(user: User): Promise<UserResponse> {
    try {
      this.logger.info(`USER SERVICE | GET : User with email: ${user.email}`);

      const currentUser = await this.prismaService.user.findUnique({
        where: { email: user.email },
      });

      if (!currentUser) {
        throw new UnauthorizedException('User not found');
      }

      return this.toUserResponse(currentUser);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    user: User,
    request: UpdateUserRequest,
  ): Promise<UserResponse> {
    this.logger.info(
      `USER SERVICE | UPDATE : User ${user.email} trying to update their profile`,
    );

    try {
      const updateRequest: UpdateUserRequest = await this.validationService.validate(
        UserValidation.UPDATE,
        request,
      );

      const existingUser = await this.prismaService.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      const updatedUserData: Partial<User> = await this.updatedUserData(
        updateRequest,
      );

      const updatedUser = await this.prismaService.user.update({
        where: { email: user.email },
        data: updatedUserData,
      });

      return this.toUserResponse(updatedUser);
    } catch (error) {
      this.handleError(error);
    }
  }

  private async updatedUserData(
    updateRequest: UpdateUserRequest
  ): Promise<Partial<User>> {
    const updatedUserData = Object.entries(updateRequest).reduce(
      async (accPromise, [key, value]) => {
        const acc = await accPromise;
        if (!value) return acc;
        acc[key] = key === "password" ? await bcrypt.hash(value, 10) : value;
        return acc;
      },
      Promise.resolve({} as Partial<User>)
    );
    
    return updatedUserData;
  }  
}
