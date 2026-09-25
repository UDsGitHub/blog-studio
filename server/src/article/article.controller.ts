import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  BrowseArticlesQueryDto,
  BrowseArticlesResponseDto,
} from './dto/browse-articles.dto';
import { Article, ArticleStatus } from '../generated/prisma/client';
import {
  SearchArticlesQueryDto,
  SearchArticlesResponseDto,
} from './dto/search-articles.dto';
import { ArticleEntity } from './article.entity';
import type { AuthenticatedRequest } from '../guard/authenticated-request.interface';
import { AdminOnly } from '../guard/admin-only.decorator';
import { ArticleQueryGuard } from './guard/article-query.guard';
import { ArticleCacheService } from './cache/article-cache.service';
import type { Response } from 'express';

@Controller('articles')
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
    private cacheService: ArticleCacheService,
  ) {}

  @Post()
  @AdminOnly(true)
  async createArticle(
    @Body() createArticleDto: CreateArticleDto,
  ): Promise<Article> {
    if (createArticleDto.status === ArticleStatus.ARCHIVED) {
      throw new BadRequestException(
        'cannot create article with ARCHIVED status',
      );
    }

    const response = await this.articleService.create(createArticleDto);

    await this.cacheService.bumpVersion();

    return response;
  }

  @Get()
  @UseGuards(ArticleQueryGuard)
  @ApiOkResponse({
    type: BrowseArticlesResponseDto,
  })
  async browseArticles(
    @Query() query: BrowseArticlesQueryDto,
  ): Promise<BrowseArticlesResponseDto> {
    const { limit, cursorId, status, startDate, endDate } = query;

    const cacheKey = await this.cacheService.browseKey(
      limit,
      cursorId,
      status,
      startDate,
      endDate,
    );
    const cached =
      await this.cacheService.get<BrowseArticlesResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const articles = await this.articleService.browse(
      limit,
      cursorId,
      status,
      startDate,
      endDate,
    );
    await this.cacheService.set(cacheKey, articles);

    return articles;
  }

  @Get('/search')
  @UseGuards(ArticleQueryGuard)
  @ApiOkResponse({
    type: SearchArticlesResponseDto,
  })
  async searchArticles(
    @Query() query: SearchArticlesQueryDto,
  ): Promise<SearchArticlesResponseDto> {
    const { limit, search, status, startDate, endDate } = query;

    const cacheKey = await this.cacheService.searchKey(
      limit,
      search,
      status,
      startDate,
      endDate,
    );
    const cached =
      await this.cacheService.get<SearchArticlesResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const articles = await this.articleService.search(
      limit,
      search,
      status,
      startDate,
      endDate,
    );
    await this.cacheService.set(cacheKey, articles);

    return articles;
  }

  @Get('id/:id')
  @AdminOnly(true)
  @ApiOkResponse({ type: ArticleEntity })
  async findById(@Param('id') id: string) {
    return this.articleService.findById(id);
  }

  @Get(':slug')
  @ApiOkResponse({ type: ArticleEntity })
  async findBySlug(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @Param('slug') slug: string,
  ) {
    const cacheKey = await this.cacheService.slugKey(slug);
    const cached = await this.cacheService.get<Article>(cacheKey);
    if (cached && cached.status === ArticleStatus.PUBLISHED) {
      response.set(
        'Cache-control',
        'public, max-age=0, s-maxage=60, stale-while-revalidate=30',
      );
      return cached;
    }

    const article = await this.articleService.findBySlug(
      request.isAuthenticated,
      slug,
    );
    if (article?.status === ArticleStatus.PUBLISHED) {
      await this.cacheService.set(cacheKey, article);
    }

    response.set(
      'Cache-control',
      article?.status === ArticleStatus.PUBLISHED
        ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=30'
        : 'private, no-store',
    );
    return article;
  }

  @Patch(':id')
  @AdminOnly(true)
  @ApiOkResponse({ type: ArticleEntity })
  async updateArticle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ): Promise<Article> {
    if (
      (updateArticleDto?.title === undefined ||
        updateArticleDto?.title === null) &&
      (updateArticleDto?.body === undefined ||
        updateArticleDto?.body === null) &&
      (updateArticleDto?.status === undefined ||
        updateArticleDto?.status === null)
    ) {
      throw new BadRequestException(
        'At least one field is required to update the article',
      );
    }

    const response = await this.articleService.update(id, updateArticleDto);

    await this.cacheService.bumpVersion();

    return response;
  }

  @Delete(':id')
  @AdminOnly(true)
  @ApiOkResponse({ type: ArticleEntity })
  async removeArticle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<Article> {
    const response = await this.articleService.remove(id);

    await this.cacheService.bumpVersion();

    return response;
  }
}
