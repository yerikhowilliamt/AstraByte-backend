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
import * as crypto from 'crypto';

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
      const registerRequest: RegisterAuthRequest =
        this.validationService.validate(AuthValidation.REGISTER, request);

      await this.checkExistingUserEmail(registerRequest.email);

      const hashedPassword = await bcrypt.hash(registerRequest.password, 10);
      registerRequest.password = hashedPassword;

      const user = await this.prismaService.user.create({
        data: {
          name: registerRequest.name,
          email: registerRequest.email,
          password: registerRequest.password,
        },
      });

      this.loggerService.info('AUTH', 'service', 'Created user succcess', {
        id: user.id,
        name: user.email
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
        this.loggerService.error('AUTH', 'service', 'An unexpected error occurred during registration', {
          error: error.message,
        });

        throw new InternalServerErrorException(
          'Something went wrong during registration. Please try again.',
        );
      }
    }
  }

  async login(request: LoginAuthRequest): Promise<UserResponse> {
    this.loggerService.info('AUTH', 'service', 'User login attempt', {
      email: request.email
    })

    try {
      const loginRequest: LoginAuthRequest = this.validationService.validate(
        AuthValidation.LOGIN,
        request,
      );

      const user = await this.findUserByEmail(loginRequest.email);

      const isPasswordValid = await bcrypt.compare(
        loginRequest.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      const accessToken = this.generateAccessToken(user.id, user.email, user.role);
      const refreshToken = this.generateRefreshToken(user.id, user.email, user.role);

      const encryptToken = this.encrypt(refreshToken);
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

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
        refreshToken: encryptToken,
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
        });
        throw new InternalServerErrorException(
          'Something went wrong during login. Please try again.',
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

      let account = await this.findAccount({ providerAccountId: validateRequest.providerAccountId, provider: validateRequest.provider});
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
        await this.checkExistingUserEmail(validateRequest.email);
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

      const user = await this.findUserById(account.userId)

      const accessToken = this.generateAccessToken(
        user.id,
        validateRequest.email,
        user.role
      );

      const refreshToken = this.generateRefreshToken(
        user.id,
        validateRequest.email,
        user.role
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
        this.loggerService.error('AUTH', 'service', 'Error during validation account', {
          error: error.message,
        })
        throw new InternalServerErrorException('Something went wrong during validation account. Please try again');
      }
    }
  }

  async generateNewAccessToken(refreshToken: string) {
    this.loggerService.info('AUTH', 'service', 'Generate new access token initiated', {
      refresh_token: refreshToken
    })

    if (!refreshToken) {
      this.loggerService.warn(
        'AUTH',
        'service',
        'Generate new accress token failed - Refresh token is missing',
        {
          refresh_token: refreshToken
        },
      );
      throw new BadRequestException('Refresh token is missing');
    }

    try {
      const decryptToken = this.decrypt(refreshToken);

      const payload = this.jwtService.verify(decryptToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      this.loggerService.warn('AUTH', 'service', 'Payload ID', {
        id: payload.id
      })

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
        decryptToken,
        refreshTokenDB,
      );

      if (!isRefreshTokenMatched) {
        this.loggerService.error('AUTH', 'service', 'Refresh token not match')
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.generateAccessToken(user.id, user.email, user.role);
      
      this.loggerService.debug('AUTH', 'service', 'Generated new access token success', {
        access_token: newAccessToken
      })
      this.loggerService.info('AUTH', 'service', 'Generated new access token success')
      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      this.loggerService.error('AUTH', 'service', 'Error during generate access token', {
        error: error.message
      })

      throw new InternalServerErrorException(
        'Something went wrong during generate access token. Please try again.',
      );
    }
  }

  private async checkExistingUserEmail(email: string): Promise<void> {
    this.loggerService.info('AUTH', 'service', 'Checking existing user email initiated', {
      email
    });

    if (!email) {
      this.loggerService.warn(
        'AUTH',
        'service',
        'Finding an user failed - User email is missing',
        {
          email
        },
      );
      throw new BadRequestException('User email is missing');
    }

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
        error: error.message
      })
      throw new InternalServerErrorException('Something went wrong during checking email. Please try again.');
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    this.loggerService.info('AUTH', 'service', 'Finding user by email initiated', {
      email
    });

    if (!email) {
      this.loggerService.warn(
        'AUTH',
        'service',
        'Finding an user failed - User email is missing',
        {
          email
        },
      );
      throw new BadRequestException('User email is missing');
    }

    try {
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });
  
      if (!user) {
        this.loggerService.warn('AUTH', 'service', 'User not found', {
          email: user.email
        })
        throw new UnauthorizedException('Invalid email or password.');
      }
  
      this.loggerService.info('AUTH', 'service', 'User found by email', {
        id: user.id,
        email: user.email
      })
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.loggerService.error('AUTH', 'service', 'Error finding user by their email', {
        error: error.message
      })
      throw new InternalServerErrorException('Something went wrong during finding user. Please try again.');
    }
    
  }

  async findUserById(id: number): Promise<UserResponse> {
    this.loggerService.info('AUTH', 'service', 'Finding user by id initiated', {
      id
    });

    if (!id) {
      this.loggerService.warn(
        'AUTH',
        'service',
        'Finding an account failed - User ID is missing',
        {
          id
        },
      );
      throw new BadRequestException('User ID is missing');
    }

    try {
      const user = await this.prismaService.user.findUnique({
        where: { id },
      });

      if (!user) {
        this.loggerService.warn('AUTH', 'service', 'User not found', {
          id: user.id
        })
        throw new NotFoundException('User not found.');
      }

      const accessToken = this.generateAccessToken(user.id, user.email, user.role);
      const refreshToken = this.generateRefreshToken(user.id, user.email, user.role);

      const encryptedToken = this.encrypt(refreshToken)
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10)

      await this.prismaService.user.update({
        where: { id: user.id },
        data: {refreshToken: hashedRefreshToken}
      })

      this.loggerService.info('AUTH', 'service', 'User found by id', {
        id: user.id,
      })

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken: encryptedToken,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggerService.error('AUTH', 'service', 'Error finding user by their id', {
        error: error.message
      })
      throw new InternalServerErrorException('Something went wrong during finding user. Please try again.');
    }
  }

  async findAccount(params: {providerAccountId: string, provider: string}): Promise<Account | null> {
    this.loggerService.info('AUTH', 'service', 'Finding existing account initiated', {
      provider_account_id: params.providerAccountId,
      provider: params.provider
    });

    if (!params.provider || !params.providerAccountId) {
      this.loggerService.warn(
        'AUTH',
        'service',
        'Finding an account failed - Account provider or provider account ID is missing',
        {
          provider_account_id: params.providerAccountId,
          provider: params.provider
        },
      );
      throw new BadRequestException('Account provider or provider account ID is missing');
    }

    try {
      const account = await this.prismaService.account.findUnique({
        where: {
          provider_providerAccountId: {
            providerAccountId: params.providerAccountId,
            provider: params.provider
        } },
      });
  
      this.loggerService.info('AUTH', 'service', 'Account found', {
        id: account.id,
        user_id: account.userId
      })
      return account;
    } catch (error) {
      this.loggerService.error(
        error,
        'AUTH',
        'An unexpected error occurred while finding existing account',
        {
          provider_account_id: params.providerAccountId,
          provider: params.provider
        },
      );

      throw new InternalServerErrorException('Something went wrong during finding account. Please try again.')
    }
  }

  private generateAccessToken(userId: number, email: string, role:string): string {
    this.loggerService.info('AUTH', 'service', 'Created access token', {
      user_id: userId,
    })

    if (!userId || !email || !role) {
      this.loggerService.warn(
        'AUTH',
        'service',
        'Generate access token failed - User ID or email or role is missing',
        {
          userId,
          email,
          role
        },
      );
      throw new BadRequestException('User ID or email or role is missing');
    }

    return this.jwtService.sign(
      { id: userId, email, role },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );
  }

  private generateRefreshToken(userId: number, email: string, role: string): string {
    this.loggerService.info('AUTH', 'service', 'Created refresh token', {
      user_id: userId,
    })

    if (!userId || !email || !role) {
      this.loggerService.warn(
        'AUTH',
        'service',
        'Generate refresh token failed - User ID or email or role is missing',
        {
          userId,
          email,
          role
        },
      );
      throw new BadRequestException('User ID or email or role is missing');
    }

    return this.jwtService.sign(
      { id: userId, email, role },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      },
    );
  }

  private encrypt(token: string): string {
    const algorithm = this.configService.get('CRYPTO_ALGORITHM');
    const secretKey = this.configService.get('CRYPTO_SECRET_KEY');
    const iv = this.configService.get('INITIAL_VECTOR');

    if (!token) {
      this.loggerService.warn(
        'AUTH',
        'service',
        'Encrypt token failed - Token is missing',
        {
          token
        },
      );
      throw new BadRequestException('Please insert a token');
    }

    const cipher = crypto.createCipheriv(
      algorithm,
      Buffer.from(secretKey, 'hex'),
      Buffer.from(iv, 'hex')
    );
    let encrypted = cipher.update(token, 'utf-8', 'hex');

    encrypted += cipher.final('hex');
    return `${iv}:${encrypted}`;
  }

  private decrypt(encryptedToken: string): string {
    const algorithm = this.configService.get<string>('CRYPTO_ALGORITHM');
    const secretKey = this.configService.get('CRYPTO_SECRET_KEY');

    if (!encryptedToken) {
      this.loggerService.warn(
        'AUTH',
        'service',
        'Decrypt token failed - Token is missing',
        {
          encryptedToken
        },
      );
      throw new BadRequestException('Please insert phone number');
    }

    const [ivHex, encrypted] = encryptedToken.split(':');
    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(secretKey, 'hex'),
      Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');

    decrypted += decipher.final('utf-8');
    return decrypted;
  }
}
