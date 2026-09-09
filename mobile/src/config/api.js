import { Platform } from 'react-native';

const getDefaultApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
};

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultApiUrl();
export const ALLOW_MOCK_PAYMENT = process.env.EXPO_PUBLIC_ALLOW_MOCK_PAYMENT === 'true' || __DEV__;

const requestedPaymentProvider = (process.env.EXPO_PUBLIC_PAYMENT_PROVIDER || (ALLOW_MOCK_PAYMENT ? 'mock' : 'vnpay')).toLowerCase();

export const PAYMENT_PROVIDER = requestedPaymentProvider === 'mock' && !ALLOW_MOCK_PAYMENT
  ? 'vnpay'
  : requestedPaymentProvider;
