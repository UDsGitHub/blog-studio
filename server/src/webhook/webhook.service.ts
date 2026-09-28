import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookPayload } from './webhook.types';
import { HttpClient } from '@nestjs/http-client';
import { createHmac } from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async notify(payload: WebhookPayload) {
    const webhookUrls = this.getWebhookUrls();
    if (webhookUrls.length === 0) {
      return;
    }

    const body = JSON.stringify(payload);
    const signature = this.sign(body);
    if (!signature) {
      this.logger.warn('WEBHOOK_URLS set but WEBHOOK_SECRET not set: skipping');
      return;
    }

    for (const url of webhookUrls) {
      try {
        await this.httpClient.post(url, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
          },
          body,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to notify ${url} of event<${payload.event}>`,
          error,
        );
      }
    }
  }

  private getWebhookUrls() {
    const urls = this.configService.get<string>('WEBHOOK_URLS') ?? '';
    return urls
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
  }

  private sign(body: string) {
    const secret = this.configService.get<string>('WEBHOOK_SECRET');
    if (!secret) return '';

    return createHmac('sha256', secret).update(body).digest('hex');
  }
}
