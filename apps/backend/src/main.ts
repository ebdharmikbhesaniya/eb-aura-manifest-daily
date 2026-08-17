import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import type { Env } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  // One hop of proxy is trusted, so `req.ip` is the CLIENT rather than the
  // platform's edge. The throttler falls back to the address for
  // unauthenticated routes, and without this every such caller shares one
  // bucket — meaning one abusive client rate-limits everybody. Exactly one hop:
  // trusting the whole chain would let a caller forge `X-Forwarded-For` and
  // mint a fresh bucket per request.
  app.set('trust proxy', 1);

  // Path versioning (07 §6): every route is /v1/*.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // No browser client exists — mobile isn't subject to CORS. Leaving it disabled
  // keeps the surface honest; revisit only if a web surface ever ships.

  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true });

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
