import { Module } from '@nestjs/common';
import { PrismaHealthIndicator, TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma.service';
import { RedisHealthIndicator } from './redis.health';
import { RedisService } from '../redis.service';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    PrismaService,
    PrismaHealthIndicator,
    RedisService,
    RedisHealthIndicator,
  ],
})
export class HealthModule {}
