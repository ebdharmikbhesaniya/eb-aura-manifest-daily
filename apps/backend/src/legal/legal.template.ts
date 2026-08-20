import type { LegalDocument } from './legal.content';

/** Defensive even though content is static — a stray `<` must never break markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2.5rem 1.25rem 4rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6; color: #2b2622; background: #faf6f0;
  }
  main { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 1.9rem; margin: 0 0 .25rem; }
  .meta { color: #8a7f74; margin: 0 0 2rem; font-size: .95rem; }
  h2 { font-size: 1.2rem; margin: 2rem 0 .5rem; }
  p { margin: 0 0 .85rem; }
  footer { margin-top: 3rem; color: #8a7f74; font-size: .85rem; }
`;

/** Renders a legal document into a self-contained, responsive HTML page. */
export function renderLegalPage(doc: LegalDocument): string {
  const intro = doc.intro.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const sections = doc.sections
    .map(
      (s) =>
        `<section><h2>${escapeHtml(s.heading)}</h2>` +
        s.body.map((p) => `<p>${escapeHtml(p)}</p>`).join('') +
        `</section>`,
    )
    .join('');

  // Only policies carry one; see `LegalDocument.effectiveDate`.
  const meta = doc.effectiveDate
    ? `<p class="meta">Effective ${escapeHtml(doc.effectiveDate)}</p>`
    : '';

  return (
    `<!doctype html><html lang="en"><head>` +
    `<meta charset="utf-8"/>` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"/>` +
    `<title>${escapeHtml(doc.title)} · Aura: Manifest Daily</title>` +
    `<style>${STYLE}</style></head><body><main>` +
    `<h1>${escapeHtml(doc.title)}</h1>` +
    meta +
    intro +
    sections +
    `<footer>Aura: Manifest Daily</footer>` +
    `</main></body></html>`
  );
}
