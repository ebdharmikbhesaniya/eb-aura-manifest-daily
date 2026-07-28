import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';

import { Public } from '../auth/public.decorator';
import { DELETION, PRIVACY, TERMS } from './legal.content';
import { renderLegalPage } from './legal.template';

/**
 * The public legal pages. `VERSION_NEUTRAL` keeps them at `/privacy` and
 * `/terms` rather than under `/v1`; `@Public()` opts them out of the global
 * SupabaseAuthGuard so a browser with no session can read them (07 §4 style).
 */
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
}
