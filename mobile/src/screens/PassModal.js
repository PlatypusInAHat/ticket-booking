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
      Alert.alert('No NFC payload', 'Refresh this booking and try again.');
      return;
    }

    await Clipboard.setStringAsync(selectedPass.nfcPayload);
    Alert.alert('Copied', 'NFC payload copied to clipboard.');
  };

  const enableNfcForPass = async () => {
    if (!selectedPass?.nfcPayload) {
      Alert.alert('No NFC payload', 'Refresh this booking and try again.');
      return;
    }

    try {
      await setHostCardPayload(selectedPass.nfcPayload);
      setActiveNfcPassCode(selectedPass.passCode);
      Alert.alert('NFC enabled', 'Keep this screen open and tap the phone to the NFC scanner at the gate.');
    } catch (error) {
      Alert.alert('Could not enable NFC', error.message);
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
          title="Mobile Passes"
          subtitle={booking ? `Booking ${booking.bookingNumber}` : ''}
          right={<Button title="Close" icon={X} variant="ghost" onPress={onClose} style={styles.closeBtn} />}
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
                  <Text style={styles.title}>{selectedPass.ticketSnapshot?.eventName || selectedPass.ticketSnapshot?.ticketName || 'Mobile ticket'}</Text>
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
                  <Text style={styles.payloadText}>{selectedPass.nfcPayload || 'Payload not loaded yet'}</Text>

                  <View style={styles.actionsGrid}>
                    <Button title="Copy payload" icon={Copy} variant="secondary" onPress={copyPayload} style={styles.flexButton} />
                  </View>

                  {isHostCardEmulationAvailable() ? (
                    <View style={styles.nfcSection}>
                      <Button title="Enable NFC pass" icon={Radio} onPress={enableNfcForPass} />
                      {activeNfcPassCode ? (
                        <View style={styles.nfcActiveBox}>
                          <Text style={styles.nfcActiveText}>NFC active: {activeNfcPassCode}</Text>
                          <Button title="Disable NFC" variant="danger" onPress={disableNfc} style={styles.spacedTop} />
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.helperText}>
                      NFC pass emulation requires an Android development build with HCE support. Expo Go can display and copy payloads only.
                    </Text>
                  )}
                </Card>
              ) : null}
            </>
          ) : (
            <Card>
              <Text style={styles.title}>No mobile passes</Text>
              <Text style={styles.muted}>This booking has not issued passes yet.</Text>
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
    backgroundColor: colors.surfaceMuted,
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
