import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { UserResponse } from '../../models/user.model';
import { RegisterAuthRequest } from './dto/register-auth.dto';
import { AuthValidation } from './auth.validation';
import { ZodError } from 'zod';
import { LoginAuthRequest } from './dto/login-auth.dto';
import { Account, User } from '@prisma/client';
import { ValidateAuthRequest } from './dto/validate-auth.dto';
import { LoggerService } from '../../common/logger.service';

@Injectable()
export class AuthService {
  constructor(
    private loggerService: LoggerService,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(request: RegisterAuthRequest): Promise<UserResponse> {
    this.loggerService.info('AUTH', 'service', 'Create user initiated')

    try {
      // Validasi request
      const registerRequest: RegisterAuthRequest =
        this.validationService.validate(AuthValidation.REGISTER, request);

      await this.checkExistingUser(registerRequest.email);

      // Hashing password
      const hashedPassword = await bcrypt.hash(registerRequest.password, 10);
      registerRequest.password = hashedPassword;

      // Buat user baru
      const user = await this.prismaService.user.create({
        data: {
          name: registerRequest.name,
          email: registerRequest.email,
          password: registerRequest.password,
        },
      });

      this.loggerService.info('AUTH', 'service', 'Created user succcess', {
        user_id: user.id,
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image || null,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.message);
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        this.loggerService.error('AUTH', 'service', 'Error during registration', {
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });

        throw new InternalServerErrorException(
          'Registration failed. Please try again.',
        );
      }
    }
  }

  async login(request: LoginAuthRequest): Promise<UserResponse> {
    this.loggerService.info('AUTH', 'service', 'User login attempt')

    try {
      // Validasi request
      const loginRequest: LoginAuthRequest = this.validationService.validate(
        AuthValidation.LOGIN,
        request,
      );

      const user = await this.findUserByEmail(loginRequest.email);

      // Compare password
      const isPasswordValid = await bcrypt.compare(
        loginRequest.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      const accessToken = this.generateAccessToken(user.id, user.email);
      const refreshToken = this.generateRefreshToken(user.id, user.email);

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

      // Menyimpan refresh token yang sudah di hash di database
      await this.prismaService.user.update({
        where: { email: user.email },
        data: { refreshToken: hashedRefreshToken },
      });

      this.loggerService.info('AUTH', 'service', 'User logged in success', {
        user_id: user.id
      })

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        accessToken,
        refreshToken,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.message);
      } else if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      } else {
        this.loggerService.error('AUTH', 'service', 'Error during login', {
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
        throw new InternalServerErrorException(
          'Login failed. Please try again.',
        );
      }
    }
  }

  async validate(request: ValidateAuthRequest): Promise<Account | null> {
    this.loggerService.info('AUTH', 'service', 'Validate request initiated', {
      provider_account_id: request.providerAccountId,
      provider: request.provider,
      name: request.name,
    })

    try {
      const validateRequest: ValidateAuthRequest =
        this.validationService.validate(
          AuthValidation.VALIDATEUSER,
          request,
        );

      let account = await this.findAccount(validateRequest.providerAccountId);
      this.loggerService.debug('AUTH', 'service', 'Account found', {
        id: account.id,
        user_id: account.userId,
        provider_account_id: account.providerAccountId,
        provider: account.provider,
        refresh_token: account.refreshToken
      })

      this.loggerService.warn('AUTH', 'service', 'Account founded', {
        id: account.id,
        provider_account_id: account.providerAccountId,
        provider: account.provider
      })

      if (!account) {
        await this.checkExistingUser(validateRequest.email);
        this.loggerService.info('AUTH', 'service', 'Creating new account for user')

        account = await this.prismaService.account.create({
          data: {
            user: {
              create: {
                email: validateRequest.email,
                name: validateRequest.name,
                image: validateRequest.image,
              },
            },
            refreshToken: validateRequest.refreshToken,
            provider: validateRequest.provider,
            providerAccountId: validateRequest.providerAccountId,
          },
        });

        this.loggerService.debug('AUTH', 'service', 'Created new account success', {
          id: account.id,
          user_id: account.userId,
          provider_account_id: account.providerAccountId,
          provider: account.provider,
          refresh_token: account.refreshToken,
        })

        this.loggerService.info('AUTH', 'service', 'Created new account success', {
          id: account.id,
          user_id: account.userId,
          provider_account_id: account.providerAccountId,
          provider: account.provider,
        })
      }

      const accessToken = this.generateAccessToken(
        account.userId,
        validateRequest.email,
      );

      const refreshToken = this.generateRefreshToken(
        account.userId,
        validateRequest.email,
      );

      this.loggerService.debug('AUTH', 'service', 'Generate access token & refresh token', {
        access_token: accessToken,
        refresh_token: refreshToken
      })

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

      await this.prismaService.user.update({
        where: { id: account.userId },
        data: { refreshToken: hashedRefreshToken },
      });

      this.loggerService.info('AUTH', 'service', 'Updated user with tokens success')

      return account;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.message);
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        this.loggerService.error('AUTH', 'service', 'Error during validation', {
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        })
        throw new InternalServerErrorException('Validation failed. Please try again');
      }
    }
  }

  async generateNewAccessToken(refreshToken: string) {
    this.loggerService.debug('AUTH', 'service', 'Generate new access token initiated', {
      refresh_token: refreshToken
    })

    this.loggerService.info('AUTH', 'service', 'Generate new access token initiated')

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prismaService.user.findUnique({
        where: {
          id: payload.id,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.refreshToken) {
        throw new UnauthorizedException('Refresh token not found');
      }

      const refreshTokenDB = user.refreshToken;

      const isRefreshTokenMatched = await bcrypt.compare(
        refreshToken,
        refreshTokenDB,
      );

      if (!isRefreshTokenMatched) {
        this.loggerService.error('AUTH', 'service', 'Refresh token not match')
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.generateAccessToken(user.id, user.email);
      
      this.loggerService.debug('AUTH', 'service', 'Generated new access token success', {
        access_token: newAccessToken
      })
      this.loggerService.info('AUTH', 'service', 'Generated new access token success')
      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.loggerService.error('AUTH', 'service', 'Error during generate access token', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      })

      throw new InternalServerErrorException(
        'Generate access token failed. Please try again.',
      );
    }
  }

  private async checkExistingUser(email: string) {
    try {
      const user = await this.prismaService.user.count({
        where: { email },
      });

      if (user) {
        this.loggerService.error('AUTH', 'service', 'Email already registered')
        throw new BadRequestException('This email is already registered.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.loggerService.error('AUTH', 'service', 'Error checking if email exists', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      })
      throw new InternalServerErrorException(error);
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.loggerService.error('AUTH', 'service', 'User not found')
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.loggerService.info('AUTH', 'service', 'User found by email')
    return user;
  }

  async findUserById(id: number): Promise<UserResponse> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id },
      });

      if (!user) {
        this.loggerService.error('AUTH', 'service', 'User not found')
        throw new NotFoundException('User not found.');
      }

      const accessToken = this.generateAccessToken(user.id, user.email);

      this.loggerService.info('AUTH', 'service', 'User found by id', {
        id: user.id,
      })

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessToken,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggerService.error('AUTH', 'service', 'Error finding user by their id', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      })
      throw new InternalServerErrorException(error);
    }
  }

  async findAccount(providerAccountId: string): Promise<Account | null> {
    const account = await this.prismaService.account.findUnique({
      where: { providerAccountId },
    });

    this.loggerService.info('AUTH', 'service', 'Account found', {
      id: account.id,
      user_id: account.userId
    })
    return account;
  }

  private generateAccessToken(userId: number, email: string): string {
    this.loggerService.info('AUTH', 'service', 'Successfully created access token. Details: ', {
      user_id: userId,
    })

    return this.jwtService.sign(
      { id: userId, email },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );
  }

  private generateRefreshToken(userId: number, email: string): string {
    this.loggerService.info('AUTH', 'service', 'Successfully created refresh token. Details: ', {
      user_id: userId,
    })

    return this.jwtService.sign(
      { id: userId, email },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      },
    );
  }
}
