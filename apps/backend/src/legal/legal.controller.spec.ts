import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { LegalController } from './legal.controller';

describe('LegalController', () => {
  let controller: LegalController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LegalController],
    }).compile();
    controller = moduleRef.get(LegalController);
  });

  it('serves the privacy policy as an HTML document', () => {
    const html = controller.privacy();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>Privacy Policy</h1>');
  });

  it('serves the terms of service as an HTML document', () => {
    const html = controller.terms();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>Terms of Service</h1>');
  });

  it('serves the account-deletion page as an HTML document', () => {
    const html = controller.deleteAccount();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>Delete Your Account</h1>');
  });

  it('exposes every route publicly so the browser needs no JWT', () => {
    const reflector = new Reflector();
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, controller.privacy)).toBe(true);
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, controller.terms)).toBe(true);
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, controller.deleteAccount)).toBe(true);
  });
});
