import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Radio, X } from 'lucide-react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { getAuthHeaders, imageUrl } from '../services/api';
import {
  clearHostCardPayload,
  isHostCardEmulationAvailable,
  setHostCardPayload
} from '../services/nfc';
import { colors, radius } from '../theme';
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
      <View style={styles.modalWrap}>
        <Screen
          title="Vé điện tử"
          subtitle={booking ? `Đơn ${booking.bookingNumber}` : ''}
          right={<Button title="Đóng" icon={X} variant="ghost" onPress={onClose} style={styles.closeBtn} />}
        >
          {passes?.length ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.passSelector} contentContainerStyle={styles.passSelectorContent}>
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
                <Card style={styles.passCard}>
                  <Text style={styles.title}>{selectedPass.ticket?.eventName}</Text>
                  <Text style={styles.muted}>{selectedPass.passCode}</Text>
                  <Text style={styles.badge}>{getLabel(passStatusLabels, selectedPass.status)}</Text>

                  <View style={styles.qrContainer}>
                    <Image
                      source={createImageSource(imageUrl(`/bookings/${booking._id}/passes/${selectedPass.id}/qr.png`))}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.barcodeContainer}>
                    <Image
                      source={createImageSource(imageUrl(`/bookings/${booking._id}/passes/${selectedPass.id}/barcode.png`))}
                      style={styles.barcodeImage}
                      resizeMode="contain"
                    />
                  </View>

                  <Text style={styles.sectionTitle}>NFC payload</Text>
                  <Text style={styles.payloadText}>{selectedPass.nfcPayload || 'Chưa tải được payload'}</Text>
                  
                  <View style={styles.actionsGrid}>
                    <Button title="Copy Payload" icon={Copy} variant="secondary" onPress={copyPayload} style={styles.flexButton} />
                  </View>
                  
                  {isHostCardEmulationAvailable() ? (
                    <View style={styles.nfcSection}>
                      <Button title="Bật NFC" icon={Radio} onPress={enableNfcForPass} />
                      {activeNfcPassCode ? (
                        <View style={styles.nfcActiveBox}>
                          <Text style={styles.nfcActiveText}>Đang phát NFC: {activeNfcPassCode}</Text>
                          <Button title="Tắt NFC" variant="danger" onPress={disableNfc} style={styles.spacedTop} />
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.helperText}>
                      Phát vé qua NFC cần Android development build có HCE. Expo Go chỉ hỗ trợ hiển thị/copy payload.
                    </Text>
                  )}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrap: {
    flex: 1,
    backgroundColor: colors.background
  },
  closeBtn: {
    paddingHorizontal: 8,
    minHeight: 40
  },
  passCard: {
    marginBottom: 40
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  qrContainer: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 24,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8
  },
  qrImage: {
    height: 220,
    width: 220
  },
  barcodeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: 16,
    marginTop: 16,
    alignItems: 'center'
  },
  barcodeImage: {
    height: 90,
    width: '100%'
  },
  helperText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    textAlign: 'center'
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6
  },
  nfcSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16
  },
  nfcActiveBox: {
    marginTop: 16,
    backgroundColor: colorMix(colors.green, 0.1),
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.green
  },
  nfcActiveText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center'
  },
  passPill: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  passPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  passPillText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800'
  },
  passPillTextActive: {
    color: colors.accentForeground
  },
  passSelector: {
    marginBottom: 16
  },
  passSelectorContent: {
    paddingBottom: 8
  },
  payloadText: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 12,
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 24
  },
  actionsGrid: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12
  },
  flexButton: {
    flex: 1
  },
  spacedTop: {
    marginTop: 12
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    letterSpacing: -0.5
  }
});

function colorMix(hex, opacity) {
  // simple mock for background color mix
  return hex; // In React Native we can just use the color directly or add an opacity suffix to hex.
}
