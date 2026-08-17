import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AccountModule } from './account/account.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { UserThrottlerGuard } from './common/user-throttler.guard';
import { AuthModule } from './auth/auth.module';
import { GenerationModule } from './generation/generation.module';
import { validateEnv, type Env } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { LegalModule } from './legal/legal.module';
import { buildLoggerConfig } from './observability/logger.config';
import { ProvidersModule } from './providers/providers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SupabaseModule } from './supabase/supabase.module';

/**
 * The thin backend's root (04 §1).
 *
 * Modules arriving in later phases: MemoryModule (4), GenerationModule +
 * SafetyModule (5), SchedulerModule + NotificationsModule (7/9),
 * AnalyticsModule (11). SubscriptionsModule (10) carries the RevenueCat
 * webhook and the entitlement guard.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Boot dies on a bad env rather than failing inside a user's generation (04 §6).
      validate: validateEnv,
      cache: true,
      envFilePath: ['.env.local', '.env'],
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: buildLoggerConfig({
          NODE_ENV: config.get('NODE_ENV', { infer: true }),
          isProduction: config.get('NODE_ENV', { infer: true }) === 'production',
        }),
      }),
    }),

    /**
     * Request throttling.
     *
     * There was none, and the endpoints that most needed it are the ones that
     * spend real money per call: `/v1/generation/*` runs an LLM and a TTS
     * synthesis, and `/refine` + `/manifest` run the crisis classifier — another
     * LLM call — BEFORE the entitlement and credit checks, so even a free user
     * who gets a 402 has already cost a request to a vendor.
     *
     * Two named lanes. `default` is a broad ceiling for everything; `generation`
     * is the tight one the generation controller opts into. Per-route limits
     * live on the handlers rather than here, so the cost of a route is visible
     * next to the route.
     */
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'default', ttl: 60_000, limit: 120 },
        { name: 'generation', ttl: 60_000, limit: 12 },
      ],
    }),

    SupabaseModule,
    AnalyticsModule,
    // Registers the global auth guard — deny by default, opt out with @Public().
    AuthModule,
    ProvidersModule,
    HealthModule,
    LegalModule,
    AccountModule,
    GenerationModule,
    SubscriptionsModule,
    NotificationsModule,
    SchedulerModule,
  ],
  providers: [
    // Global filter → PostHog Error Tracking for 5xx/uncaught (AnalyticsModule
    // is @Global, so AnalyticsService injects here).
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Throttling is global for the same reason auth is (see AuthModule): a new
    // endpoint that someone forgets to annotate should arrive limited, not
    // unlimited. Routes tighten it with @Throttle; none of them loosen it.
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule {}
