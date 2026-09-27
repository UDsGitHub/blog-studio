import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { MAX_REQUEST_BODY_BYTES } from './article/article.constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableShutdownHooks();
  app.enableCors({
    methods: ['GET', 'PATCH', 'POST', 'DELETE'],
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
  });
  app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback');
  app.use(helmet());
  app.useBodyParser('json', { limit: MAX_REQUEST_BODY_BYTES });

  const config = new DocumentBuilder()
    .setTitle('Article API')
    .setDescription('The headless article service')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api', app, documentFactory);
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
