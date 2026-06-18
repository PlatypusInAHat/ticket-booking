import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { getAuthHeaders, imageUrl } from '../services/api';
import {
  clearHostCardPayload,
  isHostCardEmulationAvailable,
  setHostCardPayload
} from '../services/nfc';
import { colors } from '../theme';
import { getLabel, passStatusLabels } from '../utils/labels';

const createImageSource = (uri) => ({
  uri,
  headers: getAuthHeaders()
});

export default function PassModal({ booking, passes, onClose }) {
  const [selectedPass, setSelectedPass] = useState(null);
  const [activeNfcPassCode, setActiveNfcPassCode] = useState('');

  useEffect(() => {
    setSelectedPass(passes?.[0] || null);
  }, [passes]);

  const copyPayload = async () => {
    if (!selectedPass?.nfcPayload) {
      Alert.alert('Chưa có NFC payload', 'Vui lòng tải lại vé điện tử.');
      return;
    }

    await Clipboard.setStringAsync(selectedPass.nfcPayload);
    Alert.alert('Đã sao chép', 'NFC payload đã được sao chép vào bộ nhớ tạm.');
  };

  const enableNfcForPass = async () => {
    if (!selectedPass?.nfcPayload) {
      Alert.alert('Chưa có NFC payload', 'Vui lòng tải lại vé điện tử.');
      return;
    }

    try {
      await setHostCardPayload(selectedPass.nfcPayload);
      setActiveNfcPassCode(selectedPass.passCode);
      Alert.alert('Đã bật NFC', 'Giữ màn hình này mở và chạm điện thoại vào máy quét NFC tại cổng.');
    } catch (error) {
      Alert.alert('Không bật được NFC', error.message);
    }
  };

  const disableNfc = async () => {
    await clearHostCardPayload();
    setActiveNfcPassCode('');
  };

  return (
    <Modal visible={Boolean(booking)} animationType="slide" onRequestClose={onClose}>
      <Screen
        title="Vé điện tử"
        subtitle={booking ? `Đơn ${booking.bookingNumber}` : ''}
        right={<Button title="Đóng" variant="secondary" onPress={onClose} />}
      >
        {passes?.length ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.passSelector}>
              {passes.map(pass => (
                <Pressable
                  key={pass.id}
                  onPress={() => setSelectedPass(pass)}
                  style={[styles.passPill, selectedPass?.id === pass.id && styles.passPillActive]}
                >
                  <Text style={[styles.passPillText, selectedPass?.id === pass.id && styles.passPillTextActive]}>
                    {pass.passCode}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {selectedPass ? (
              <Card>
                <Text style={styles.title}>{selectedPass.ticket?.eventName}</Text>
                <Text style={styles.muted}>{selectedPass.passCode}</Text>
                <Text style={styles.badge}>{getLabel(passStatusLabels, selectedPass.status)}</Text>

                <Image
                  source={createImageSource(imageUrl(`/bookings/${booking._id}/passes/${selectedPass.id}/qr.png`))}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Image
                  source={createImageSource(imageUrl(`/bookings/${booking._id}/passes/${selectedPass.id}/barcode.png`))}
                  style={styles.barcodeImage}
                  resizeMode="contain"
                />

                <Text style={styles.sectionTitle}>NFC payload</Text>
                <Text style={styles.payloadText}>{selectedPass.nfcPayload || 'Chưa tải được payload'}</Text>
                <Button title="Sao chép NFC payload" variant="secondary" onPress={copyPayload} style={styles.spacedTop} />
                {isHostCardEmulationAvailable() ? (
                  <>
                    <Button title="Bật NFC cho vé này" onPress={enableNfcForPass} style={styles.spacedTop} />
                    {activeNfcPassCode ? (
                      <>
                        <Text style={styles.nfcActiveText}>Đang phát NFC: {activeNfcPassCode}</Text>
                        <Button title="Tắt NFC" variant="secondary" onPress={disableNfc} style={styles.spacedTop} />
                      </>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.helperText}>
                    Phát vé qua NFC cần Android development build có HCE. Expo Go chỉ hỗ trợ hiển thị/copy payload.
                  </Text>
                )}
                <Text style={styles.helperText}>
                  Tap-to-check-in qua NFC cần development build và phần native HCE/đọc NFC trên thiết bị hỗ trợ.
                </Text>
              </Card>
            ) : null}
          </>
        ) : (
          <Card>
            <Text style={styles.title}>Chưa có vé điện tử</Text>
            <Text style={styles.muted}>Đơn này chưa phát hành pass.</Text>
          </Card>
        )}
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  barcodeImage: {
    backgroundColor: '#fff',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 118,
    marginTop: 14,
    width: '100%'
  },
  helperText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6
  },
  nfcActiveText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10
  },
  passPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  passPillActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal
  },
  passPillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  passPillTextActive: {
    color: '#fff'
  },
  passSelector: {
    marginBottom: 12
  },
  payloadText: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    color: colors.text,
    fontSize: 12,
    marginTop: 8,
    padding: 10
  },
  qrImage: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 260,
    marginTop: 16,
    width: 260
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 16
  },
  spacedTop: {
    marginTop: 14
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24
  }
});
