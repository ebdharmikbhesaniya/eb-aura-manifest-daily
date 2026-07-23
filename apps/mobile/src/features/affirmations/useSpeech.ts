import * as Sentry from '@sentry/react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reading an affirmation aloud (v4 §affirmations "Hear it read").
 *
 * This is the DEVICE voice, not Aura's. Affirmations are text-only at V1 —
 * 10 §7 cut their TTS as a cost lever — and on-device speech is the one way to
 * honour v4's button without a per-card vendor bill or an audio column. It is
 * deliberately not used for moments or the Letter: those ARE Aura's voice, and
 * a system reader standing in for her there would break the whole premise.
 *
 * Rate is below default on purpose. The product's register is unhurried, and a
 * stock reader at full speed makes a line she is meant to sit with sound like a
 * notification being announced.
 */
const RATE = 0.88;
const PITCH = 1.0;

interface SpeechModule {
  speak: (text: string, options?: Record<string, unknown>) => void;
  stop: () => void;
}

/**
 * `expo-speech` resolved at call time, never at import.
 *
 * It is a native module, so a dev client built before it was added throws the
 * moment this module is evaluated — which would take the whole Affirmations
 * screen down rather than just this one button. Requiring it lazily keeps the
 * failure contained to the tap that needs it.
 */
function loadSpeech(): SpeechModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-speech') as SpeechModule;
  } catch {
    return null;
  }
}

export interface Speech2 {
  speaking: boolean;
  /** Starts reading, or stops if this is already the line being read. */
  toggle: (text: string) => void;
  stop: () => void;
}

export function useSpeech(): Speech2 {
  const [speaking, setSpeaking] = useState(false);
  // Survives unmount so the cleanup below cannot read stale state.
  const active = useRef(false);

  const stop = useCallback(() => {
    active.current = false;
    setSpeaking(false);
    try {
      loadSpeech()?.stop();
    } catch {
      // Nothing was speaking, or the module is absent — either way, stopped.
    }
  }, []);

  // A voice must never outlive the screen that started it: leaving the tab with
  // a line half-read would keep talking over whatever she opened next.
  useEffect(() => {
    return () => {
      active.current = false;
      try {
        loadSpeech()?.stop();
      } catch {
        /* nothing to stop */
      }
    };
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (active.current) {
        stop();
        return;
      }

      const settle = () => {
        active.current = false;
        setSpeaking(false);
      };

      const speech = loadSpeech();
      if (!speech) {
        // Built without the native module. Not worth reporting on every tap —
        // the build is simply older than the feature.
        return;
      }

      try {
        active.current = true;
        setSpeaking(true);
        speech.speak(text, {
          rate: RATE,
          pitch: PITCH,
          onDone: settle,
          onStopped: settle,
          onError: settle,
        });
      } catch (error) {
        // Present but unhappy — a real fault worth seeing, unlike a build that
        // simply predates the module.
        Sentry.captureException(error);
        settle();
      }
    },
    [stop],
  );

  return { speaking, toggle, stop };
}
