import { ArticleCacheService } from './article-cache.service';
import { ArticleStatus } from '../../generated/prisma/enums';
import { RedisService } from '../../redis.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('Article Cache Service', () => {
  const versionKey = 'articles:version';
  const TTL = 60;
  let service: ArticleCacheService;
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
  };
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleCacheService,
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<ArticleCacheService>(ArticleCacheService);
    errorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);
  });

  it('bumpVersion calls increments version number', async () => {
    redis.incr.mockResolvedValue(1);
    await service.bumpVersion();
    expect(redis.incr).toHaveBeenCalledWith(versionKey);
  });

  it('bumpVersion calls increments with fallback 0', async () => {
    redis.get.mockResolvedValue(null);
    redis.incr.mockResolvedValue(1);
    await service.bumpVersion();
    expect(redis.incr).toHaveBeenCalledWith(versionKey);
  });

  it('bumpVersion swallows redis errors', async () => {
    redis.incr.mockRejectedValue(new Error('redis down'));
    await expect(service.bumpVersion()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(new Error('redis down'));
  });

  it('get calls redis.get()', async () => {
    redis.get.mockResolvedValue(
      '{"title":"title","slug":"slug","body":"body","excerpt":"","status":"PUBLISHED","createdAt":"2026-09-25T08:35:33.123Z"}',
    );

    const response = await service.get('articles:v0:slug:slug');

    expect(redis.get).toHaveBeenCalledWith('articles:v0:slug:slug');
    expect(response).toEqual({
      title: 'title',
      slug: 'slug',
      body: 'body',
      excerpt: '',
      status: ArticleStatus.PUBLISHED,
      createdAt: '2026-09-25T08:35:33.123Z',
    });
  });

  it('get returns null on cache miss', async () => {
    redis.get.mockResolvedValue(null);
    await expect(service.get('missing')).resolves.toBeNull();
  });

  it('get returns null when redis throws', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    await expect(service.get('key')).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(new Error('redis down'));
  });

  it('get returns null when cached value is invalid JSON', async () => {
    redis.get.mockResolvedValue('not-json');
    await expect(service.get('key')).resolves.toBeNull();
  });

  it('set calls redis.set()', async () => {
    await service.set('key', [{ title: 'title', body: 'body' }]);
    expect(redis.set).toHaveBeenCalledWith(
      'key',
      JSON.stringify([{ title: 'title', body: 'body' }]),
      'EX',
      TTL,
    );
  });

  it('set calls redis.set() with ttl', async () => {
    await service.set('key', [{ title: 'title', body: 'body' }], 10);
    expect(redis.set).toHaveBeenCalledWith(
      'key',
      JSON.stringify([{ title: 'title', body: 'body' }]),
      'EX',
      10,
    );
  });

  it('set swallows redis errors', async () => {
    redis.set.mockRejectedValue(new Error('redis down'));
    await expect(
      service.set('key', { title: 'title' }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(new Error('redis down'));
  });

  it('browseKey()', async () => {
    const expected = `articles:v0:browse:25:undefined:PUBLISHED:undefined:undefined`;
    const response = await service.browseKey(
      25,
      undefined,
      ArticleStatus.PUBLISHED,
    );
    expect(redis.get).toHaveBeenCalledWith(versionKey);
    expect(response).toBe(expected);
  });

  it('browseKey falls back to v0 when version lookup fails', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    const response = await service.browseKey(
      25,
      undefined,
      ArticleStatus.PUBLISHED,
    );
    expect(response).toBe(
      'articles:v0:browse:25:undefined:PUBLISHED:undefined:undefined',
    );
    expect(errorSpy).toHaveBeenCalledWith(new Error('redis down'));
  });

  it('searchKey()', async () => {
    const expected = `articles:v0:search:25:search:PUBLISHED:undefined:undefined`;
    const response = await service.searchKey(
      25,
      'search',
      ArticleStatus.PUBLISHED,
    );
    expect(redis.get).toHaveBeenCalledWith(versionKey);
    expect(response).toBe(expected);
  });

  it('slugKey()', async () => {
    const expected = `articles:v0:slug:slug`;
    const response = await service.slugKey('slug');
    expect(redis.get).toHaveBeenCalledWith(versionKey);
    expect(response).toBe(expected);
  });
});
