import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions, Platform } from 'react-native';

const STORAGE_KEY = 'ticketstage_device_id';

const randomId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getStableDeviceId = async () => {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextId = randomId();
  await AsyncStorage.setItem(STORAGE_KEY, nextId);
  return nextId;
};

const lightweightHash = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
};

export const getDeviceFingerprint = async () => {
  const window = Dimensions.get('window');
  const payload = [
    await getStableDeviceId(),
    Platform.OS,
    Platform.Version,
    `${window.width}x${window.height}x${window.scale}`
  ].join('|');

  return lightweightHash(payload);
};
