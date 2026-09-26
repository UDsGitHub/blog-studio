import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TestingModule, Test } from '@nestjs/testing';
import request, { Test as STest } from 'supertest';
import { App, AllMethods } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ArticleStatus } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma.service';

const apiKey = process.env.API_KEY ?? 'blog_sk_test_e2e_key_not_for_prod';
const authHeader = { Authorization: `ApiKey ${apiKey}` };

describe('App Throttle (e2e)', () => {
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

  describe('no 429 below throttle limit', () => {
    it('no 429 on createArticle() below throttle limit', () => {
      for (let i = 1; i <= 100; i++) {
        asAdmin('post', '/articles')
          .send({
            title: `first article - ${i}`,
            body: 'hello world',
            status: ArticleStatus.DRAFT,
          })
          .expect(201);
      }
      asAdmin('post', '/articles')
        .send({
          title: `first article - 101`,
          body: 'hello world',
          status: ArticleStatus.DRAFT,
        })
        .expect(429);
    });

    it('no 429 on updateArticle() below throttle limit', () => {
      for (let i = 1; i <= 100; i++) {
        asAdmin('patch', `/articles/${crypto.randomUUID()}}`)
          .send({
            status: ArticleStatus.PUBLISHED,
          })
          .expect(404);
      }
      asAdmin('patch', `/articles/${crypto.randomUUID()}}`)
        .send({
          status: ArticleStatus.PUBLISHED,
        })
        .expect(429);
    });

    it('no 429 on removeArticle() below throttle limit', () => {
      for (let i = 1; i <= 100; i++) {
        asAdmin('delete', `/articles/${crypto.randomUUID()}}`).expect(404);
      }
      asAdmin('delete', `/articles/${crypto.randomUUID()}}`).expect(429);
    });

    it('no 429 on findById() below throttle limit', () => {
      for (let i = 1; i <= 100; i++) {
        asAdmin('get', `/articles/id/${crypto.randomUUID()}}`).expect(404);
      }
      asAdmin('get', `/articles/id/${crypto.randomUUID()}}`).expect(429);
    });

    it('no 429 on findBySlug() below throttle limit', () => {
      for (let i = 1; i <= 150; i++) {
        asPublic('get', `/articles/slug`).expect(404);
      }
      asPublic('get', `/articles/slug`).expect(429);
    });

    it('no 429 on browseArticles() below throttle limit', () => {
      for (let i = 1; i <= 150; i++) {
        asPublic('get', `/articles?status=PUBLISHED`).expect(200);
      }
      asPublic('get', `/articles?status=PUBLISHED`).expect(429);
    });

    it('no 429 on searchArticles() below throttle limit', () => {
      for (let i = 1; i <= 150; i++) {
        asPublic('get', `/articles?status=PUBLISHED&search=hello`).expect(200);
      }
      asPublic('get', `/articles?status=PUBLISHED&search=hello`).expect(429);
    });
  });
});
