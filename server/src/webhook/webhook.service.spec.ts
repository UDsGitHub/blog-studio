import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '@nestjs/http-client';
import { createHmac } from 'crypto';

describe('WebhookService', () => {
  let service: WebhookService;
  const httpClient = {
    post: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: ConfigService, useValue: configService },
        { provide: HttpClient, useValue: httpClient },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    warnSpy = jest
      .spyOn(service['logger'], 'warn')
      .mockImplementation(() => undefined);
  });

  it('skips quietly on empty urls', async () => {
    configService.get.mockReturnValue('');

    await service.notify({
      event: 'published',
      id: 'id',
      slug: 'slug',
      timestamp: new Date().toISOString(),
    });

    expect(warnSpy).not.toHaveBeenCalled();
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it('log and skip on empty secret', async () => {
    configService.get.mockReturnValueOnce('http://someurl.com');
    configService.get.mockReturnValueOnce('');

    await service.notify({
      event: 'published',
      id: 'id',
      slug: 'slug',
      timestamp: new Date().toISOString(),
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'WEBHOOK_URLS set but WEBHOOK_SECRET not set: skipping',
    );
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it('called with valid sha256 signature', async () => {
    const expectedPayload = {
      event: 'published' as const,
      id: 'id',
      slug: 'slug',
      timestamp: new Date().toISOString(),
    };
    const body = JSON.stringify(expectedPayload);
    const urls = ['http://url.a', 'http://url.b'];
    const secret = 'secret';
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    configService.get.mockReturnValueOnce(urls.join(','));
    configService.get.mockReturnValueOnce(secret);

    await service.notify(expectedPayload);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(httpClient.post).toHaveBeenCalledTimes(2);
    expect(httpClient.post).toHaveBeenNthCalledWith(1, urls[0], {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body,
    });
    expect(httpClient.post).toHaveBeenNthCalledWith(2, urls[1], {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body,
    });
  });

  it('log warning if http client throws error', async () => {
    const expectedPayload = {
      event: 'published' as const,
      id: 'id',
      slug: 'slug',
      timestamp: new Date().toISOString(),
    };
    const body = JSON.stringify(expectedPayload);
    const urls = ['http://url.a', 'http://url.b'];
    const secret = 'secret';
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    configService.get.mockReturnValueOnce(urls.join(','));
    configService.get.mockReturnValueOnce(secret);
    httpClient.post.mockRejectedValueOnce(
      new Error('Something went wrong with http-client request'),
    );

    await service.notify(expectedPayload);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      `Failed to notify ${urls[0]} of event<${expectedPayload.event}>`,
      new Error('Something went wrong with http-client request'),
    );
    expect(httpClient.post).toHaveBeenCalledTimes(2);
    expect(httpClient.post).toHaveBeenNthCalledWith(1, urls[0], {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body,
    });
    expect(httpClient.post).toHaveBeenNthCalledWith(2, urls[1], {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body,
    });
  });
});
