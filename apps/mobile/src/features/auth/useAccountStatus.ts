import { useEffect, useState } from 'react';

import { appleAuthAvailable } from '@/features/paywall/claim';

import { isAccountClaimed } from './session';

export interface AccountStatus {
  /** Undefined until the check resolves — callers must not guess meanwhile. */
  claimed: boolean | undefined;
  appleAvailable: boolean;
}

/**
 * Whether this account has a way back into it, and whether Apple can offer one.
 *
 * `claimed` starts UNDEFINED rather than false. The two values drive a
 * destructive decision (03 §2.2): rendering "Sign out — you can sign back in
 * any time" for a frame, against an account that has no such route, is a
 * promise the app cannot keep. Callers hold the row until this settles.
 */
export function useAccountStatus(): AccountStatus {
  const [claimed, setClaimed] = useState<boolean | undefined>(undefined);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let active = true;

    void isAccountClaimed().then((value) => {
      if (active) setClaimed(value);
    });
    void appleAuthAvailable().then((value) => {
      if (active) setAppleAvailable(value);
    });

    return () => {
      active = false;
    };
  }, []);

  return { claimed, appleAvailable };
}
