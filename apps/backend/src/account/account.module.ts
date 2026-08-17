import { Module } from '@nestjs/common';

import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  controllers: [AccountController],
  providers: [AccountService],
  // The scheduler's anon-sweep deletes through this same service rather than
  // calling the auth admin API itself — Storage has no cascade, so there is
  // exactly one correct deletion path (see AccountService's header).
  exports: [AccountService],
})
export class AccountModule {}
