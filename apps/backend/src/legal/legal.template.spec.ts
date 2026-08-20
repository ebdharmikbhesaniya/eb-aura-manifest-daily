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

  /**
   * Support is instructions, not a policy. Printing "Effective <date>" there
   * would invite the reader to wonder which version they are looking at.
   */
  it('omits the effective-date line entirely when the document has no date', () => {
    const { effectiveDate: _omitted, ...undated } = doc;
    const html = renderLegalPage(undated);

    expect(html).not.toContain('class="meta"');
    expect(html).not.toContain('Effective');
    // The rest of the page still renders.
    expect(html).toContain('<h1>Privacy Policy</h1>');
    expect(html).toContain('An intro paragraph.');
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
