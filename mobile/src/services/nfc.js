import { NativeModules, Platform } from 'react-native';

let NfcManager = null;
let NfcTech = null;
let Ndef = null;

try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
  Ndef = nfc.Ndef;
} catch (error) {
  NfcManager = null;
}

const SELECT_TICKETBOOKING_AID = [
  0x00, 0xA4, 0x04, 0x00, 0x07, 0xF0, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x00
];

const decodeAsciiPayload = (bytes = []) => {
  const payloadBytes = bytes.slice(0, -2);
  return String.fromCharCode(...payloadBytes).trim();
};

export const isNfcRuntimeAvailable = () => Boolean(NfcManager);

export const isHostCardEmulationAvailable = () => {
  return Platform.OS === 'android' && Boolean(NativeModules.TicketNfcHost);
};

export const setHostCardPayload = async (payload) => {
  if (!isHostCardEmulationAvailable()) {
    throw new Error('Thiết bị hoặc bản build chưa hỗ trợ phát vé qua NFC.');
  }

  return NativeModules.TicketNfcHost.setPayload(payload);
};

export const clearHostCardPayload = async () => {
  if (!isHostCardEmulationAvailable()) {
    return false;
  }

  return NativeModules.TicketNfcHost.clearPayload();
};

export const getHostCardPayload = async () => {
  if (!isHostCardEmulationAvailable()) {
    return null;
  }

  return NativeModules.TicketNfcHost.getPayload();
};

const ensureNfcReady = async () => {
  if (!NfcManager) {
    throw new Error('NFC native chưa khả dụng. Hãy dùng development build.');
  }

  await NfcManager.start();
  const supported = await NfcManager.isSupported();
  const enabled = await NfcManager.isEnabled();

  if (!supported || !enabled) {
    throw new Error('Thiết bị chưa bật hoặc không hỗ trợ NFC.');
  }
};

const readNdefText = async () => {
  await NfcManager.requestTechnology(NfcTech.Ndef);
  const tag = await NfcManager.getTag();
  const record = tag?.ndefMessage?.[0];
  return record ? Ndef.text.decodePayload(record.payload) : '';
};

const readHostCardPayload = async () => {
  await NfcManager.requestTechnology(NfcTech.IsoDep);
  const response = await NfcManager.transceive(SELECT_TICKETBOOKING_AID);
  const status = response.slice(-2).map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();

  if (status !== '9000') {
    throw new Error('Không đọc được vé NFC từ thiết bị khách.');
  }

  return decodeAsciiPayload(response);
};

export const readNfcText = async () => {
  await ensureNfcReady();

  try {
    try {
      return await readNdefText();
    } catch (ndefError) {
      await NfcManager.cancelTechnologyRequest();
      return await readHostCardPayload();
    }
  } finally {
    await NfcManager.cancelTechnologyRequest();
  }
};
