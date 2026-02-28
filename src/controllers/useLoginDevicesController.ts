/**
 * useLoginDevicesController – Manages login-device sessions stored in Firestore.
 *
 * Firestore path:  users/{uid}/devices/{deviceId}
 *
 * Each document contains:
 *   deviceName, platform, lastActiveAt, ipAddress, location, isCurrent
 *
 * On each app launch the current device record is upserted (via recordCurrentDevice).
 * Users can revoke (delete) any non-current session.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import Constants from 'expo-constants';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import type { LoginDevice, DevicePlatform } from '../models';

// ─── Helpers ───

/** Generate a stable-ish device id based on platform + installationId */
const getDeviceId = (): string => {
  const installId = Constants.installationId ?? 'unknown';
  return `${Platform.OS}-${installId}`.replace(/[^a-zA-Z0-9-]/g, '');
};

/** Derive a human-readable device name */
const getDeviceName = (): string => {
  const deviceName = Constants.deviceName; // e.g. "Mubashir's iPhone"
  if (deviceName) return deviceName;

  // Fallback
  if (Platform.OS === 'ios') return 'iPhone';
  if (Platform.OS === 'android') return 'Android Device';
  return 'Web Browser';
};

const getDevicePlatform = (): DevicePlatform => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
};

/** Format ISO string or Firestore Timestamp into "Feb 28, 2026 · 3:42 PM" */
const formatDate = (raw: string | Timestamp | undefined): string => {
  if (!raw) return 'Unknown';
  const date = typeof raw === 'string' ? new Date(raw) : raw.toDate();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) +
    ' · ' +
    date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
};

// ─── Hook ───

export const useLoginDevicesController = () => {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<LoginDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null); // deviceId being revoked

  const currentDeviceId = getDeviceId();

  // ── Fetch all device sessions ──
  const fetchDevices = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const devicesRef = collection(db, 'users', currentUser.uid, 'devices');
      const q = query(devicesRef, orderBy('lastActiveAt', 'desc'));
      const snap = await getDocs(q);

      const list: LoginDevice[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          deviceName: data.deviceName ?? 'Unknown Device',
          platform: data.platform ?? 'web',
          lastActiveAt: formatDate(data.lastActiveAt),
          ipAddress: data.ipAddress ?? undefined,
          location: data.location ?? undefined,
          isCurrent: d.id === currentDeviceId,
        };
      });

      // Always show the current device first
      list.sort((a, b) => (a.isCurrent ? -1 : b.isCurrent ? 1 : 0));

      setDevices(list);
    } catch (e: any) {
      console.error('[LoginDevices] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentDeviceId]);

  // ── Record / upsert the current device ──
  const recordCurrentDevice = useCallback(async () => {
    if (!currentUser) return;

    try {
      const deviceRef = doc(db, 'users', currentUser.uid, 'devices', currentDeviceId);
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
    } catch (e: any) {
      // Silently fail — not critical
      console.warn('[LoginDevices] Failed to record device:', e.message);
    }
  }, [currentUser, currentDeviceId]);

  // ── Revoke (delete) a non-current device session ──
  const revokeDevice = useCallback(
    (deviceId: string) => {
      if (!currentUser) return;

      const device = devices.find((d) => d.id === deviceId);
      if (!device) return;

      if (device.isCurrent) {
        Alert.alert('Cannot Revoke', 'You cannot revoke the device you are currently using.');
        return;
      }

      Alert.alert(
        'Revoke Device',
        `Remove "${device.deviceName}" from your trusted devices? This will sign that session out.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Revoke',
            style: 'destructive',
            onPress: async () => {
              setRevoking(deviceId);
              try {
                await deleteDoc(doc(db, 'users', currentUser.uid, 'devices', deviceId));
                setDevices((prev) => prev.filter((d) => d.id !== deviceId));
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to revoke device.');
              } finally {
                setRevoking(null);
              }
            },
          },
        ],
      );
    },
    [currentUser, devices],
  );

  // ── Auto-record & fetch on mount ──
  useEffect(() => {
    (async () => {
      await recordCurrentDevice();
      await fetchDevices();
    })();
  }, [recordCurrentDevice, fetchDevices]);

  return {
    devices,
    loading,
    revoking,
    currentDeviceId,
    fetchDevices,
    revokeDevice,
  };
};
