import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { UserResponse } from '../../models/user.model';
import { Logger } from 'winston';
import { RegisterAuthRequest } from './dto/register-auth.dto';
import { AuthValidation } from './auth.validation';
import { ZodError } from 'zod';
import { LoginAuthRequest } from './dto/login-auth.dto';
import { Account, User } from '@prisma/client';
import { ValidateAuthRequest } from './dto/validate-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async checkExistingUser(email: string) {
    try {
      const user = await this.prismaService.user.count({
        where: { email },
      });

      if (user) {
        this.logger.warn('Email already registered');
        throw new BadRequestException('This email is already registered.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error checking if email exists', { error });
      throw new InternalServerErrorException(error);
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return user;
  }

  async findUserById(id: number): Promise<UserResponse> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('User not found.');
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(error);
    }
  }

  async findAccount(providerAccountId: string): Promise<Account | null> {
    const account = await this.prismaService.account.findUnique({
      where: { providerAccountId },
    });

    return account;
  }

  private generateAccessToken(userId: number, email: string): string {
    return this.jwtService.sign(
      { id: userId, email },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );
  }

  private generateRefreshToken(userId: number, email: string): string {
    return this.jwtService.sign(
      { id: userId, email },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '30d'
      },
    );
  }

  async register(request: RegisterAuthRequest): Promise<UserResponse> {
    this.logger.info(
      `AUTH SERVICE | REGISTER : Create new user: { name: ${request.name}, email: ${request.email} }`,
    );
    try {
      // Validate request
      const registerRequest: RegisterAuthRequest =
        await this.validationService.validate(AuthValidation.REGISTER, request);

      await this.checkExistingUser(registerRequest.email);

      // Hashing password
      const hashedPassword = await bcrypt.hash(registerRequest.password, 10);
      registerRequest.password = hashedPassword;

      // Create new user
      const user = await this.prismaService.user.create({
        data: {
          name: registerRequest.name,
          email: registerRequest.email,
          password: registerRequest.password,
        },
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
        this.logger.error('Error during registration', { error });
        throw new InternalServerErrorException(
          'Registration failed. Please try again.',
        );
      }
    }
  }

  async login(request: LoginAuthRequest): Promise<UserResponse> {
    this.logger.info(
      `AUTH SERVICE | LOGIN : { User login attempt: ${request.email} }`,
    );

    try {
      const loginRequest: LoginAuthRequest =
        await this.validationService.validate(AuthValidation.LOGIN, request);

      const user = await this.findUserByEmail(loginRequest.email);

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

      await this.prismaService.user.update({
        where: { email: user.email },
        data: { refreshToken: hashedRefreshToken },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        accessToken,
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
        this.logger.error('Error during login', { error });
        throw new InternalServerErrorException(
          'Login failed. Please try again.',
        );
      }
    }
  }

  async validate(request: ValidateAuthRequest): Promise<Account | null> {
    this.logger.info(`AUTH SERVICE | Validate request: ${request}`);
    try {
      const validateRequest: ValidateAuthRequest =
        await this.validationService.validate(
          AuthValidation.VALIDATEUSER,
          request,
        );

      this.logger.debug(`Validated request: ${validateRequest}`);

      let account = await this.findAccount(validateRequest.providerAccountId);
      this.logger.debug(`Found account: ${account}`);

      if (!account) {
        await this.checkExistingUser(validateRequest.email);
        this.logger.debug(`Creating new account for user`);

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

        this.logger.debug(`New account created: ${account}`);
      }

      const accessToken = await this.generateAccessToken(account.userId, validateRequest.email);
      const refreshToken = await this.generateRefreshToken(account.userId, validateRequest.email);

      this.logger.debug(
        `Generate tokens: access_token: ${accessToken}, refresh_token: ${refreshToken}`,
      );

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

      await this.prismaService.user.update({
        where: { id: account.userId },
        data: { refreshToken: hashedRefreshToken },
      });

      this.logger.debug('Updated user with tokens');

      return account;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.message);
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        this.logger.error('Error during validation', { error });
        throw new InternalServerErrorException('Validation failed');
      }
    }
  }

  async generateNewAccessToken(userId: number, refreshToken: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: {id: userId}
      });

      if (user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const newAccessToken = this.generateAccessToken(user.id, user.email)
      
      return {
        accessToken: newAccessToken
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      this.logger.error('Error during generate access token', { error });
      throw new InternalServerErrorException('Generate access token failed. Please try again.')
    }
  }
}
