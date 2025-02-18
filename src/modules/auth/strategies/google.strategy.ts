import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import * as dotenv from 'dotenv';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

dotenv.config();

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    console.log(
      `Account Profile: {name: ${profile.displayName}, email: ${profile.emails[0].value}}`,
    );
    const { displayName, emails, photos, provider, id } = profile;

    const user = await this.authService.validate({
      name: displayName,
      email: emails[0].value,
      emailVerified: emails[0].verified,
      image: photos[0].value,
      accessToken,
      refreshToken,
      provider,
      providerAccountId: id,
    });

    console.log(`VALIDATE USER: ${JSON.stringify(user.userId)}`);

    done(null, user);
  }
}
