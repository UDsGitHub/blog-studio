import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '../redis.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  pingCheck(key: string, redisClient: RedisService) {
    return this.healthIndicatorService
      .check(key)
      .attempt(() => void redisClient.ping());
  }
}
