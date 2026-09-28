import { Module } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { PrismaService } from '../prisma.service';
import { ArticleQueryGuard } from './guard/article-query.guard';
import { ArticleCacheService } from './cache/article-cache.service';
import { RedisService } from '../redis.service';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [WebhookModule],
  controllers: [ArticleController],
  providers: [
    ArticleService,
    PrismaService,
    ArticleQueryGuard,
    ArticleCacheService,
    RedisService,
  ],
})
export class ArticleModule {}
