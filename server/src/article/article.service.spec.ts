jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';
import { PrismaService } from '../prisma.service';
import { ArticleStatus } from '../generated/prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WebhookService } from '../webhook/webhook.service';

describe('ArticleService', () => {
  let service: ArticleService;
  const prisma = {
    article: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    articleSlugHistory: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
  const webhookService = {
    notify: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: WebhookService,
          useValue: webhookService,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
  });

  describe('default flow', () => {
    it('creates an article', async () => {
      const title = 'My First Article';
      const body = 'Hello World';
      const excerpt = 'Hello World';
      const slug = 'my-first-article';
      const expectedReturnValue = {
        id: '1',
        title,
        slug,
        body,
        excerpt,
        createdAt: Date.now(),
      };

      prisma.article.count.mockResolvedValue(0);
      prisma.article.create.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.create({
        title,
        body: 'Hello World',
        excerpt: 'Hello World',
        status: ArticleStatus.DRAFT,
      });

      expect(prisma.article.create).toHaveBeenCalledWith({
        data: {
          title,
          slug,
          body,
          excerpt,
          status: ArticleStatus.DRAFT,
        },
      });
      expect(returnValue).toBe(expectedReturnValue);
      expect(webhookService.notify).not.toHaveBeenCalled();
    });

    it('creates an article with unique slug if title slug collides', async () => {
      const title = 'My First Article';
      const body = 'Hello World';
      const slug = 'my-first-article-1';
      const expectedReturnValue = {
        id: '2',
        title,
        slug,
        body,
      };

      prisma.article.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      prisma.article.create.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.create({
        title,
        body: 'Hello World',
        status: ArticleStatus.DRAFT,
      });

      expect(prisma.article.create).toHaveBeenCalledWith({
        data: {
          title,
          slug,
          body,
          status: ArticleStatus.DRAFT,
        },
      });
      expect(returnValue).toBe(expectedReturnValue);
    });

    it('creates an article with status PUBLISHED', async () => {
      const title = 'My First Article';
      const body = 'Hello World';
      const slug = 'my-first-article';
      const status = ArticleStatus.PUBLISHED;
      const expectedReturnValue = {
        id: '1',
        title,
        slug,
        body,
        status,
      };

      prisma.article.count.mockResolvedValue(0);
      prisma.article.create.mockResolvedValue(expectedReturnValue);
      webhookService.notify.mockResolvedValue(Promise.resolve());

      const returnValue = await service.create({
        title,
        body: 'Hello World',
        status,
      });

      expect(prisma.article.create).toHaveBeenCalledWith({
        data: {
          title,
          slug,
          body,
          status,
          publishedAt: expect.any(Date) as Date,
        },
      });
      expect(returnValue).toBe(expectedReturnValue);
      expect(webhookService.notify).toHaveBeenCalledWith({
        event: 'published',
        id: returnValue.id,
        slug: returnValue.slug,
        timestamp: expect.any(String) as string,
      });
    });

    it('creates new slug history entry if article is published and title is changed', async () => {
      const articleId = '1';

      prisma.article.findUnique.mockResolvedValue({
        id: articleId,
        title: 'title',
        slug: 'title',
        body: 'hello',
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date('2026-09-01'),
      });
      prisma.article.update.mockResolvedValue({
        id: articleId,
        title: 'new title',
        slug: 'new-title',
        body: 'hello',
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date('2026-09-01'),
        updatedAt: expect.any(Date) as Date,
      });
      prisma.article.count.mockResolvedValueOnce(0);
      webhookService.notify.mockResolvedValue(Promise.resolve());

      await service.update(articleId, { title: 'new title' });

      expect(prisma.article.update).toHaveBeenCalledWith({
        data: {
          title: 'new title',
          slug: 'new-title',
          updatedAt: expect.any(Date) as Date,
        },
        where: { id: articleId },
      });
      expect(prisma.articleSlugHistory.create).toHaveBeenCalledWith({
        data: {
          articleId,
          slug: 'title',
        },
      });
      expect(webhookService.notify).toHaveBeenCalledWith({
        event: 'updated',
        id: articleId,
        slug: 'new-title',
        previousSlug: 'title',
        timestamp: expect.any(String) as string,
      });
    });

    it('creates new slug history entry if a previously-published article is archived or drafted and title is changed', async () => {
      const articleId = '1';
      const articleSlug = 'slug';

      prisma.article.findUnique.mockResolvedValue({
        id: articleId,
        title: 'title',
        slug: articleSlug,
        body: 'hello',
        status: ArticleStatus.ARCHIVED,
        publishedAt: new Date('2026-09-01'),
      });

      await service.update(articleId, { title: 'new title' });

      expect(prisma.articleSlugHistory.create).toHaveBeenCalledWith({
        data: {
          articleId,
          slug: articleSlug,
        },
      });
    });

    it('does not create a slug history entry for an article that was never published', async () => {
      const articleId = '1';
      const articleSlug = 'slug';

      prisma.article.findUnique.mockResolvedValue({
        id: articleId,
        title: 'title',
        slug: articleSlug,
        body: 'hello',
        status: ArticleStatus.DRAFT,
        publishedAt: null,
      });

      await service.update(articleId, { title: 'new title' });

      expect(prisma.articleSlugHistory.create).not.toHaveBeenCalled();
    });

    it('falls back to slug history article id if not found in article table', async () => {
      const articleSlug = 'slug';

      prisma.article.findUnique.mockResolvedValueOnce(null);
      prisma.article.findUnique.mockResolvedValueOnce({
        id: 'id',
        title: 'title',
        slug: 'other-slug',
        body: 'hello',
        status: ArticleStatus.PUBLISHED,
      });
      prisma.articleSlugHistory.findUnique.mockResolvedValue({
        articleId: 'id',
      });

      await service.findBySlug(true, articleSlug);

      expect(prisma.articleSlugHistory.findUnique).toHaveBeenCalledWith({
        where: {
          slug: articleSlug,
        },
        select: {
          articleId: true,
        },
      });
    });

    it('returns 404 if slug not found in slug history table', async () => {
      const articleSlug = 'slug';

      prisma.article.findUnique.mockResolvedValueOnce(null);
      prisma.articleSlugHistory.findUnique.mockResolvedValueOnce(null);

      await expect(service.findBySlug(true, articleSlug)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.articleSlugHistory.findUnique).toHaveBeenCalledWith({
        where: {
          slug: articleSlug,
        },
        select: {
          articleId: true,
        },
      });
    });

    it('returns 404 if slug not found in slug history and article table by id', async () => {
      const articleSlug = 'slug';

      prisma.article.findUnique.mockResolvedValueOnce(null);
      prisma.articleSlugHistory.findUnique.mockResolvedValueOnce({
        articleId: 'id',
        slug: 'other-slug',
      });
      prisma.article.findUnique.mockResolvedValueOnce(null);

      await expect(service.findBySlug(true, articleSlug)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.article.findUnique).toHaveBeenNthCalledWith(1, {
        where: {
          slug: articleSlug,
        },
      });
      expect(prisma.articleSlugHistory.findUnique).toHaveBeenCalledWith({
        where: {
          slug: articleSlug,
        },
        select: {
          articleId: true,
        },
      });
      expect(prisma.article.findUnique).toHaveBeenNthCalledWith(2, {
        where: {
          id: 'id',
        },
      });
    });

    describe('browse articles', () => {
      it('returns all articles - no filters', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            status: ArticleStatus.DRAFT,
            excerpt: 'body',
            body: 'body',
            createdAt: new Date(),
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            status: ArticleStatus.DRAFT,
            excerpt: '',
            body: 'body',
            createdAt: new Date(),
          },
        ];
        prisma.article.findMany.mockResolvedValue(expectedArticles);

        const response = await service.browse(25);

        expect(prisma.article.findMany).toHaveBeenCalledWith({
          where: {},
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 25 + 1,
        });
        expect(response.data[0]).toEqual({
          id: expectedArticles[0].id,
          title: expectedArticles[0].title,
          slug: expectedArticles[0].slug,
          status: expectedArticles[0].status,
          excerpt: expectedArticles[0].excerpt,
          createdAt: expectedArticles[0].createdAt,
        });
        expect(response.data[1]).toEqual({
          id: expectedArticles[1].id,
          title: expectedArticles[1].title,
          slug: expectedArticles[1].slug,
          status: expectedArticles[1].status,
          excerpt: expectedArticles[1].body,
          createdAt: expectedArticles[1].createdAt,
        });
      });

      it('returns all articles - filters: [cursorId]', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            body: 'body',
            createdAt: 1788970361746,
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            body: 'body',
            createdAt: 1788970361747,
          },
        ];
        prisma.article.findMany.mockResolvedValue(expectedArticles);

        await service.browse(25, 'uuid');

        expect(prisma.article.findMany).toHaveBeenCalledWith({
          where: {},
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 25 + 1,
          cursor: { id: 'uuid' },
          skip: 1,
        });
      });

      it('returns all articles - filters: [cursorId, status<DRAFT>]', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            body: 'body',
            createdAt: 1788970361746,
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            body: 'body',
            createdAt: 1788970361747,
          },
        ];
        prisma.article.findMany.mockResolvedValue(expectedArticles);

        await service.browse(25, 'uuid', ArticleStatus.DRAFT);

        expect(prisma.article.findMany).toHaveBeenCalledWith({
          where: { status: ArticleStatus.DRAFT },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 25 + 1,
          cursor: { id: 'uuid' },
          skip: 1,
        });
      });

      it('returns all articles - filters: [cursorId, status<PUBLISHED>, startDate]', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            excerpt: '',
            createdAt: 1788970361746,
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            excerpt: '',
            createdAt: 1788970361747,
          },
        ];
        const expected = {
          data: expectedArticles,
          hasMore: false,
        };
        prisma.article.findMany.mockResolvedValue(expectedArticles);

        const startDate = new Date();
        const returnValue = await service.browse(
          25,
          'uuid',
          ArticleStatus.PUBLISHED,
          startDate,
        );

        expect(prisma.article.findMany).toHaveBeenCalledWith({
          where: {
            status: ArticleStatus.PUBLISHED,
            publishedAt: { gte: startDate },
          },
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: 25 + 1,
          cursor: { id: 'uuid' },
          skip: 1,
        });
        expect(returnValue).toEqual(expected);
        expect(returnValue.data).toHaveLength(2);
      });

      it('returns all articles - filters: [cursorId, status<PUBLISHED>, startDate, undefined]', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            excerpt: '',
            createdAt: 1788970361746,
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            excerpt: '',
            createdAt: 1788970361747,
          },
        ];
        const expected = {
          data: expectedArticles,
          hasMore: false,
        };
        prisma.article.findMany.mockResolvedValue(expectedArticles);

        const startDate = new Date('2026-09-19');
        const returnValue = await service.browse(
          25,
          'uuid',
          ArticleStatus.PUBLISHED,
          startDate,
        );

        expect(prisma.article.findMany).toHaveBeenCalledWith({
          where: {
            status: ArticleStatus.PUBLISHED,
            publishedAt: { gte: startDate },
          },
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: 25 + 1,
          cursor: { id: 'uuid' },
          skip: 1,
        });
        expect(returnValue).toEqual(expected);
        expect(returnValue.data).toHaveLength(2);
      });

      it('returns all articles - filters: [cursorId, status<PUBLISHED>, undefined, endDate]', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            excerpt: '',
            createdAt: 1788970361746,
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            excerpt: '',
            createdAt: 1788970361747,
          },
        ];
        const expected = {
          data: expectedArticles,
          hasMore: false,
        };
        prisma.article.findMany.mockResolvedValue(expectedArticles);

        const endDate = new Date('2026-09-20');
        const returnValue = await service.browse(
          25,
          'uuid',
          ArticleStatus.PUBLISHED,
          undefined,
          endDate,
        );

        expect(prisma.article.findMany).toHaveBeenCalledWith({
          where: {
            status: ArticleStatus.PUBLISHED,
            publishedAt: { lte: endDate },
          },
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: 25 + 1,
          cursor: { id: 'uuid' },
          skip: 1,
        });
        expect(returnValue).toEqual(expected);
        expect(returnValue.data).toHaveLength(2);
      });

      it('returns all articles - filters: [cursorId, status<PUBLISHED>, startDate, endDate]', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            excerpt: '',
            createdAt: 1788970361746,
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            excerpt: '',
            createdAt: 1788970361747,
          },
        ];
        const expected = {
          data: expectedArticles,
          hasMore: false,
        };
        prisma.article.findMany.mockResolvedValue(expectedArticles);

        const startDate = new Date('2026-09-19');
        const endDate = new Date('2026-09-20');
        const returnValue = await service.browse(
          25,
          'uuid',
          ArticleStatus.PUBLISHED,
          startDate,
          endDate,
        );

        expect(prisma.article.findMany).toHaveBeenCalledWith({
          where: {
            status: ArticleStatus.PUBLISHED,
            publishedAt: { gte: startDate, lte: endDate },
          },
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: 25 + 1,
          cursor: { id: 'uuid' },
          skip: 1,
        });
        expect(returnValue).toEqual(expected);
        expect(returnValue.data).toHaveLength(2);
      });
    });

    describe('search articles', () => {
      it('returns articles - no filters', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            status: ArticleStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
            headline: '',
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            status: ArticleStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
            headline: '',
          },
        ];
        prisma.$queryRaw.mockResolvedValue(expectedArticles);

        const response = await service.search(25, 'body');

        expect(prisma.$queryRaw).toHaveBeenCalled();
        expect(response).toEqual({
          data: expect.arrayContaining([]) as [],
        });
        expect(response.data[0]).toEqual({
          id: expectedArticles[0].id,
          title: expectedArticles[0].title,
          slug: expectedArticles[0].slug,
          status: expectedArticles[0].status,
          createdAt: expectedArticles[0].createdAt,
          updatedAt: expectedArticles[0].updatedAt,
          headline: expectedArticles[0].headline,
        });
        expect(response.data[1]).toEqual({
          id: expectedArticles[1].id,
          title: expectedArticles[1].title,
          slug: expectedArticles[1].slug,
          status: expectedArticles[1].status,
          createdAt: expectedArticles[1].createdAt,
          updatedAt: expectedArticles[1].updatedAt,
          headline: expectedArticles[1].headline,
        });
      });

      it('returns articles - filters: [status<DRAFT>]', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            status: ArticleStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
            headline: '',
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            status: ArticleStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
            headline: '',
          },
        ];
        prisma.$queryRaw.mockResolvedValue(expectedArticles);

        const response = await service.search(
          25,
          'body',
          ArticleStatus.PUBLISHED,
        );

        expect(prisma.$queryRaw).toHaveBeenCalled();
        expect(response).toEqual({
          data: expect.arrayContaining([]) as [],
        });
        expect(response.data[0]).toEqual({
          id: expectedArticles[0].id,
          title: expectedArticles[0].title,
          slug: expectedArticles[0].slug,
          status: expectedArticles[0].status,
          createdAt: expectedArticles[0].createdAt,
          updatedAt: expectedArticles[0].updatedAt,
          headline: expectedArticles[0].headline,
        });
        expect(response.data[1]).toEqual({
          id: expectedArticles[1].id,
          title: expectedArticles[1].title,
          slug: expectedArticles[1].slug,
          status: expectedArticles[1].status,
          createdAt: expectedArticles[1].createdAt,
          updatedAt: expectedArticles[1].updatedAt,
          headline: expectedArticles[1].headline,
        });
      });

      it('returns all articles - filters: [cursorId, status<PUBLISHED>, startDate, endDate]', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            status: ArticleStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
            headline: '',
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            status: ArticleStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
            headline: '',
          },
        ];
        prisma.$queryRaw.mockResolvedValue(expectedArticles);

        const response = await service.search(
          25,
          'body',
          ArticleStatus.PUBLISHED,
          new Date(),
          new Date(),
        );

        expect(prisma.$queryRaw).toHaveBeenCalled();
        expect(response).toEqual({
          data: expect.arrayContaining([]) as [],
        });
        expect(response.data[0]).toEqual({
          id: expectedArticles[0].id,
          title: expectedArticles[0].title,
          slug: expectedArticles[0].slug,
          status: expectedArticles[0].status,
          createdAt: expectedArticles[0].createdAt,
          updatedAt: expectedArticles[0].updatedAt,
          headline: expectedArticles[0].headline,
        });
        expect(response.data[1]).toEqual({
          id: expectedArticles[1].id,
          title: expectedArticles[1].title,
          slug: expectedArticles[1].slug,
          status: expectedArticles[1].status,
          createdAt: expectedArticles[1].createdAt,
          updatedAt: expectedArticles[1].updatedAt,
          headline: expectedArticles[1].headline,
        });
      });

      it('returns all articles - filters: [cursorId, status<DRAFT>, startDate, endDate]', async () => {
        const expectedArticles = [
          {
            id: '1',
            title: 'title',
            slug: 'title',
            status: ArticleStatus.DRAFT,
            createdAt: new Date(),
            updatedAt: new Date(),
            headline: '',
          },
          {
            id: '2',
            title: 'title',
            slug: 'title-1',
            status: ArticleStatus.DRAFT,
            createdAt: new Date(),
            updatedAt: new Date(),
            headline: '',
          },
        ];
        prisma.$queryRaw.mockResolvedValue(expectedArticles);

        const response = await service.search(
          25,
          'body',
          ArticleStatus.DRAFT,
          new Date(),
          new Date(),
        );

        expect(prisma.$queryRaw).toHaveBeenCalled();
        expect(response).toEqual({
          data: expect.arrayContaining([]) as [],
        });
        expect(response.data[0]).toEqual({
          id: expectedArticles[0].id,
          title: expectedArticles[0].title,
          slug: expectedArticles[0].slug,
          status: expectedArticles[0].status,
          createdAt: expectedArticles[0].createdAt,
          updatedAt: expectedArticles[0].updatedAt,
          headline: expectedArticles[0].headline,
        });
        expect(response.data[1]).toEqual({
          id: expectedArticles[1].id,
          title: expectedArticles[1].title,
          slug: expectedArticles[1].slug,
          status: expectedArticles[1].status,
          createdAt: expectedArticles[1].createdAt,
          updatedAt: expectedArticles[1].updatedAt,
          headline: expectedArticles[1].headline,
        });
      });
    });

    it('derives excerpt for article body', async () => {
      const expectedArticles = [
        {
          id: '1',
          title: 'title',
          slug: 'title',
          status: ArticleStatus.DRAFT,
          body: '# Hello\n\nworld',
          excerpt: '',
          createdAt: 1788970361746,
        },
        {
          id: '2',
          title: 'title',
          slug: 'title-1',
          status: ArticleStatus.DRAFT,
          body: '## Lorem ipsum dolor sit amet\n\n consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec.',
          excerpt: '',
          createdAt: 1788970361747,
        },
      ];
      prisma.article.findMany.mockResolvedValue(expectedArticles);

      const response = await service.browse(25);

      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 25 + 1,
      });
      expect(response.data[0].id).toBe(expectedArticles[0].id);
      expect(response.data[0].excerpt).toBe('Hello world');
      expect(response.data[1].id).toBe(expectedArticles[1].id);
      expect(response.data[1].excerpt!.length).toBeLessThanOrEqual(163);
      expect(/(\w+)(\.\.\.)$/.test(response.data[1].excerpt ?? '')).toBe(true);
    });

    it('returns article by slug', async () => {
      const expectedReturnValue = {
        id: '2',
        title: 'title',
        slug: 'title',
        body: 'body',
        createdAt: 1788970361747,
      };

      prisma.article.findUnique.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.findBySlug(true, 'title');

      expect(prisma.article.findUnique).toHaveBeenCalledWith({
        where: {
          slug: 'title',
        },
      });
      expect(returnValue).toBe(expectedReturnValue);
    });

    it('updates title and slug', async () => {
      const createdAt = new Date('2026-09-15');
      const updatedAt = new Date('2026-09-16');
      const expectedReturnValue = {
        id: '2',
        title: 'title-2',
        slug: 'title-2',
        body: 'body',
        status: ArticleStatus.PUBLISHED,
        createdAt,
        updatedAt,
      };

      prisma.article.count.mockResolvedValueOnce(0);
      prisma.article.findUnique.mockResolvedValue({
        id: '2',
        title: 'title-1',
        slug: 'title-1',
        body: 'body',
        createdAt,
        status: ArticleStatus.DRAFT,
      });
      prisma.article.update.mockResolvedValue(expectedReturnValue);
      webhookService.notify.mockResolvedValue(Promise.resolve());

      const returnValue = await service.update('2', {
        title: 'title-2',
        status: ArticleStatus.PUBLISHED,
      });

      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: '2' },
        data: {
          title: 'title-2',
          slug: 'title-2',
          status: ArticleStatus.PUBLISHED,
          updatedAt: expect.any(Date) as Date,
          publishedAt: expect.any(Date) as Date,
        },
      });
      expect(returnValue).toBe(expectedReturnValue);
      expect(returnValue.slug).toBe('title-2');
      expect(webhookService.notify).toHaveBeenCalledWith({
        event: 'published',
        id: expectedReturnValue.id,
        slug: expectedReturnValue.slug,
        timestamp: expect.any(String) as string,
      });
    });

    it('updates article body only', async () => {
      const createdAt = new Date('2026-09-15');
      const updatedAt = new Date('2026-09-16');
      const expectedReturnValue = {
        id: '2',
        title: 'title',
        slug: 'title',
        body: 'not body',
        createdAt,
        updatedAt,
      };

      prisma.article.count.mockResolvedValueOnce(0);
      prisma.article.findUnique.mockResolvedValue({
        id: '2',
        title: 'title',
        slug: 'title',
        body: 'body',
        createdAt,
        status: ArticleStatus.DRAFT,
      });
      prisma.article.update.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.update('2', { body: 'not body' });

      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: '2' },
        data: { body: 'not body', updatedAt: expect.any(Date) as Date },
      });
      expect(returnValue).toBe(expectedReturnValue);
      expect(returnValue.slug).toBe('title');
      expect(webhookService.notify).not.toHaveBeenCalled();
    });

    it('deletes article by id - DRAFT | ARCHIVED', async () => {
      const expectedReturnValue = {
        id: '2',
        title: 'title-2',
        slug: 'title-2',
        body: 'body',
        createdAt: new Date(),
        status: ArticleStatus.DRAFT,
      };

      prisma.article.findUnique.mockResolvedValue(expectedReturnValue);
      prisma.article.delete.mockResolvedValue(expectedReturnValue);

      const returnValue = await service.remove('2');

      expect(prisma.article.delete).toHaveBeenCalledWith({
        where: { id: '2' },
      });
      expect(returnValue).toBe(expectedReturnValue);
    });

    it('deletes article by id - PUBLISHED', async () => {
      const expectedReturnValue = {
        id: '2',
        title: 'title-2',
        slug: 'title-2',
        body: 'body',
        createdAt: new Date(),
        status: ArticleStatus.PUBLISHED,
      };

      prisma.article.findUnique.mockResolvedValue(expectedReturnValue);
      prisma.article.delete.mockResolvedValue(expectedReturnValue);
      webhookService.notify.mockResolvedValue(Promise.resolve());

      const returnValue = await service.remove('2');

      expect(prisma.article.delete).toHaveBeenCalledWith({
        where: { id: '2' },
      });
      expect(returnValue).toBe(expectedReturnValue);
      expect(webhookService.notify).toHaveBeenCalledWith({
        event: 'deleted',
        id: returnValue.id,
        slug: returnValue.slug,
        timestamp: expect.any(String) as string,
      });
    });
  });

  describe('edge cases', () => {
    it('throws error if updating article status from DRAFT to ARCHIVED', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: '1',
        title: 'title',
        slug: 'slug',
        body: 'body',
        status: ArticleStatus.DRAFT,
      });

      await expect(
        service.update(crypto.randomUUID(), {
          status: ArticleStatus.ARCHIVED,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.article.update).not.toHaveBeenCalled();
    });

    it('allows unpublishing an article from PUBLISHED to DRAFT without resetting publishedAt', async () => {
      const publishedAt = new Date('2026-09-01');
      prisma.article.findUnique.mockResolvedValue({
        id: '1',
        title: 'title',
        slug: 'slug',
        body: 'body',
        status: ArticleStatus.PUBLISHED,
        publishedAt,
      });
      prisma.article.update.mockResolvedValue({
        id: '1',
        title: 'title',
        slug: 'slug',
        body: 'body',
        status: ArticleStatus.DRAFT,
        publishedAt,
      });
      webhookService.notify.mockResolvedValue(Promise.resolve());

      await service.update('1', { status: ArticleStatus.DRAFT });

      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: ArticleStatus.DRAFT,
          updatedAt: expect.any(Date) as Date,
        },
      });
      expect(webhookService.notify).toHaveBeenCalledWith({
        event: 'unpublished',
        id: '1',
        slug: 'slug',
        timestamp: expect.any(String) as string,
      });
    });

    it('notifies unpublished when archiving a PUBLISHED article', async () => {
      const publishedAt = new Date('2026-09-01');
      prisma.article.findUnique.mockResolvedValue({
        id: '1',
        title: 'title',
        slug: 'slug',
        body: 'body',
        status: ArticleStatus.PUBLISHED,
        publishedAt,
      });
      prisma.article.update.mockResolvedValue({
        id: '1',
        title: 'title',
        slug: 'slug',
        body: 'body',
        status: ArticleStatus.ARCHIVED,
        publishedAt,
      });
      webhookService.notify.mockResolvedValue(Promise.resolve());

      await service.update('1', { status: ArticleStatus.ARCHIVED });

      expect(webhookService.notify).toHaveBeenCalledWith({
        event: 'unpublished',
        id: '1',
        slug: 'slug',
        timestamp: expect.any(String) as string,
      });
    });

    it('notifies published when republishing an ARCHIVED article', async () => {
      const publishedAt = new Date('2026-09-01');
      prisma.article.findUnique.mockResolvedValue({
        id: '1',
        title: 'title',
        slug: 'slug',
        body: 'body',
        status: ArticleStatus.ARCHIVED,
        publishedAt,
      });
      prisma.article.update.mockResolvedValue({
        id: '1',
        title: 'title',
        slug: 'slug',
        body: 'body',
        status: ArticleStatus.PUBLISHED,
        publishedAt,
      });
      webhookService.notify.mockResolvedValue(Promise.resolve());

      await service.update('1', { status: ArticleStatus.PUBLISHED });

      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: ArticleStatus.PUBLISHED,
          updatedAt: expect.any(Date) as Date,
        },
      });
      expect(webhookService.notify).toHaveBeenCalledWith({
        event: 'published',
        id: '1',
        slug: 'slug',
        timestamp: expect.any(String) as string,
      });
    });

    it('throws error if fetching article detail in DRAFT or ARCHIVED status - unauthenticated', async () => {
      prisma.article.findUnique.mockResolvedValueOnce({
        id: '1',
        title: 'title',
        slug: 'slug',
        body: 'body',
        status: ArticleStatus.DRAFT,
      });
      prisma.article.findUnique.mockResolvedValueOnce({
        id: '2',
        title: 'title-1',
        slug: 'slug-1',
        body: 'body',
        status: ArticleStatus.ARCHIVED,
      });
      prisma.article.findUnique.mockResolvedValueOnce({
        id: '3',
        title: 'title-2',
        slug: 'slug-2',
        body: 'body',
        status: ArticleStatus.PUBLISHED,
      });

      await expect(service.findBySlug(false, 'slug')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findBySlug(false, 'slug-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findBySlug(false, 'slug-2')).resolves.toMatchObject({
        id: '3',
        status: ArticleStatus.PUBLISHED,
      });
    });
  });
});
