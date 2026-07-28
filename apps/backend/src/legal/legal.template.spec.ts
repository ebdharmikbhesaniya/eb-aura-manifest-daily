import type { LegalDocument } from './legal.content';
import { renderLegalPage } from './legal.template';

const doc: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: '[EFFECTIVE DATE]',
  intro: ['An intro paragraph.'],
  sections: [{ heading: 'Information We Collect', body: ['We collect your email.'] }],
};

describe('renderLegalPage', () => {
  it('is a complete HTML document', () => {
    expect(renderLegalPage(doc).startsWith('<!doctype html>')).toBe(true);
  });

  it('renders the title, effective date, intro, and section content', () => {
    const html = renderLegalPage(doc);
    expect(html).toContain('<h1>Privacy Policy</h1>');
    expect(html).toContain('[EFFECTIVE DATE]');
    expect(html).toContain('An intro paragraph.');
    expect(html).toContain('<h2>Information We Collect</h2>');
    expect(html).toContain('We collect your email.');
  });

  it('escapes HTML in content so it cannot break the markup', () => {
    const html = renderLegalPage({
      ...doc,
      sections: [{ heading: 'A & B', body: ['x < y > z'] }],
    });
    expect(html).toContain('A &amp; B');
    expect(html).toContain('x &lt; y &gt; z');
  });
});
