import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { AnalyticsService } from '../analytics/analytics.service';

/**
 * Global exception filter → PostHog Error Tracking (13 §monitoring, the Sentry
 * replacement).
 *
 * Reports ONLY the unexpected: 5xx and anything that isn't a handled
 * `HttpException`. Expected 4xx (validation, auth, entitlement — the app's
 * normal envelope, 07 §5) are the contract working as designed and would just be
 * noise. The response body is left byte-for-byte as before; `exception.message`
 * is never leaked to the client on a 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly analytics: AnalyticsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const req = ctx.getRequest<{ user?: { id?: string }; userId?: string }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      const userId = req?.user?.id ?? req?.userId;
      this.analytics.captureException(userId, exception);
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, error: 'Internal Server Error' };

    res.status(status).json(body);
  }
}
