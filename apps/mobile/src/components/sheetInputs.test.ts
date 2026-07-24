import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every field inside a `Sheet` must be `<Input inSheet />`.
 *
 * `@gorhom/bottom-sheet` learns that the sheet has to rise by tracking focus
 * through its OWN `BottomSheetTextInput`. A plain `TextInput` gives it nothing
 * to track, so the keyboard opens over the sheet and the field she was asked to
 * fill in disappears behind it — silently, and only on device.
 *
 * Every input flow in this app lives in a sheet (product 12 §bottom sheets), so
 * this is the common case and the easy one to forget when adding the next one.
 * A rendering test per sheet would not catch it either: the tree looks correct
 * in jsdom whichever component is used. Hence a source-level invariant.
 */
const featuresDir = join(__dirname, '..', 'features');

function tsxFilesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return tsxFilesUnder(full);
    return entry.endsWith('.tsx') && !entry.includes('.test.') ? [full] : [];
  });
}

/** Files that render the design-system `Sheet` and put an `Input` inside it. */
const sheetsWithInputs = tsxFilesUnder(featuresDir)
  .map((file) => ({ file, source: readFileSync(file, 'utf8') }))
  .filter(({ source }) => source.includes('<Sheet ') && source.includes('<Input'));

describe('inputs inside bottom sheets', () => {
  it('finds the sheets to check, so this suite cannot pass by scanning nothing', () => {
    expect(sheetsWithInputs.length).toBeGreaterThanOrEqual(6);
  });

  it.each(sheetsWithInputs.map(({ file, source }) => [file.split('/').pop(), source]))(
    '%s marks every Input as inSheet',
    (_name, source) => {
      const inputs = (source as string).match(/<Input\b/g) ?? [];
      const marked = (source as string).match(/\binSheet\b/g) ?? [];

      expect(marked.length).toBe(inputs.length);
    },
  );
});
