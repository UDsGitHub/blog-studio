import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PrismaService } from '../prisma.service';
import slug from 'slug';
import { ArticleStatus } from '../generated/prisma/enums';
import { BrowseArticlesResponseDto } from './dto/browse-articles.dto';
import { Prisma } from '../generated/prisma/client';
import { ArticlePreview, ArticleSearchPreview } from './article.types';
import removeMd from 'remove-markdown';
import { SearchArticlesResponseDto } from './dto/search-articles.dto';
import { WebhookService } from '../webhook/webhook.service';
import { WebhookEvent } from '../webhook/webhook.types';

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {}

  async create(createArticleDto: CreateArticleDto) {
    const { title, body, excerpt, status } = createArticleDto;

    const titleSlug = await this.getSlug(title);
    const createData = { title, body, slug: titleSlug, excerpt, status };
    if (status === ArticleStatus.PUBLISHED) {
      createData['publishedAt'] = new Date();
    }

    const createdArticle = await this.prisma.article.create({
      data: createData,
    });

    if (createdArticle.status === ArticleStatus.PUBLISHED) {
      void this.webhookService
        .notify({
          event: 'published',
          id: createdArticle.id,
          slug: createdArticle.slug,
          timestamp: new Date().toISOString(),
        })
        .catch((error) =>
          this.logWebhookException(error, 'published', createdArticle.id),
        );
    }

    return createdArticle;
  }

  async browse(
    limit: number,
    cursorId?: string,
    status?: ArticleStatus,
    startDate?: Date,
    endDate?: Date,
  ): Promise<BrowseArticlesResponseDto> {
    return this.browseArticles(limit, cursorId, status, startDate, endDate);
  }

  async search(
    limit: number,
    search: string,
    status?: ArticleStatus,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SearchArticlesResponseDto> {
    return this.searchArticles(limit, search, status, startDate, endDate);
  }

  async findBySlug(isAuthenticated: boolean, slug: string) {
    let article = await this.prisma.article.findUnique({
      where: {
        slug,
      },
    });

    // fallback to slug history
    if (!article) {
      const slugHistoryRecord = await this.prisma.articleSlugHistory.findUnique(
        {
          where: {
            slug,
          },
          select: {
            articleId: true,
          },
        },
      );

      if (!slugHistoryRecord?.articleId) {
        throw new NotFoundException(`Article with slug: ${slug} not found`);
      }

      article = await this.findById(slugHistoryRecord.articleId);
    }

    if (
      !isAuthenticated &&
      (article.status === ArticleStatus.DRAFT ||
        article.status === ArticleStatus.ARCHIVED)
    ) {
      throw new NotFoundException();
    }

    return article;
  }

  async findById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: {
        id,
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with id: ${id} not found`);
    }

    return article;
  }

  async update(id: string, updateArticleDto: UpdateArticleDto) {
    const updateData = { ...updateArticleDto };

    const article = await this.findById(id);

    const draftToArchived =
      updateData?.status === ArticleStatus.ARCHIVED &&
      article.status === ArticleStatus.DRAFT;

    if (
      updateData?.status === ArticleStatus.PUBLISHED &&
      !article.publishedAt
    ) {
      updateData['publishedAt'] = new Date();
    }

    if (draftToArchived) {
      throw new BadRequestException(
        'Cannot archive an article that has never been published',
      );
    }

    updateData['updatedAt'] = new Date();
    if (updateArticleDto.title) {
      const updatedSlug = await this.getSlug(updateArticleDto.title, id);
      updateData['slug'] = updatedSlug;
      if (article?.publishedAt) {
        await this.prisma.articleSlugHistory.create({
          data: { articleId: article.id, slug: article.slug },
        });
      }
    }

    const updatedArticle = await this.prisma.article.update({
      data: updateData,
      where: { id },
    });

    const wasPublished = article.status === ArticleStatus.PUBLISHED;
    const isPublished = updatedArticle.status === ArticleStatus.PUBLISHED;
    const previousSlug =
      article.slug !== updatedArticle.slug ? article.slug : undefined;

    if (!wasPublished && isPublished) {
      void this.webhookService
        .notify({
          event: 'published',
          id: updatedArticle.id,
          slug: updatedArticle.slug,
          timestamp: new Date().toISOString(),
        })
        .catch((error) =>
          this.logWebhookException(error, 'published', updatedArticle.id),
        );
    } else if (wasPublished && !isPublished) {
      void this.webhookService
        .notify({
          event: 'unpublished',
          id: updatedArticle.id,
          slug: updatedArticle.slug,
          timestamp: new Date().toISOString(),
        })
        .catch((error) =>
          this.logWebhookException(error, 'unpublished', updatedArticle.id),
        );
    } else if (isPublished) {
      void this.webhookService
        .notify({
          event: 'updated',
          id: updatedArticle.id,
          slug: updatedArticle.slug,
          previousSlug,
          timestamp: new Date().toISOString(),
        })
        .catch((error) =>
          this.logWebhookException(error, 'updated', updatedArticle.id),
        );
    }

    return updatedArticle;
  }

  async remove(id: string) {
    const article = await this.findById(id);

    const deletedArticle = await this.prisma.article.delete({ where: { id } });

    if (article.status === ArticleStatus.PUBLISHED) {
      void this.webhookService
        .notify({
          event: 'deleted',
          id: article.id,
          slug: article.slug,
          timestamp: new Date().toISOString(),
        })
        .catch((error) =>
          this.logWebhookException(error, 'deleted', article.id),
        );
    }

    return deletedArticle;
  }

  private async getSlug(
    inputString: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = slug(inputString);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (true) {
      const count = await this.prisma.article.count({
        where: {
          slug: uniqueSlug,
          ...(excludeId
            ? {
                id: {
                  not: excludeId,
                },
              }
            : {}),
        },
      });

      if (count === 0) {
        break;
      }

      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  private async browseArticles(
    limit: number,
    cursorId?: string,
    status?: ArticleStatus,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.ArticleWhereInput = {};
    const dateCol = this.getFilterDateColumn(status);

    if (status) {
      where.status = status;
    }

    if (dateCol && (startDate || endDate)) {
      where[dateCol] = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    const orderBy: Prisma.ArticleOrderByWithRelationInput[] =
      dateCol === 'publishedAt'
        ? [{ publishedAt: 'desc' as const }, { id: 'desc' as const }]
        : [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

    const query: Prisma.ArticleFindManyArgs = {
      where,
      orderBy,
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    };

    const results = (
      await this.prisma.article.findMany(query)
    ).map<ArticlePreview>((article) => {
      const { body, excerpt, ...rest } = article;
      const finalExcerpt = excerpt?.trim() || this.getExcerpt(body);
      return { ...rest, excerpt: finalExcerpt };
    });
    return {
      data: results.slice(0, limit),
      hasMore: results.length > limit,
    };
  }

  private async searchArticles(
    limit: number,
    search: string,
    status?: ArticleStatus,
    startDate?: Date,
    endDate?: Date,
  ) {
    const filters: Prisma.Sql[] = [Prisma.sql`a.search_vector @@ q`];

    if (status) {
      filters.push(Prisma.sql`a.status = ${status}::"ArticleStatus"`);
    }

    const dateCol = this.getFilterDateColumn(status);
    if (dateCol === 'publishedAt') {
      if (startDate) {
        filters.push(Prisma.sql`a.published_at >= ${startDate}`);
      }
      if (endDate) {
        filters.push(Prisma.sql`a.published_at <= ${endDate}`);
      }
    } else if (dateCol === 'createdAt') {
      if (startDate) {
        filters.push(Prisma.sql`a.created_at >= ${startDate}`);
      }
      if (endDate) {
        filters.push(Prisma.sql`a.created_at <= ${endDate}`);
      }
    }

    const results = await this.prisma.$queryRaw<ArticleSearchPreview[]>`
        select 
          a.id, 
          a.title, 
          a.slug,  
          a.status, 
          a.created_at as "createdAt", 
          a.updated_at as "updatedAt",
          ts_headline('english', a.body, q) as headline
        from 
          article a, 
          plainto_tsquery('english', ${search}) as q 
        where 
          ${Prisma.join(filters, ' and ')} 
          order by 
            ts_rank(a.search_vector, q) desc, 
            a.published_at desc, 
            a.created_at desc, 
            a.id desc 
          limit ${limit};`;

    return {
      data: results,
    };
  }

  private getFilterDateColumn(
    status?: ArticleStatus,
  ): 'publishedAt' | 'createdAt' | null {
    if (!status) return null;
    if (status === ArticleStatus.DRAFT) return 'createdAt';
    return 'publishedAt';
  }

  private getExcerpt(body: string, max = 160): string {
    const plain = removeMd(body, { useImgAltText: false })
      .replace(/\s+/g, ' ')
      .trim();

    if (plain.length <= max) return plain;

    const sliced = plain.slice(0, max);
    const lastSpace = sliced.lastIndexOf(' ');
    const trimSliced = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced;
    return `${trimSliced.trimEnd()}...`;
  }

  private logWebhookException(
    error: any,
    event: WebhookEvent,
    articleId: string,
  ) {
    this.logger.warn(
      `Unexpected error notifying webhook clients (${event}, ${articleId})`,
      error,
    );
  }
}
