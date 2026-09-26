import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(configService: ConfigService) {
    super(configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1_000,
      commandTimeout: 1_500,
      retryStrategy: (times: number) => Math.min(times * 200, 2_000),
    });

    this.on('error', (error: Error) => {
      this.logger.error(error.message);
    });
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
