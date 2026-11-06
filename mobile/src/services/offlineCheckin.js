import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { sha256 } from 'js-sha256';

const MANIFEST_KEY = 'ticketstage_checkin_manifest';
const VERIFICATION_KEY = 'ticketstage_checkin_manifest_key';
const QUEUE_KEY = 'ticketstage_checkin_queue';
const DEVICE_KEY = 'ticketstage_checkin_device_id';

const readJson = async (key, fallback) => {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
};

const getSecret = async () => {
  if (Platform.OS === 'web') {
    return null;
  }

  return SecureStore.getItemAsync(VERIFICATION_KEY);
};

const setSecret = async (value) => {
  if (Platform.OS === 'web') {
    throw new Error('Secure offline check-in is available only in the native mobile app.');
  }

  return SecureStore.setItemAsync(VERIFICATION_KEY, value);
};

const newLocalId = () => {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getCheckInDeviceId = async () => {
  let deviceId = await AsyncStorage.getItem(DEVICE_KEY);

  if (!deviceId) {
    deviceId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_KEY, deviceId);
  }

  return deviceId;
};

export const saveOfflineManifest = async ({ manifest, signature, verificationKey }) => {
  const expected = sha256.hmac(verificationKey, JSON.stringify(manifest));

  if (expected !== signature) {
    throw new Error('The downloaded offline manifest signature is invalid.');
  }

  await setSecret(verificationKey);
  await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify({ manifest, signature }));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  return manifest;
};

export const loadOfflineManifest = async () => {
  const bundle = await readJson(MANIFEST_KEY, null);
  const verificationKey = await getSecret();

  if (!bundle || !verificationKey) {
    return null;
  }

  const expected = sha256.hmac(verificationKey, JSON.stringify(bundle.manifest));
  if (expected !== bundle.signature) {
    throw new Error('The local offline manifest was changed or corrupted. Download it again.');
  }

  return bundle.manifest;
};

export const getOfflineQueue = () => readJson(QUEUE_KEY, []);

export const getOfflineCheckInState = async () => {
  const [manifest, queue] = await Promise.all([
    loadOfflineManifest(),
    getOfflineQueue()
  ]);

  return { manifest, queue };
};

export const queueOfflineCheckIn = async ({ code, method, gate }) => {
  const [manifest, queue] = await Promise.all([
    loadOfflineManifest(),
    getOfflineQueue()
  ]);

  if (!manifest) {
    throw new Error('Download an offline manifest before checking in without a network.');
  }

  if (Date.parse(manifest.expiresAt) <= Date.now()) {
    throw new Error('The offline manifest has expired. Connect to the network and download it again.');
  }

  const normalizedCode = String(code || '').trim();
  const candidateDigests = new Set([
    sha256(normalizedCode),
    sha256(normalizedCode.toUpperCase())
  ]);
  const entry = manifest.entries.find((item) => {
    return item.digests.some((digest) => candidateDigests.has(digest));
  });

  if (!entry) {
    throw new Error('This ticket is not present in the trusted offline manifest.');
  }

  if (entry.status !== 'issued') {
    throw new Error('This ticket was already used or invalid when the manifest was downloaded.');
  }

  if (queue.some((item) => item.passId === entry.passId)) {
    throw new Error('This ticket is already in the offline synchronization queue.');
  }

  const queuedItem = {
    localId: newLocalId(),
    eventId: manifest.eventId,
    passId: entry.passId,
    passCode: entry.passCode,
    code: normalizedCode,
    method,
    gate,
    scannedAt: new Date().toISOString()
  };

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, queuedItem]));

  return {
    valid: true,
    reason: 'Ticket accepted offline and queued for server synchronization.',
    offline: true,
    pass: {
      id: entry.passId,
      passCode: entry.passCode,
      status: 'checked_in',
      ticketSnapshot: {
        ticketName: entry.ticketName,
        eventName: entry.eventName
      },
      seat: { code: entry.seatCode }
    }
  };
};

export const removeSynchronizedScans = async (results = []) => {
  const completedIds = new Set(
    results
      .filter((item) => ['accepted', 'conflict', 'rejected'].includes(item.status))
      .map((item) => item.localId)
  );
  const queue = await getOfflineQueue();
  const pending = queue.filter((item) => !completedIds.has(item.localId));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(pending));
  return pending;
};
