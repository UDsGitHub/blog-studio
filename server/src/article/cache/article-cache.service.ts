import { Injectable, Logger } from '@nestjs/common';
import { ArticleStatus } from '../../generated/prisma/client';
import { RedisService } from '../../redis.service';

@Injectable()
export class ArticleCacheService {
  private readonly versionKey = 'articles:version';
  private readonly TTL = 60;
  private readonly logger = new Logger(ArticleCacheService.name);

  constructor(private readonly redis: RedisService) {}

  private async getVersion() {
    try {
      return Number((await this.redis.get(this.versionKey)) ?? 0);
    } catch (error) {
      this.logger.error(error);
    }

    return 0;
  }

  async bumpVersion() {
    try {
      await this.redis.incr(this.versionKey);
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async getVersionPrefix() {
    const version = await this.getVersion();
    return `articles:v${version}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return JSON.parse((await this.redis.get(key)) ?? 'null') as T | null;
    } catch (error) {
      this.logger.error(error);
    }
    return null;
  }

  /**
   * @param key - cache key
   * @param value - cache value of type T
   * @param ttl - cache entry TTL in seconds
   */
  async set<T>(key: string, value: T, ttl?: number) {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl ?? this.TTL);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async browseKey(
    limit: number,
    cursorId?: string,
    status?: ArticleStatus,
    startDate?: Date,
    endDate?: Date,
  ) {
    const versionPrefix = await this.getVersionPrefix();
    return `${versionPrefix}:browse:${limit}:${cursorId}:${status}:${startDate?.getTime()}:${endDate?.getTime()}`;
  }

  async searchKey(
    limit: number,
    search: string,
    status?: ArticleStatus,
    startDate?: Date,
    endDate?: Date,
  ) {
    const versionPrefix = await this.getVersionPrefix();
    return `${versionPrefix}:search:${limit}:${search}:${status}:${startDate?.getTime()}:${endDate?.getTime()}`;
  }

  async slugKey(slug: string) {
    const versionPrefix = await this.getVersionPrefix();
    return `${versionPrefix}:slug:${slug}`;
  }
}
