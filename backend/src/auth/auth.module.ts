import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '../config/config.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    UsersModule,
    PassportModule, // Registers default strategy
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.JWT_SECRET,
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, ConfigService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
