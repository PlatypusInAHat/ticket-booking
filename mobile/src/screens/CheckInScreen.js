import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import Screen from '../components/Screen';
import { checkinApi } from '../services/api';
import { isNfcRuntimeAvailable, readNfcText } from '../services/nfc';
import { colors } from '../theme';
import { getLabel, passStatusLabels } from '../utils/labels';

export default function CheckInScreen() {
  const [scanCode, setScanCode] = useState('');
  const [gate, setGate] = useState('Cổng A');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const submit = async (mode) => {
    if (!scanCode.trim()) {
      Alert.alert('Thiếu mã vé', 'Vui lòng nhập hoặc quét mã vé.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        code: scanCode.trim(),
        method: scanCode.startsWith('TICKETBOOKING:') ? 'qr' : 'barcode',
        gate,
        deviceId: 'mobile-checkin-app'
      };
      const data = mode === 'validate'
        ? await checkinApi.validate(payload)
        : await checkinApi.checkIn(payload);
      setResult(data);
    } catch (error) {
      setResult({ valid: false, reason: error.message });
    } finally {
      setLoading(false);
    }
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const nextPermission = await requestPermission();
      if (!nextPermission.granted) {
        Alert.alert('Chưa có quyền camera', 'App cần camera để quét QR hoặc barcode.');
        return;
      }
    }

    setScannerOpen(true);
  };

  const readNfc = async () => {
    try {
      const value = await readNfcText();
      setScanCode(value);
    } catch (error) {
      Alert.alert('Không đọc được NFC', error.message);
    }
  };

  return (
    <Screen title="Check-in" subtitle="Dành cho nhân viên và quản trị viên tại cổng.">
      <Card>
        <Field
          label="Mã QR / barcode / NFC payload"
          value={scanCode}
          onChangeText={setScanCode}
          placeholder="TICKETBOOKING:..."
          autoCapitalize="none"
        />
        <Field
          label="Cổng check-in"
          value={gate}
          onChangeText={setGate}
          placeholder="Cổng A"
        />

        <View style={styles.actionRow}>
          <Button title="Quét camera" variant="secondary" onPress={openScanner} style={styles.flexButton} />
          <Button title="Đọc NFC" variant="secondary" onPress={readNfc} disabled={!isNfcRuntimeAvailable()} style={styles.flexButton} />
        </View>
        <View style={styles.actionRow}>
          <Button title="Kiểm tra" variant="secondary" onPress={() => submit('validate')} loading={loading} style={styles.flexButton} />
          <Button title="Check-in" onPress={() => submit('checkin')} loading={loading} style={styles.flexButton} />
        </View>
      </Card>

      {result ? (
        <Card style={styles.resultCard}>
          <Text style={[styles.title, result.valid ? styles.successText : styles.errorText]}>
            {result.valid ? 'Vé hợp lệ' : 'Vé không hợp lệ'}
          </Text>
          <Text style={styles.muted}>{result.reason}</Text>
          {result.pass ? (
            <>
              <Text style={styles.sectionTitle}>{result.pass.passCode}</Text>
              <Text style={styles.muted}>{result.pass.ticket?.eventName}</Text>
              <Text style={styles.muted}>Trạng thái: {getLabel(passStatusLabels, result.pass.status)}</Text>
            </>
          ) : null}
        </Card>
      ) : null}

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'pdf417']
            }}
            onBarcodeScanned={({ data }) => {
              setScanCode(data);
              setScannerOpen(false);
            }}
          />
          <View style={styles.cameraFooter}>
            <Button title="Đóng máy quét" variant="secondary" onPress={() => setScannerOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12
  },
  camera: {
    flex: 1
  },
  cameraFooter: {
    backgroundColor: colors.background,
    padding: 16
  },
  cameraWrap: {
    backgroundColor: '#000',
    flex: 1
  },
  errorText: {
    color: colors.red
  },
  flexButton: {
    flex: 1
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6
  },
  resultCard: {
    marginTop: 14
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 16
  },
  successText: {
    color: colors.green
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24
  }
});
