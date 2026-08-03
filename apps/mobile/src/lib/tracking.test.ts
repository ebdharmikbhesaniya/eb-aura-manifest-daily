import * as ATT from 'expo-tracking-transparency';
import { Platform } from 'react-native';

import { requestTrackingPermission } from './tracking';

const getPerms = ATT.getTrackingPermissionsAsync as jest.Mock;
const requestPerms = ATT.requestTrackingPermissionsAsync as jest.Mock;

describe('requestTrackingPermission', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests only when status is undetermined', async () => {
    Platform.OS = 'ios';
    getPerms.mockResolvedValueOnce({ status: 'undetermined' });
    await requestTrackingPermission();
    expect(requestPerms).toHaveBeenCalledTimes(1);
  });

  it('does not re-ask once already decided', async () => {
    Platform.OS = 'ios';
    getPerms.mockResolvedValueOnce({ status: 'denied' });
    await requestTrackingPermission();
    expect(requestPerms).not.toHaveBeenCalled();
  });

  it('is a no-op on Android', async () => {
    Platform.OS = 'android';
    await requestTrackingPermission();
    expect(getPerms).not.toHaveBeenCalled();
    expect(requestPerms).not.toHaveBeenCalled();
  });
});
