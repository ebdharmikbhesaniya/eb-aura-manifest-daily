import { fireEvent, render, screen } from '@testing-library/react-native';

import { momentsCopy } from '@/copy/moments';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MotionProvider } from '@/theme/motion';

import { HomeScreen } from './HomeScreen';
import type { HomeMomentState } from './momentState';
import type { PlayableMoment } from './useMoments';

/**
 * Home states (Phase 7 test list: "RTL Home states").
 *
 * The assertion running through all of them is product 09 §9.1's rule: this
 * surface is never blank and never shows an error code. Even the failure branch
 * offers something to play and a way forward, in voice.
 */
describe('HomeScreen', () => {
  const moment = (overrides: Partial<PlayableMoment> = {}): PlayableMoment => ({
    id: 'moment-1',
    type: 'daily',
    status: 'ready',
    title: 'The Balcony',
    body: 'Morning light.',
    audioSource: 'file:///a.mp3',
    musicAudioSource: null,
    durationMs: 90_000,
    favoritedAt: null,
    refineOf: null,
    lines: [],
    ...overrides,
  });

  const renderHome = (
    state: HomeMomentState,
    props: Partial<React.ComponentProps<typeof HomeScreen>> = {},
  ) =>
    render(
      <ThemeProvider forceScheme="light">
        <MotionProvider>
          <HomeScreen
            name="Maya"
            state={state}
            forming={[]}
            recent={[]}
            onPlay={jest.fn()}
            onRetry={jest.fn()}
            onFavorite={jest.fn()}
            onManifest={jest.fn()}
            {...props}
          />
        </MotionProvider>
      </ThemeProvider>,
    );

  describe('the greeting', () => {
    it('uses her name', async () => {
      await renderHome({ kind: 'ready', moment: moment() });

      expect(screen.getByText(/Maya/)).toBeTruthy();
    });

    it('greets her anyway when there is no name', async () => {
      await renderHome({ kind: 'ready', moment: moment() }, { name: null });

      expect(screen.getByText(momentsCopy.home.anonymousGreeting)).toBeTruthy();
    });
  });

  describe('ready', () => {
    it('shows today’s moment by title', async () => {
      await renderHome({ kind: 'ready', moment: moment() });

      expect(screen.getByText('The Balcony')).toBeTruthy();
    });

    it('plays it on tap', async () => {
      const onPlay = jest.fn();
      await renderHome({ kind: 'ready', moment: moment() }, { onPlay });

      await fireEvent.press(screen.getByTestId('home-today'));

      expect(onPlay).toHaveBeenCalledWith('moment-1');
    });

    it('plays from the inline disc too (v4 action row)', async () => {
      const onPlay = jest.fn();
      await renderHome({ kind: 'ready', moment: moment() }, { onPlay });

      await fireEvent.press(screen.getByTestId('home-today-play'));

      expect(onPlay).toHaveBeenCalledWith('moment-1');
    });

    it('keeps the moment from the heart — it is a control, not an ornament', async () => {
      const onFavorite = jest.fn();
      await renderHome({ kind: 'ready', moment: moment() }, { onFavorite });

      await fireEvent.press(screen.getByTestId('home-today-favorite'));

      expect(onFavorite).toHaveBeenCalledWith('moment-1');
    });

    it('does not start playback when she only meant to keep it', async () => {
      const onPlay = jest.fn();
      await renderHome({ kind: 'ready', moment: moment() }, { onPlay });

      await fireEvent.press(screen.getByTestId('home-today-favorite'));

      expect(onPlay).not.toHaveBeenCalled();
    });

    it('says how long listening takes, rounded up', async () => {
      await renderHome({ kind: 'ready', moment: moment({ durationMs: 90_000 }) });

      expect(screen.getByText(momentsCopy.home.listenDuration.replace('{n}', '2'))).toBeTruthy();
    });

    it('falls back to a plain "Listen" when the duration is unknown', async () => {
      await renderHome({ kind: 'ready', moment: moment({ durationMs: null }) });

      expect(screen.getByText(momentsCopy.home.listen)).toBeTruthy();
    });
  });

  describe('forming — the fallback that makes an empty state unnecessary', () => {
    it('says so honestly', async () => {
      await renderHome({ kind: 'forming', fallback: moment() });

      expect(screen.getByText(momentsCopy.states.stillForming)).toBeTruthy();
    });

    it('offers yesterday’s to listen to meanwhile', async () => {
      await renderHome({ kind: 'forming', fallback: moment({ title: 'Yesterday’s' }) });

      expect(screen.getByTestId('home-fallback')).toBeTruthy();
      expect(screen.getByText(momentsCopy.states.replayOffer)).toBeTruthy();
    });

    it('shows no spinner — product 09 asks for orb and copy, not a loader', async () => {
      await renderHome({ kind: 'forming', fallback: moment() });

      expect(screen.queryByTestId('ActivityIndicator')).toBeNull();
    });
  });

  describe('failed', () => {
    it('speaks in voice rather than reporting a fault', async () => {
      await renderHome({ kind: 'failed', fallback: null });

      expect(screen.getByText(momentsCopy.states.didNotArrive)).toBeTruthy();
    });

    it('never shows an error code', async () => {
      await renderHome({ kind: 'failed', fallback: null });

      expect(screen.queryByText(/error|failed|\b[45]\d\d\b/i)).toBeNull();
    });

    it('offers a retry', async () => {
      const onRetry = jest.fn();
      await renderHome({ kind: 'failed', fallback: null }, { onRetry });

      await fireEvent.press(screen.getByTestId('home-retry'));

      expect(onRetry).toHaveBeenCalled();
    });

    it('still offers a previous moment when one exists', async () => {
      await renderHome({ kind: 'failed', fallback: moment() });

      expect(screen.getByTestId('home-fallback')).toBeTruthy();
    });
  });

  describe('first run', () => {
    it('says the first one is coming rather than showing a blank card', async () => {
      await renderHome({ kind: 'first_run' });

      expect(screen.getByTestId('home-first-run')).toBeTruthy();
      // A filled empty state, not a bare card: a warm serif line and a promise.
      expect(screen.getByText(momentsCopy.states.firstRunTitle)).toBeTruthy();
      expect(screen.getByText(momentsCopy.states.firstRunBody)).toBeTruthy();
    });
  });

  describe('the other rows', () => {
    it('shows what is being written next', async () => {
      await renderHome(
        { kind: 'ready', moment: moment() },
        { forming: [{ id: 'f1', title: 'A morning in Lisbon' }] },
      );

      expect(screen.getByTestId('home-forming')).toBeTruthy();
      expect(screen.getByText('A morning in Lisbon')).toBeTruthy();
    });

    it('hides the previews row entirely when there is nothing coming', async () => {
      await renderHome({ kind: 'ready', moment: moment() }, { forming: [] });

      expect(screen.queryByTestId('home-forming')).toBeNull();
    });

    it('lists recently played and replays on tap', async () => {
      const onPlay = jest.fn();
      await renderHome(
        { kind: 'ready', moment: moment() },
        { recent: [{ id: 'r1', title: 'The River' }], onPlay },
      );

      await fireEvent.press(screen.getByTestId('home-recent-r1'));

      expect(onPlay).toHaveBeenCalledWith('r1');
    });
  });

  describe('collections (v4)', () => {
    it('shows a card per collection that has something in it', async () => {
      await renderHome(
        { kind: 'ready', moment: moment() },
        { favoritesCount: 3, onDemandCount: 2 },
      );

      expect(screen.getByTestId('home-collections')).toBeTruthy();
      expect(screen.getByText(momentsCopy.collections.favorites)).toBeTruthy();
      expect(screen.getByText(momentsCopy.collections.ondemand)).toBeTruthy();
    });

    it('hides a collection that is empty', async () => {
      await renderHome(
        { kind: 'ready', moment: moment() },
        { favoritesCount: 1, onDemandCount: 0 },
      );

      expect(screen.queryByTestId('home-collection-ondemand')).toBeNull();
    });

    it('hides the whole section when both are empty', async () => {
      await renderHome(
        { kind: 'ready', moment: moment() },
        { favoritesCount: 0, onDemandCount: 0 },
      );

      expect(screen.queryByTestId('home-collections')).toBeNull();
    });

    it('opens the collection on tap', async () => {
      const onCollection = jest.fn();
      await renderHome(
        { kind: 'ready', moment: moment() },
        { favoritesCount: 3, onDemandCount: 0, onCollection },
      );

      await fireEvent.press(screen.getByTestId('home-collection-favorites'));

      expect(onCollection).toHaveBeenCalledWith('favorites');
    });
  });

  describe('Manifest entry', () => {
    it('sits on the Home surface, not in the tab bar (06 §6)', async () => {
      const onManifest = jest.fn();
      await renderHome({ kind: 'ready', moment: moment() }, { onManifest });

      await fireEvent.press(screen.getByTestId('home-manifest'));

      expect(onManifest).toHaveBeenCalled();
    });
  });
});
