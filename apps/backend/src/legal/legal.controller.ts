import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';

import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../auth/public.decorator';
import { DELETION, PRIVACY, SUPPORT, TERMS } from './legal.content';
import { renderLegalPage } from './legal.template';

/**
 * The public legal pages. `VERSION_NEUTRAL` keeps them at `/privacy` and
 * `/terms` rather than under `/v1`; `@Public()` opts them out of the global
 * SupabaseAuthGuard so a browser with no session can read them (07 §4 style).
 *
 * `/support` rides along here rather than living somewhere of its own: App
 * Store Connect requires a Support URL, a reviewer opens it, and it is the same
 * static-HTML-for-an-anonymous-browser problem these three already solve.
 */
// Static HTML on a shared edge IP. These are the URLs a store reviewer opens,
// and a 429 there reads as a broken app.
@SkipThrottle()
@Controller({ version: VERSION_NEUTRAL })
export class LegalController {
  @Public()
  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy(): string {
    return renderLegalPage(PRIVACY);
  }

  @Public()
  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  terms(): string {
    return renderLegalPage(TERMS);
  }

  // The app stores' data-deletion requirement: a public URL a user (or a store
  // reviewer) can reach without signing in.
  @Public()
  @Get('delete-account')
  @Header('Content-Type', 'text/html; charset=utf-8')
  deleteAccount(): string {
    return renderLegalPage(DELETION);
  }

  // The Support URL submitted to App Store Connect. It is a required field, and
  // a reviewer who cannot load it is a rejection, so it gets the same
  // @Public()/@SkipThrottle treatment as the pages either side of it.
  @Public()
  @Get('support')
  @Header('Content-Type', 'text/html; charset=utf-8')
  support(): string {
    return renderLegalPage(SUPPORT);
  }
}
