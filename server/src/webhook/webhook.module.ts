import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { HttpClientModule } from '@nestjs/http-client';

@Module({
  imports: [
    HttpClientModule.register({
      timeout: '5s',
      retry: { attempts: 3, methods: ['POST'] },
    }),
  ],
  exports: [WebhookService],
  providers: [WebhookService],
})
export class WebhookModule {}
