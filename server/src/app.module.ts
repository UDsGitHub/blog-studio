import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ArticleModule } from './article/article.module';
import { PrismaService } from './prisma.service';
import { HealthModule } from './health/health.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guard/auth.guard';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: ['.env.test', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: configService.get<number>('THROTTLE_TTL') ?? 60_000,
            limit: configService.get<number>('THROTTLE_SHORT') ?? 80,
          },
          {
            name: 'long',
            ttl: configService.get<number>('THROTTLE_TTL') ?? 60_000,
            limit: configService.get<number>('THROTTLE_LONG') ?? 10,
          },
        ],
      }),
    }),
    ArticleModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    PrismaService,
  ],
})
export class AppModule {}
