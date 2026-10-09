jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { ArticleStatus } from '../generated/prisma/client';
import { BadRequestException } from '@nestjs/common';
import { AuthenticatedRequest } from '../guard/authenticated-request.interface';
import { ArticleCacheService } from './cache/article-cache.service';
import type { Response } from 'express';

const authedReq = { isAuthenticated: true } as AuthenticatedRequest;
const anonReq = { isAuthenticated: false } as AuthenticatedRequest;

describe('ArticleController', () => {
  let controller: ArticleController;
  const articleService = {
    create: jest.fn(),
    browse: jest.fn(),
    search: jest.fn(),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const cacheService = {
    bumpVersion: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    browseKey: jest.fn(),
    searchKey: jest.fn(),
    slugKey: jest.fn(),
  };
  const response = { set: jest.fn() } as unknown as Response;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [
        {
          provide: ArticleService,
          useValue: articleService,
        },
        {
          provide: ArticleCacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    controller = module.get<ArticleController>(ArticleController);
  });

  describe('default flow', () => {
    it('calls app.service.create()', async () => {
      const requestData = {
        title: 'title',
        body: 'body',
        status: ArticleStatus.DRAFT,
      };
      await controller.createArticle(requestData);
      expect(articleService.create).toHaveBeenCalledWith(requestData);
      expect(cacheService.bumpVersion).toHaveBeenCalled();
    });

    it('calls app.service.browse()', async () => {
      const expectedKey =
        'articles:v1:browse:25:undefined:DRAFT:undefined:undefined';

      cacheService.browseKey.mockResolvedValue(expectedKey);

      const response = await controller.browseArticles({
        limit: 25,
        status: ArticleStatus.DRAFT,
      });

      expect(cacheService.browseKey).toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(articleService.browse).toHaveBeenCalledWith(
        25,
        undefined,
        ArticleStatus.DRAFT,
        undefined,
        undefined,
      );
      expect(cacheService.set).toHaveBeenCalledWith(expectedKey, response);
    });

    it('calls app.service.search()', async () => {
      const expectedKey =
        'articles:v1:search:25:search:PUBLISHED:undefined:undefined';
      cacheService.searchKey.mockResolvedValue(expectedKey);

      const response = await controller.searchArticles({
        search: 'search',
        limit: 25,
        status: ArticleStatus.PUBLISHED,
      });

      expect(cacheService.searchKey).toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(articleService.search).toHaveBeenCalledWith(
        25,
        'search',
        ArticleStatus.PUBLISHED,
        undefined,
        undefined,
      );
      expect(cacheService.set).toHaveBeenCalledWith(expectedKey, response);
    });

    it('calls app.service.findAll() with pagination args', async () => {
      const cursorId = crypto.randomUUID();
      const expected = {
        data: [{ id: '1', title: 'title' }],
        hasMore: false,
      };
      articleService.browse.mockResolvedValue(expected);
      const response = await controller.browseArticles({
        cursorId,
        limit: 25,
        status: ArticleStatus.DRAFT,
      });
      expect(articleService.browse).toHaveBeenCalledWith(
        25,
        cursorId,
        ArticleStatus.DRAFT,
        undefined,
        undefined,
      );
      expect(response).toEqual(expected);
    });

    it('calls app.service.findBySlug() - authenticated', async () => {
      const expectedKey = 'articles:v1:slug:slug';

      cacheService.slugKey.mockResolvedValue(expectedKey);
      articleService.findBySlug.mockResolvedValue({
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.PUBLISHED,
        createdAt: new Date(),
      });

      const article = await controller.findBySlug(authedReq, response, 'slug');

      expect(cacheService.slugKey).toHaveBeenCalledWith('slug');
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(articleService.findBySlug).toHaveBeenCalledWith(
        authedReq.isAuthenticated,
        'slug',
      );

      await controller.findBySlug(anonReq, response, 'slug');
      expect(articleService.findBySlug).toHaveBeenCalledWith(false, 'slug');
      expect(cacheService.set).toHaveBeenCalledWith(expectedKey, article);
    });

    it('calls app.service.findBySlug() - public', async () => {
      const expectedKey = 'articles:v1:slug:slug';

      cacheService.slugKey.mockResolvedValue(expectedKey);
      articleService.findBySlug.mockResolvedValue({
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.PUBLISHED,
        createdAt: new Date(),
      });

      const article = await controller.findBySlug(anonReq, response, 'slug');

      expect(cacheService.slugKey).toHaveBeenCalledWith('slug');
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(articleService.findBySlug).toHaveBeenCalledWith(false, 'slug');
      expect(cacheService.set).toHaveBeenCalledWith(expectedKey, article);
    });

    it('calls app.service.findById()', async () => {
      await controller.findById('uuid');
      expect(articleService.findById).toHaveBeenCalledWith('uuid');
    });

    it('calls app.service.update()', async () => {
      const requestData = { title: 'title', status: ArticleStatus.ARCHIVED };
      await controller.updateArticle('1', requestData);
      expect(articleService.update).toHaveBeenCalledWith('1', requestData);
      expect(cacheService.bumpVersion).toHaveBeenCalled();
    });

    it('calls app.service.delete()', async () => {
      await controller.removeArticle('1');
      expect(articleService.remove).toHaveBeenCalledWith('1');
      expect(cacheService.bumpVersion).toHaveBeenCalled();
    });
  });

  describe('cache hits', () => {
    it('returns cached value if article is PUBLISHED', async () => {
      const expectedKey = 'articles:v1:slug:slug';
      const cacheArticle = {
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.PUBLISHED,
        createdAt: new Date(),
      };
      const fetchedArticle = {
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.ARCHIVED,
        createdAt: new Date(),
      };

      cacheService.slugKey.mockResolvedValue(expectedKey);
      cacheService.get.mockResolvedValue(cacheArticle);

      const article = await controller.findBySlug(authedReq, response, 'slug');

      expect(article).toEqual(cacheArticle);
      expect(article).not.toEqual(fetchedArticle);
      expect(cacheService.slugKey).toHaveBeenCalledWith('slug');
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(articleService.findBySlug).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('sets cache if fetched article is PUBLISHED', async () => {
      const expectedKey = 'articles:v1:slug:slug';

      cacheService.slugKey.mockResolvedValue(expectedKey);
      articleService.findBySlug.mockResolvedValue({
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.PUBLISHED,
        createdAt: new Date(),
      });

      const article = await controller.findBySlug(authedReq, response, 'slug');

      expect(cacheService.slugKey).toHaveBeenCalledWith('slug');
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(articleService.findBySlug).toHaveBeenCalledWith(true, 'slug');
      expect(cacheService.set).toHaveBeenCalledWith(expectedKey, article);
    });

    it('cache is not set if cached article is DRAFT status', async () => {
      const expectedKey = 'articles:v1:slug:slug';
      const cacheArticle = {
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.DRAFT,
        createdAt: new Date(),
      };
      const fetchedArticle = {
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.ARCHIVED,
        createdAt: new Date(),
      };

      cacheService.slugKey.mockResolvedValue(expectedKey);
      cacheService.get.mockResolvedValue(cacheArticle);
      articleService.findBySlug.mockResolvedValue(fetchedArticle);

      const article = await controller.findBySlug(authedReq, response, 'slug');

      expect(article).not.toEqual(cacheArticle);
      expect(article).toEqual(fetchedArticle);
      expect(cacheService.slugKey).toHaveBeenCalledWith('slug');
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(articleService.findBySlug).toHaveBeenCalledWith(true, 'slug');
      expect(cacheService.set).not.toHaveBeenCalledWith(expectedKey, article);
    });

    it('cache is not set if cached article is ARCHIVED status', async () => {
      const expectedKey = 'articles:v1:slug:slug';
      const cacheArticle = {
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.ARCHIVED,
        createdAt: new Date(),
      };
      const fetchedArticle = {
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.DRAFT,
        createdAt: new Date(),
      };

      cacheService.slugKey.mockResolvedValue(expectedKey);
      cacheService.get.mockResolvedValue(cacheArticle);
      articleService.findBySlug.mockResolvedValue(fetchedArticle);

      const article = await controller.findBySlug(authedReq, response, 'slug');

      expect(article).not.toEqual(cacheArticle);
      expect(article).toEqual(fetchedArticle);
      expect(cacheService.slugKey).toHaveBeenCalledWith('slug');
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(articleService.findBySlug).toHaveBeenCalledWith(true, 'slug');
      expect(cacheService.set).not.toHaveBeenCalledWith(expectedKey, article);
    });

    it('cache is not set if fetched article is DRAFT status', async () => {
      const expectedKey = 'articles:v1:slug:slug';

      cacheService.slugKey.mockResolvedValue(expectedKey);
      articleService.findBySlug.mockResolvedValue({
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.DRAFT,
        createdAt: new Date(),
      });

      const article = await controller.findBySlug(authedReq, response, 'slug');

      expect(cacheService.slugKey).toHaveBeenCalledWith('slug');
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(articleService.findBySlug).toHaveBeenCalledWith(true, 'slug');
      expect(cacheService.set).not.toHaveBeenCalledWith(expectedKey, article);
    });

    it('cache is not set if fetched article is ARCHIVED status', async () => {
      const expectedKey = 'articles:v1:slug:slug';

      cacheService.slugKey.mockResolvedValue(expectedKey);
      articleService.findBySlug.mockResolvedValue({
        title: 'title',
        slug: 'slug',
        body: 'body',
        excerpt: '',
        status: ArticleStatus.ARCHIVED,
        createdAt: new Date(),
      });

      const article = await controller.findBySlug(authedReq, response, 'slug');

      expect(cacheService.slugKey).toHaveBeenCalledWith('slug');
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(articleService.findBySlug).toHaveBeenCalledWith(true, 'slug');
      expect(cacheService.set).not.toHaveBeenCalledWith(expectedKey, article);
    });

    it('browseArticles() returns cached value if set', async () => {
      const expectedKey =
        'articles:v1:browse:25:undefined:DRAFT:undefined:undefined';
      const expectedValue = {
        data: [],
        hasMore: false,
      };

      cacheService.browseKey.mockResolvedValue(expectedKey);
      cacheService.get.mockResolvedValue(expectedValue);

      const response = await controller.browseArticles({
        limit: 25,
        status: ArticleStatus.DRAFT,
      });

      expect(cacheService.browseKey).toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(response).toEqual(expectedValue);
      expect(articleService.browse).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('searchArticles() returns cached value if set', async () => {
      const expectedKey =
        'articles:v1:search:25:search:PUBLISHED:undefined:undefined';
      const expectedValue = {
        data: [],
        hasMore: false,
      };

      cacheService.searchKey.mockResolvedValue(expectedKey);
      cacheService.get.mockResolvedValue(expectedValue);

      const response = await controller.searchArticles({
        search: 'search',
        limit: 25,
        status: ArticleStatus.PUBLISHED,
      });

      expect(cacheService.searchKey).toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(response).toEqual(expectedValue);
      expect(articleService.browse).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('throws 400 creating article with status ARCHIVED', async () => {
      await expect(
        controller.createArticle({
          title: 'title',
          body: 'body',
          status: ArticleStatus.ARCHIVED,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(articleService.create).not.toHaveBeenCalled();
    });

    it('throws 400 when updating an article with no update fields specified', async () => {
      await expect(
        controller.updateArticle(crypto.randomUUID(), {}),
      ).rejects.toThrow(BadRequestException);

      expect(articleService.update).not.toHaveBeenCalled();
    });
  });
});
