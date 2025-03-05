import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { User } from '@prisma/client';
import { UserResponse } from '../../models/user.model';
import { UpdateUserRequest } from './dto/update-user.dto';
import { UserValidation } from './user.validation';
import { LoggerService } from '../../common/logger.service';
import { handleErrorService } from '../../common/handle-error.service';

@Injectable()
export class UserService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private handleErrorService: handleErrorService
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

  async get(user: User): Promise<UserResponse> {
    try {
      this.loggerService.info('AUTH', 'service', 'Fetching user data initiated', {
        user_id: user.id
      });

      const currentUser = await this.prismaService.user.findUnique({
        where: { email: user.email },
      });

      if (!currentUser) {
        throw new UnauthorizedException('User not found');
      }

      this.loggerService.info('AUTH', 'service', 'Fetching user data success', {
        user_id: user.id
      });

      return this.toUserResponse(currentUser);
    } catch (error) {
      this.handleErrorService.service(error, 'USER', 'An unexpected error occurred during fetching user data');
    }
  }

  async update(
    user: User,
    request: UpdateUserRequest,
  ): Promise<UserResponse> {
    this.loggerService.info('AUTH', 'service', 'Updating user data initiated', {
      user_id: user.id
    });
    this.loggerService.debug('AUTH', 'service', 'Updating user data initiated', {
      user_id: user.id,
      request: JSON.stringify(request)
    });

    try {
      const updateRequest: UpdateUserRequest = this.validationService.validate(
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

      this.loggerService.info('AUTH', 'service', 'Updating user data success', {
        user_id: user.id
      });

      return this.toUserResponse(updatedUser);
    } catch (error) {
      this.handleErrorService.service(error, 'USER', 'An unexpected error occurred during updating user data', {
        user_id: user.id
      });
    }
  }

  async logout(user: User): Promise<{ message: string; success: boolean }> {
    this.loggerService.info('AUTH', 'service', 'User logout initiated', {
      user_id: user.id
    });
    try {
      await this.prismaService.user.update({
        where: { email: user.email },
        data: { refreshToken: null },
      });

      this.loggerService.info('AUTH', 'service', 'Logged out success');

      return {
        message: 'Log out successful',
        success: true,
      };
    } catch (error) {
      this.handleErrorService.service(error, 'USER', 'An unexpected error occurred during logout', {
        user_id: user.id
      });
    }
  }

  async checkExistingUser(email: string): Promise<User> {
    this.loggerService.info(
      'USER',
      'service',
      'Checking user existence initiated',
      {email}
    );

    try {
      const user = await this.prismaService.user.findUnique({
        where: {email}
      })

      if (!user) {
        this.loggerService.info('USER', 'service', 'Checking for existing user failed - User not found', {
          email
        })

        throw new NotFoundException('User not found')
      }

      this.loggerService.info('USER', 'service', 'User existence verified', {
        id: user.id,
      });

      return user
    } catch (error) {
      this.handleErrorService.service(
        error,
        'USER',
        'An unexpected error occurred while checking existing user',
        {
          email
        },
      );
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
