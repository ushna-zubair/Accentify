/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Manan Anghan
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

import { Platform } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { db } from '../config/firebase';
import type { DevicePlatform } from '../models';

let _installId: string | null = null;

/** Call once at app startup to populate the async installation ID. */
export const initDeviceId = async (): Promise<void> => {
  try {
    if (Platform.OS === 'ios') {
      const id = await Application.getIosIdForVendorAsync();
      if (id) _installId = id;
    } else if (Platform.OS === 'android') {
      const id = Application.getAndroidId();
      if (id) _installId = id;
    }
  } catch {
    // Fallback handled by getDeviceId
  }
};

export const getDeviceId = (): string => {
  // Prefer the modern API value, fall back to deprecated Constants
  const installId = _installId ?? Constants.installationId ?? 'unknown';
  return `${Platform.OS}-${installId}`.replace(/[^a-zA-Z0-9-]/g, '');
};

export const getDeviceName = (): string => {
  const name = Constants.deviceName;
  if (name) return name;
  if (Platform.OS === 'ios') return 'iPhone';
  if (Platform.OS === 'android') return 'Android Device';
  return 'Web Browser';
};

export const getDevicePlatform = (): DevicePlatform => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
};

/**
 * Upsert the current device record under `users/{uid}/devices/{deviceId}`.
 * Safe to call repeatedly — uses `merge: true`.
 */
export const recordDeviceSession = async (uid: string): Promise<void> => {
  const deviceId = getDeviceId();
  const deviceRef = doc(db, 'users', uid, 'devices', deviceId);

  await setDoc(
    deviceRef,
    {
      deviceName: getDeviceName(),
      platform: getDevicePlatform(),
      lastActiveAt: serverTimestamp(),
      isCurrent: true,
    },
    { merge: true },
  );
};
