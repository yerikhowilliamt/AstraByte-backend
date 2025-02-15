import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UserService } from './user.service';
import WebResponse, { Paging } from '../../models/web.model';
import { Auth } from '../../common/auth/auth.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { User } from '@prisma/client';
import { UserResponse } from '../../models/user.model';
import { UpdateUserRequest } from './dto/update-user.dto';

@Controller('users/current')
export class UserController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private userService: UserService,
  ) {}

  private toUserResponse<T>(data: T, statusCode: number, paging?: Paging): WebResponse<T> {
    return { data, statusCode, timestamp: new Date().toISOString(), ...(paging && { paging }) };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async get(@Auth() user: User): Promise<WebResponse<UserResponse>> {
    this.logger.info(`USER CONTROLLER | GET user: ${user.email}`);
    return this.toUserResponse(await this.userService.get(user), 200);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async update(@Auth() user: User, @Body() request: UpdateUserRequest): Promise<WebResponse<UserResponse>> {
    this.logger.info(`USER CONTROLLER | UPDATE user: ${user.email}, request: ${JSON.stringify(request)}`);

    const result = await this.userService.update(user, request);
    return this.toUserResponse(result, 200);
  }
}
