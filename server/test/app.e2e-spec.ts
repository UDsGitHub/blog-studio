import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Test as STest } from 'supertest';
import { AllMethods, App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { BrowseArticlesResponseDto } from '../src/article/dto/browse-articles.dto';
import { Article, ArticleStatus } from '../src/generated/prisma/client';
import { SearchArticlesResponseDto } from '../src/article/dto/search-articles.dto';

const apiKey = process.env.API_KEY ?? 'blog_sk_test_e2e_key_not_for_prod';
const authHeader = { Authorization: `ApiKey ${apiKey}` };

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let asAdmin: (method: AllMethods, path: string) => STest;
  let asPublic: (method: AllMethods, path: string) => STest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    prisma = app.get(PrismaService);
    await app.init();

    asAdmin = (method: AllMethods, path: string) =>
      request(app.getHttpServer())[method](path).set(authHeader);
    asPublic = (method: AllMethods, path: string) =>
      request(app.getHttpServer())[method](path);
  });

  afterEach(async () => {
    await prisma.article.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('default flow', () => {
    it('default article CRUD flow', async () => {
      const expectedData = {
        title: 'first article',
        body: 'hello world',
        status: ArticleStatus.DRAFT,
      };

      const createRes = await asAdmin('post', '/articles')
        .send(expectedData)
        .expect(201);

      const createdArticle = createRes.body as Article;
      expect({
        title: createdArticle.title,
        body: createdArticle.body,
        status: ArticleStatus.DRAFT,
      }).toMatchObject(expectedData);
      expect(createdArticle.slug).toEqual('first-article');
      expect(createdArticle.status).toEqual('DRAFT');

      const getArticleBySlugRes = await asAdmin(
        'get',
        `/articles/${createdArticle.slug}`,
      ).expect(200);
      const getArticleByIdRes = await asAdmin(
        'get',
        `/articles/id/${createdArticle.id}`,
      ).expect(200);
      expect(getArticleBySlugRes.body as Article).toMatchObject(createdArticle);
      expect((getArticleBySlugRes.body as Article).id).toEqual(
        (getArticleByIdRes.body as Article).id,
      );

      const expectedTitle = 'updated first article';
      const expectedSlug = 'updated-first-article';
      const updateArticleRes = await asAdmin(
        'patch',
        `/articles/${createdArticle.id}`,
      )
        .send({ title: expectedTitle, status: 'PUBLISHED' })
        .expect(200);
      const updatedArticle = updateArticleRes.body as Article;

      expect(updatedArticle.body).toEqual(createdArticle.body);
      expect(updatedArticle.title).toEqual(expectedTitle);
      expect(updatedArticle.slug).toEqual(expectedSlug);
      expect(updatedArticle.status).toEqual('PUBLISHED');
      expect(updatedArticle.updatedAt).toBeDefined();
      expect(updatedArticle.publishedAt).toBeDefined();
      expect(
        new Date(updatedArticle.updatedAt as unknown as string).getTime(),
      ).toBeGreaterThan(new Date(createdArticle.createdAt).getTime());

      await asAdmin('delete', `/articles/${createdArticle.id}`).expect(200);

      const response = await asPublic(
        'get',
        '/articles?status=PUBLISHED',
      ).expect(200);
      const articles = response.body as BrowseArticlesResponseDto;
      expect(articles.data).toHaveLength(0);
    });

    it('article created with PUBLISHED status should have publishedAt set', async () => {
      const createRes = await asAdmin('post', '/articles')
        .send({
          title: 'first article',
          body: 'hello world',
          status: ArticleStatus.PUBLISHED,
        })
        .expect(201);

      const createdArticle = createRes.body as Article;

      expect({
        title: createdArticle.title,
        slug: createdArticle.slug,
        body: createdArticle.body,
        status: createdArticle.status,
      }).toMatchObject({
        title: 'first article',
        slug: 'first-article',
        body: 'hello world',
        status: ArticleStatus.PUBLISHED,
      });
      expect(createdArticle.publishedAt).toBeDefined();
    });

    describe('browse articles - no search term', () => {
      it('fetches articles', async () => {
        await asAdmin('post', '/articles')
          .send({
            title: 'first article',
            body: `
            ## Images

            ![Minion](https://octodex.github.com/images/minion.png)
            ![Stormtroopocat](https://octodex.github.com/images/stormtroopocat.jpg "The Stormtroopocat")
            `,
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        await asAdmin('post', '/articles')
          .send({
            title: 'second article',
            body: `
            # h1 Heading 8-)
            ## h2 Heading
            ### h3 Heading
            #### h4 Heading
            ##### h5 Heading
            ###### h6 Heading
            `,
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const third = await asAdmin('post', '/articles')
          .send({
            title: 'third article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
            excerpt: 'some excerpt',
          })
          .expect(201);
        const fourth = await asAdmin('post', '/articles')
          .send({
            title: 'fourth article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);

        const article3 = third.body as Article;
        const article4 = fourth.body as Article;

        const getArticlesRes = await asAdmin(
          'get',
          `/articles?cursorId=${article4.id}&limit=3&status=DRAFT`,
        ).expect(200);
        const articles = getArticlesRes.body as BrowseArticlesResponseDto;
        expect(articles.data).toHaveLength(3);
        expect(articles.data[0].id).toBe(article3.id);
        expect(articles.data[0].excerpt).toBe('some excerpt');
        expect(articles.data[2].excerpt).toBe('Images');
        expect(articles.data[1].excerpt).toBe(
          'h1 Heading 8-) h2 Heading h3 Heading h4 Heading h5 Heading h6 Heading',
        );
        articles.data.forEach((a) => expect(a).not.toHaveProperty('body'));
      });

      it('fetches next page', async () => {
        const first = await asAdmin('post', '/articles')
          .send({
            title: 'first article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const second = await asAdmin('post', '/articles')
          .send({
            title: 'second article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        await asAdmin('post', '/articles')
          .send({
            title: 'third article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        await asAdmin('post', '/articles')
          .send({
            title: 'fourth article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);

        const article1 = first.body as Article;
        const article2 = second.body as Article;

        // fetch and assert first page next cursorId
        const firstPageRes = await asAdmin(
          'get',
          `/articles?limit=3&status=DRAFT`,
        ).expect(200);
        const firstPageArticles =
          firstPageRes.body as BrowseArticlesResponseDto;
        expect(firstPageArticles.data[2].id).toBe(article2.id);
        expect(firstPageArticles.hasMore).toBe(true);

        // use cursorId to fetch next page
        const secondPageRes = await asAdmin(
          'get',
          `/articles?cursorId=${article2.id}&limit=3&status=DRAFT`,
        ).expect(200);
        const articles = secondPageRes.body as BrowseArticlesResponseDto;
        expect(articles.data).toHaveLength(1);
        expect(articles.data[0].id).toBe(article1.id);
      });

      it('fetches articles<PUBLISHED> - order by publishedAt', async () => {
        const first = await asAdmin('post', '/articles')
          .send({
            title: 'first article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const second = await asAdmin('post', '/articles')
          .send({
            title: 'second article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const third = await asAdmin('post', '/articles')
          .send({
            title: 'third article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);

        const article1 = first.body as Article;
        const article2 = second.body as Article;
        const article3 = third.body as Article;

        // publish in reverse order so publishedAt ranking != createdAt ranking
        await asAdmin('patch', `/articles/${article3.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        await asAdmin('patch', `/articles/${article2.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        await asAdmin('patch', `/articles/${article1.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        const getArticlesRes = await asAdmin(
          'get',
          `/articles?limit=3&status=PUBLISHED`,
        ).expect(200);
        const articles = getArticlesRes.body as BrowseArticlesResponseDto;

        // newest published first (first was published last)
        expect(articles.data.map((a) => a.id)).toEqual([
          article1.id,
          article2.id,
          article3.id,
        ]);
      });

      it('fetches articles<ARCHIVED> - order by publishedAt', async () => {
        const first = await asAdmin('post', '/articles')
          .send({
            title: 'first article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const second = await asAdmin('post', '/articles')
          .send({
            title: 'second article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const third = await asAdmin('post', '/articles')
          .send({
            title: 'third article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);

        const article1 = first.body as Article;
        const article2 = second.body as Article;
        const article3 = third.body as Article;

        // publish in reverse order so publishedAt ranking != createdAt ranking
        await asAdmin('patch', `/articles/${article3.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        await asAdmin('patch', `/articles/${article3.id}`)
          .send({ status: ArticleStatus.ARCHIVED })
          .expect(200);
        await asAdmin('patch', `/articles/${article2.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        await asAdmin('patch', `/articles/${article2.id}`)
          .send({ status: ArticleStatus.ARCHIVED })
          .expect(200);
        await asAdmin('patch', `/articles/${article1.id}`)
          .send({ status: ArticleStatus.PUBLISHED })
          .expect(200);
        await asAdmin('patch', `/articles/${article1.id}`)
          .send({ status: ArticleStatus.ARCHIVED })
          .expect(200);
        const getArticlesRes = await asAdmin(
          'get',
          `/articles?limit=3&status=ARCHIVED`,
        ).expect(200);
        const articles = getArticlesRes.body as BrowseArticlesResponseDto;

        // newest published first (first was published last)
        expect(articles.data.map((a) => a.id)).toEqual([
          article1.id,
          article2.id,
          article3.id,
        ]);
      });
    });

    describe('search articles - search term', () => {
      it('fetches articles with search term', async () => {
        const searchTerm = 'article 1';
        await asAdmin('post', '/articles')
          .send({
            title: 'first article',
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
        const second = await asAdmin('post', '/articles')
          .send({
            title: `second article`,
            body: `hello world ${searchTerm}`,
          })
          .expect(201);
        const third = await asAdmin('post', '/articles')
          .send({
            title: 'third article',
            body: `hello world ${searchTerm}`,
          })
          .expect(201);
        const article2 = second.body as Article;
        const article3 = third.body as Article;

        const getArticlesRes = await asAdmin(
          'get',
          `/articles/search?search=${encodeURIComponent(searchTerm)}&limit=3&status=DRAFT`,
        ).expect(200);
        const { data: articles } =
          getArticlesRes.body as SearchArticlesResponseDto;

        expect(articles).toHaveLength(2);
        expect(articles[1].id).toBe(article2.id);
        articles.forEach((a) =>
          expect(a).not.toHaveProperty(['body', 'excerpt']),
        );
        expect(articles[1].id).toBe(article2.id);
        expect(
          articles[1].headline.includes(
            `<b>${searchTerm.split(' ').join('</b> <b>')}</b>`,
          ),
        ).toBe(true);
        expect(articles[0].id).toBe(article3.id);
        expect(
          articles[0].headline.includes(
            `<b>${searchTerm.split(' ').join('</b> <b>')}</b>`,
          ),
        ).toBe(true);
      });
    });
  });

  describe('fails as needed', () => {
    it('browse articles throws 400 on bad request', async () => {
      await asAdmin('get', '/articles?cursorId=1&limit=10').expect(400);
      await asAdmin('get', '/articles?cursorId=1&limit=string').expect(400);
      await asAdmin(
        'get',
        `/articles?cursorId=${crypto.randomUUID()}&limit=string`,
      ).expect(400);
      await asAdmin(
        'get',
        `/articles?cursorId=${crypto.randomUUID()}&limit=3&status=BAD_STATUS`,
      ).expect(400);
    });

    it('create article throws 400 error on bad request', async () => {
      await asAdmin('post', '/articles').send().expect(400);
      await asAdmin('post', '/articles').send({ title: 'hello' }).expect(400);
      await asAdmin('post', '/articles').send({ body: 'goodbye' }).expect(400);
    });

    it('cannot create article with ARCHIVED STATUS', async () => {
      await asAdmin('post', '/articles')
        .send({ title: 'title', body: 'body', status: ArticleStatus.ARCHIVED })
        .expect(400);
    });

    it('update article throws 400 error on bad request', async () => {
      const randomId = crypto.randomUUID();
      await asAdmin('patch', '/articles/1').expect(400);
      await asAdmin('patch', `/articles/${randomId}`).expect(400);
      await asAdmin('patch', `/articles/${randomId}`)
        .send({ title: 'gone' })
        .expect(404);
      const response = await asAdmin('post', '/articles')
        .send({ title: 'hello', body: 'world' })
        .expect(201);
      const createdArticle = response.body as Article;
      await asAdmin('patch', `/articles/${createdArticle.id}`)
        .send({ status: 'BAD_STATUS' })
        .expect(400);
    });

    it('delete article throws 400 error on bad request', async () => {
      await asAdmin('delete', '/articles/1').expect(400);
    });

    it('unknown slug should return 404', async () => {
      await asAdmin('get', '/articles/my-slug').expect(404);
    });

    it('unknown article id should return 404', async () => {
      await asAdmin('get', `/articles/id/${crypto.randomUUID()}`).expect(404);
    });

    it('deleting unknown article id should return 404', async () => {
      await asAdmin('delete', `/articles/${crypto.randomUUID()}`).expect(404);
    });

    it('cannot filter articles by dates without status parameter', async () => {
      await asAdmin('get', `/articles?limit=2&startDate=2026-09-10`).expect(
        400,
      );
      await asAdmin('get', `/articles?limit=2&endDate=2026-09-10`).expect(400);
      await asAdmin(
        'get',
        `/articles?limit=2&startDate=2026-09-10&endDate=2026-09-12`,
      ).expect(400);
      await asPublic('get', `/articles?limit=2&startDate=2026-09-10`).expect(
        400,
      );
      await asPublic('get', `/articles?limit=2&endDate=2026-09-10`).expect(400);
      await asPublic(
        'get',
        `/articles?limit=2&startDate=2026-09-10&endDate=2026-09-12`,
      ).expect(400);
    });
  });

  describe('edge cases', () => {
    it('creates unique slug if title is duplicate', async () => {
      const first = await asAdmin('post', '/articles')
        .send({
          title: 'first article',
          body: 'hello world',
          status: ArticleStatus.DRAFT,
        })
        .expect(201);
      const article1 = first.body as Article;
      const second = await asAdmin('post', '/articles')
        .send({
          title: 'first article',
          body: 'hello world',
          status: ArticleStatus.DRAFT,
        })
        .expect(201);

      const article2 = second.body as Article;

      const getArticlesRes = await asAdmin(
        'get',
        `/articles?status=DRAFT`,
      ).expect(200);
      const { data } = getArticlesRes.body as BrowseArticlesResponseDto;
      const [secondArticle, firstArticle] = data;

      expect(firstArticle).toMatchObject({
        id: article1.id,
        title: article1.title,
        slug: article1.slug,
        status: article1.status,
      });
      expect(secondArticle).toMatchObject({
        id: article2.id,
        title: article2.title,
        slug: article2.slug,
        status: article2.status,
      });
      expect(firstArticle.slug).not.toBe(secondArticle.slug);
    });

    it('finds article from old slug using slug history', async () => {
      const createArticleRes = await asAdmin('post', '/articles')
        .send({
          title: 'original article',
          body: 'hello world',
          status: ArticleStatus.PUBLISHED,
        })
        .expect(201);
      const originalArticle = createArticleRes.body as Article;
      await asAdmin('patch', `/articles/${originalArticle.id}`)
        .send({ title: 'new title' })
        .expect(200);

      const getArticlesRes = await asAdmin(
        'get',
        `/articles/${originalArticle.slug}`,
      ).expect(200);
      const fetchedArticle = getArticlesRes.body as Article;
      expect(fetchedArticle.slug).not.toEqual(originalArticle.slug);
      expect(fetchedArticle.id).toEqual(originalArticle.id);
    });

    it('unpublishes an article from published to draft, keeping publishedAt', async () => {
      const first = await asAdmin('post', '/articles')
        .send({
          title: 'first article',
          body: 'hello',
          status: ArticleStatus.PUBLISHED,
        })
        .expect(201);
      const firstArticle = first.body as Article;

      const updated = await asAdmin('patch', `/articles/${firstArticle.id}`)
        .send({
          status: ArticleStatus.DRAFT,
        })
        .expect(200);
      const updatedArticle = updated.body as Article;

      expect(updatedArticle.status).toBe(ArticleStatus.DRAFT);
      expect(updatedArticle.publishedAt).toEqual(firstArticle.publishedAt);

      // no longer publicly reachable once unpublished
      await asPublic('get', `/articles/${firstArticle.slug}`).expect(404);
    });

    it('records slug history when a previously-published article changes title after being unpublished', async () => {
      const first = await asAdmin('post', '/articles')
        .send({
          title: 'unpublish and rename',
          body: 'hello',
          status: ArticleStatus.PUBLISHED,
        })
        .expect(201);
      const originalArticle = first.body as Article;

      await asAdmin('patch', `/articles/${originalArticle.id}`)
        .send({ status: ArticleStatus.DRAFT })
        .expect(200);
      await asAdmin('patch', `/articles/${originalArticle.id}`)
        .send({ title: 'renamed while unpublished' })
        .expect(200);

      const getArticleRes = await asAdmin(
        'get',
        `/articles/${originalArticle.slug}`,
      ).expect(200);
      const fetchedArticle = getArticleRes.body as Article;
      expect(fetchedArticle.id).toEqual(originalArticle.id);
      expect(fetchedArticle.slug).not.toEqual(originalArticle.slug);
    });

    it('throws 400 error when moving article from draft to archived', async () => {
      const first = await asAdmin('post', '/articles')
        .send({
          title: 'first article',
          body: 'hello',
          status: ArticleStatus.DRAFT,
        })
        .expect(201);
      const firstArticle = first.body as Article;
      await asAdmin('patch', `/articles/${firstArticle.id}`)
        .send({
          status: ArticleStatus.ARCHIVED,
        })
        .expect(400);
    });
  });

  describe('auth guard', () => {
    it('admin routes returns 401 without key', async () => {
      await asPublic('post', '/articles')
        .send({ title: 'hello', body: 'world' })
        .expect(401);
      await asPublic('patch', `/articles/${crypto.randomUUID()}`)
        .send({ title: 'hello', body: 'world' })
        .expect(401);
      await asPublic('delete', `/articles/${crypto.randomUUID()}`).expect(401);
      await asPublic('get', `/articles/id/${crypto.randomUUID()}`).expect(401);
    });

    it('DRAFT | ARCHIVED browse/search returns 401 without key', async () => {
      await asPublic('get', `/articles?status=DRAFT`).expect(401);
      await asPublic('get', `/articles?status=ARCHIVED`).expect(401);
      await asPublic(
        'get',
        `/articles/search?search=hello&status=DRAFT`,
      ).expect(401);
      await asPublic(
        'get',
        `/articles/search?search=hello&status=ARCHIVED`,
      ).expect(401);
    });

    it('DRAFT or ARCHIVED article detail returns 404 without key', async () => {
      const first = await asAdmin('post', '/articles')
        .send({
          title: 'title',
          body: 'body',
          status: ArticleStatus.DRAFT,
        })
        .expect(201);
      const second = await asAdmin('post', '/articles')
        .send({
          title: 'title',
          body: 'body',
          status: ArticleStatus.PUBLISHED,
        })
        .expect(201);

      const firstArticle = first.body as Article;
      const secondArticle = second.body as Article;

      await asAdmin('patch', `/articles/${secondArticle.id}`)
        .send({
          status: ArticleStatus.ARCHIVED,
        })
        .expect(200);

      await asPublic('get', `/articles/${firstArticle.slug}`).expect(404);
      await asPublic('get', `/articles/${secondArticle.slug}`).expect(404);
      await asPublic('get', `/articles?status=PUBLISHED`).expect(200);
    });

    it('PUBLISHED slug works without key', async () => {
      const first = await asAdmin('post', '/articles')
        .send({
          title: 'title',
          body: 'body',
          status: ArticleStatus.PUBLISHED,
        })
        .expect(201);

      const firstArticle = first.body as Article;
      await asPublic('get', `/articles/${firstArticle.slug}`).expect(200);
    });

    it('missing status throws 400 on browse/search articles', async () => {
      await asPublic('get', '/articles').expect(400);
      await asPublic('get', '/articles/search').expect(400);
    });

    it('PUBLISHED status returns 200 on browse/search articles', async () => {
      await asPublic('get', '/articles?status=PUBLISHED').expect(200);
      await asPublic(
        'get',
        '/articles/search?search=banana&status=PUBLISHED',
      ).expect(200);
    });

    it('wrong key is treated as unauthenticated on admin routes', async () => {
      await asPublic('post', '/articles')
        .set({ Authorization: 'ApiKey wrong' })
        .send({
          title: 'title',
          body: 'body',
          status: ArticleStatus.DRAFT,
        })
        .expect(401);
      await asPublic('patch', `/articles/${crypto.randomUUID()}`)
        .set({ Authorization: 'ApiKey wrong' })
        .send({
          status: ArticleStatus.PUBLISHED,
        })
        .expect(401);
      await asPublic('delete', `/articles/${crypto.randomUUID()}`)
        .set({ Authorization: 'ApiKey wrong' })
        .expect(401);
    });
  });
});
