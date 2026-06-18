import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'ticket_booking_auth';

export const saveAuth = async (auth) => {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(auth));
};

export const loadAuth = async () => {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearAuth = async () => {
  await AsyncStorage.removeItem(AUTH_KEY);
};
