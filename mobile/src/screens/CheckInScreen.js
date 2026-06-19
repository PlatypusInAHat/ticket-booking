import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, Radio, Search, CheckCircle, XCircle } from 'lucide-react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import Screen from '../components/Screen';
import { checkinApi } from '../services/api';
import { isNfcRuntimeAvailable, readNfcText } from '../services/nfc';
import { colors, radius } from '../theme';
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
          <Button title="Quét camera" icon={Camera} variant="secondary" onPress={openScanner} style={styles.flexButton} />
          <Button title="Đọc NFC" icon={Radio} variant="secondary" onPress={readNfc} disabled={!isNfcRuntimeAvailable()} style={styles.flexButton} />
        </View>
        <View style={styles.actionRow}>
          <Button title="Kiểm tra" icon={Search} variant="secondary" onPress={() => submit('validate')} loading={loading} style={styles.flexButton} />
          <Button title="Check-in" icon={CheckCircle} onPress={() => submit('checkin')} loading={loading} style={styles.flexButton} />
        </View>
      </Card>

      {result ? (
        <Card style={styles.resultCard}>
          <View style={styles.resultHeader}>
            {result.valid ? <CheckCircle color={colors.green} size={28} /> : <XCircle color={colors.red} size={28} />}
            <Text style={[styles.title, result.valid ? styles.successText : styles.errorText]}>
              {result.valid ? 'Vé hợp lệ' : 'Vé không hợp lệ'}
            </Text>
          </View>
          <Text style={styles.reasonText}>{result.reason}</Text>
          {result.pass ? (
            <View style={styles.passDetails}>
              <Text style={styles.sectionTitle}>{result.pass.passCode}</Text>
              <Text style={styles.muted}>{result.pass.ticket?.eventName}</Text>
              <View style={styles.statusWrap}>
                <Text style={styles.badge}>{getLabel(passStatusLabels, result.pass.status)}</Text>
              </View>
            </View>
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
            <Button title="Đóng máy quét" variant="ghost" onPress={() => setScannerOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12
  },
  camera: {
    flex: 1
  },
  cameraFooter: {
    backgroundColor: colors.background,
    padding: 24,
    paddingBottom: 40
  },
  cameraWrap: {
    backgroundColor: '#000',
    flex: 1
  },
  errorText: {
    color: colors.red,
    marginLeft: 10
  },
  flexButton: {
    flex: 1
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  reasonText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16
  },
  passDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16
  },
  muted: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  },
  resultCard: {
    marginTop: 16
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  statusWrap: {
    marginTop: 12,
    alignItems: 'flex-start'
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  successText: {
    color: colors.green,
    marginLeft: 10
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26
  }
});
