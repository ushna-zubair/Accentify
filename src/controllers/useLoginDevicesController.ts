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
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { getDeviceId, getDeviceName, getDevicePlatform } from '../services/deviceService';
import type { LoginDevice } from '../models';

const isWeb = Platform.OS === 'web';

/** Web-safe alert */
const webAlert = (title: string, message?: string) => {
  if (isWeb) {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

/** Web-safe confirm dialog */
const webConfirm = (title: string, message?: string): Promise<boolean> => {
  if (isWeb) {
    return Promise.resolve(window.confirm(message ? `${title}\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
};

// ─── Helpers ───

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
    } catch (e: unknown) {
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
    } catch (e: unknown) {
      // Silently fail — not critical
      console.warn('[LoginDevices] Failed to record device:', e instanceof Error ? e.message : String(e));
    }
  }, [currentUser, currentDeviceId]);

  // ── Revoke (delete) a non-current device session ──
  const revokeDevice = useCallback(
    async (deviceId: string) => {
      if (!currentUser) return;

      const device = devices.find((d) => d.id === deviceId);
      if (!device) return;

      if (device.isCurrent) {
        webAlert('Cannot Revoke', 'You cannot revoke the device you are currently using.');
        return;
      }

      const confirmed = await webConfirm(
        'Revoke Device',
        `Remove "${device.deviceName}" from your trusted devices? This will sign that session out.`,
      );
      if (!confirmed) return;

      setRevoking(deviceId);
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'devices', deviceId));
        setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      } catch (e: unknown) {
        webAlert('Error', e instanceof Error ? e.message : 'Failed to revoke device.');
      } finally {
        setRevoking(null);
      }
    },
    [currentUser, devices],
  );

  // ── Auto-record & fetch on mount ──
  useEffect(() => {
    let ignore = false;
    (async () => {
      await recordCurrentDevice();
      await fetchDevices();
    })();
    return () => { ignore = true; };
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
