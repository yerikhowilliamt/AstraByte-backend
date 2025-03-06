import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    private handleErrorService: handleErrorService,
  ) {}

  async get(user: User): Promise<UserResponse> {
    this.loggerService.info('USER', 'service', 'Fetching user data initiated', {
      user_id: user.id,
    });

    try {
      const currentUser = await this.checkExistingUser(user.email);

      this.loggerService.info('USER', 'service', 'Fetching user data success', {
        user_id: currentUser.id,
      });

      return this.toUserResponse(currentUser);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'USER',
        'An unexpected error occurred during fetching user data',
      );
    }
  }

  async update(user: User, request: UpdateUserRequest): Promise<UserResponse> {
    this.loggerService.info('USER', 'service', 'Updating user data initiated', {
      user_id: user.id,
    });

    try {
      const updateRequest: UpdateUserRequest = this.validationService.validate(
        UserValidation.UPDATE,
        request,
      );

      const existingUser = await this.checkExistingUser(user.email);

      const updatedUserData: Partial<User> =
        await this.updatedUserData(updateRequest);

      const updatedUser = await this.prismaService.user.update({
        where: { email: existingUser.email },
        data: updatedUserData,
      });

      this.loggerService.info('USER', 'service', 'Updating user data success', {
        id: existingUser.id,
        email: existingUser.email,
      });

      return this.toUserResponse(updatedUser);
    } catch (error) {
      this.handleErrorService.service(
        error,
        'USER',
        'An unexpected error occurred during updating user data',
        {
          user_id: user.id,
          email: user.email,
        },
      );
    }
  }

  async logout(user: User): Promise<{ message: string; success: boolean }> {
    this.loggerService.info('USER', 'service', 'User logout initiated', {
      user_id: user.id,
    });
    try {
      const existingUser = await this.checkExistingUser(user.email);

      await this.prismaService.user.update({
        where: { email: existingUser.email },
        data: { refreshToken: null },
      });

      this.loggerService.info('USER', 'service', 'Logged out success');

      return {
        message: 'Log out successful',
        success: true,
      };
    } catch (error) {
      this.handleErrorService.service(
        error,
        'USER',
        'An unexpected error occurred during logout',
        {
          user_id: user.id,
        },
      );
    }
  }

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

  async checkExistingUser(email: string): Promise<User> {
    this.loggerService.info(
      'USER',
      'service',
      'Checking user existence initiated',
      { email },
    );

    if (!email) {
      this.loggerService.warn(
        'USER',
        'service',
        'Checking for existing user failed - User email is missing',
        {
          email,
        },
      );
      throw new BadRequestException('Please insert User email');
    }

    try {
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!user) {
        this.loggerService.info(
          'USER',
          'service',
          'Checking for existing user failed - User not found',
          {
            email,
          },
        );

        throw new NotFoundException('User not found');
      }

      if (user.email !== email) {
        this.loggerService.warn(
          'USER',
          'service',
          'Checking for existing user failed - User email not matched',
          {
            id: user.id,
            email: user.email,
            params_user_email: email,
          },
        );
        throw new ForbiddenException(
          'You do not have permission to access this user',
        );
      }

      this.loggerService.info('USER', 'service', 'User existence verified', {
        id: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      this.handleErrorService.service(
        error,
        'USER',
        'An unexpected error occurred while checking existing user',
        {
          email,
        },
      );
    }
  }

  private async updatedUserData(
    updateRequest: UpdateUserRequest,
  ): Promise<Partial<User>> {
    const updatedUserData = Object.entries(updateRequest).reduce(
      async (accPromise, [key, value]) => {
        const acc = await accPromise;
        if (!value) return acc;
        acc[key] = key === 'password' ? await bcrypt.hash(value, 10) : value;
        return acc;
      },
      Promise.resolve({} as Partial<User>),
    );

    return updatedUserData;
  }
}
