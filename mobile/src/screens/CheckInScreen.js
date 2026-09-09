import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, Radio, Search, CheckCircle, XCircle, Download, UploadCloud, WifiOff } from 'lucide-react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import Screen from '../components/Screen';
import { checkinApi } from '../services/api';
import { isNfcRuntimeAvailable, readNfcText } from '../services/nfc';
import {
  getCheckInDeviceId,
  getOfflineCheckInState,
  queueOfflineCheckIn,
  removeSynchronizedScans,
  saveOfflineManifest
} from '../services/offlineCheckin';
import { colors, radius } from '../theme';
import { getLabel, passStatusLabels } from '../utils/labels';

export default function CheckInScreen() {
  const [scanCode, setScanCode] = useState('');
  const [scanMethod, setScanMethod] = useState('manual');
  const [gate, setGate] = useState('Gate A');
  const [eventId, setEventId] = useState('');
  const [checkInEvents, setCheckInEvents] = useState([]);
  const [offlineState, setOfflineState] = useState({ manifest: null, queue: [] });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const refreshOfflineState = async () => {
    try {
      const nextState = await getOfflineCheckInState();
      setOfflineState(nextState);
      if (nextState.manifest?.eventId) {
        setEventId((current) => current || nextState.manifest.eventId);
      }
    } catch (error) {
      Alert.alert('Offline data error', error.message);
    }
  };

  useEffect(() => {
    refreshOfflineState();
    checkinApi.events()
      .then((events) => setCheckInEvents(Array.isArray(events) ? events : []))
      .catch(() => setCheckInEvents([]));
  }, []);

  const submit = async (mode) => {
    if (!scanCode.trim()) {
      Alert.alert('Ticket code required', 'Enter or scan a QR, barcode, or NFC payload.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        code: scanCode.trim(),
        method: scanMethod === 'manual'
          ? (scanCode.startsWith('TICKETBOOKING:') ? 'qr' : 'barcode')
          : scanMethod,
        gate,
        deviceId: await getCheckInDeviceId(),
        appVersion: '0.1.0'
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
        Alert.alert('Camera permission required', 'Camera access is needed to scan QR codes and barcodes.');
        return;
      }
    }

    setScannerOpen(true);
  };

  const readNfc = async () => {
    try {
      const value = await readNfcText();
      setScanCode(value);
      setScanMethod('nfc');
    } catch (error) {
      Alert.alert('Could not read NFC', error.message);
    }
  };

  const downloadManifest = async () => {
    if (!eventId.trim()) {
      Alert.alert('Event ID required', 'Enter the event ID before downloading its offline manifest.');
      return;
    }

    setLoading(true);
    try {
      const deviceId = await getCheckInDeviceId();
      const bundle = await checkinApi.offlineManifest({
        eventId: eventId.trim(),
        deviceId,
        gate,
        appVersion: '0.1.0'
      });
      await saveOfflineManifest(bundle);
      await refreshOfflineState();
      Alert.alert('Offline mode ready', `${bundle.manifest.entries.length} tickets are available until ${new Date(bundle.manifest.expiresAt).toLocaleString()}.`);
    } catch (error) {
      Alert.alert('Could not download manifest', error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkInOffline = async () => {
    if (!scanCode.trim()) {
      Alert.alert('Ticket code required', 'Enter or scan a ticket before offline check-in.');
      return;
    }

    setLoading(true);
    try {
      const data = await queueOfflineCheckIn({
        code: scanCode.trim(),
        method: scanMethod === 'manual'
          ? (scanCode.startsWith('TICKETBOOKING:') ? 'qr' : 'barcode')
          : scanMethod,
        gate
      });
      setResult(data);
      await refreshOfflineState();
    } catch (error) {
      setResult({ valid: false, reason: error.message, offline: true });
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineQueue = async () => {
    const queue = offlineState.queue || [];
    if (queue.length === 0) {
      Alert.alert('Nothing to synchronize', 'The offline check-in queue is empty.');
      return;
    }

    setLoading(true);
    try {
      const deviceId = await getCheckInDeviceId();
      const allResults = [];

      for (let index = 0; index < queue.length; index += 100) {
        const batch = queue.slice(index, index + 100);
        const response = await checkinApi.syncOffline({
          eventId: offlineState.manifest?.eventId,
          deviceId,
          gate,
          appVersion: '0.1.0',
          items: batch.map(({ localId, code, method, scannedAt }) => ({
            localId,
            code,
            method,
            scannedAt
          }))
        });
        allResults.push(...response.results);
      }

      await removeSynchronizedScans(allResults);
      await refreshOfflineState();
      const accepted = allResults.filter((item) => item.status === 'accepted').length;
      const conflicts = allResults.filter((item) => item.status === 'conflict').length;
      const rejected = allResults.filter((item) => item.status === 'rejected').length;
      Alert.alert('Synchronization complete', `${accepted} accepted, ${conflicts} conflicts, ${rejected} rejected.`);
    } catch (error) {
      Alert.alert('Synchronization failed', `${error.message} The pending scans remain safely on this device.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Check-in" subtitle="For gate staff and admins. Scan QR, barcode, or NFC tickets.">
      <Card>
        <Field
          label="QR / barcode / NFC payload"
          value={scanCode}
          onChangeText={setScanCode}
          placeholder="TICKETBOOKING:..."
          autoCapitalize="none"
        />
        <Field
          label="Check-in gate"
          value={gate}
          onChangeText={setGate}
          placeholder="Gate A"
        />

        <View style={styles.actionRow}>
          <Button title="Scan camera" icon={Camera} variant="secondary" onPress={openScanner} style={styles.flexButton} />
          <Button title="Read NFC" icon={Radio} variant="secondary" onPress={readNfc} disabled={!isNfcRuntimeAvailable()} style={styles.flexButton} />
        </View>
        <View style={styles.actionRow}>
          <Button title="Validate" icon={Search} variant="secondary" onPress={() => submit('validate')} loading={loading} style={styles.flexButton} />
          <Button title="Check in" icon={CheckCircle} onPress={() => submit('checkin')} loading={loading} style={styles.flexButton} />
        </View>
      </Card>

      <Card style={styles.offlineCard}>
        <View style={styles.resultHeader}>
          <WifiOff color={colors.accent} size={24} />
          <Text style={styles.offlineTitle}>Offline gate mode</Text>
        </View>
        <Text style={styles.reasonText}>Download while online before opening the gate. Offline scans are verified locally, then reconciled with the server.</Text>
        <Field
          label="Event ID"
          value={eventId}
          onChangeText={setEventId}
          placeholder="MongoDB event ID"
          autoCapitalize="none"
        />
        {checkInEvents.length ? (
          <View style={styles.eventChoices}>
            {checkInEvents.slice(0, 8).map((event) => (
              <Button
                key={event.id}
                title={`${event.eventName} | ${event.issued} ready`}
                variant={eventId === event.id ? 'primary' : 'ghost'}
                onPress={() => setEventId(event.id)}
                style={styles.eventButton}
              />
            ))}
          </View>
        ) : null}
        <Text style={styles.offlineMeta}>
          {offlineState.manifest
            ? `${offlineState.manifest.entries.length} trusted tickets | expires ${new Date(offlineState.manifest.expiresAt).toLocaleString()}`
            : 'No offline manifest downloaded'}
        </Text>
        <Text style={styles.offlineMeta}>{offlineState.queue.length} scans waiting to synchronize</Text>
        <View style={styles.actionRow}>
          <Button title="Download" icon={Download} variant="secondary" onPress={downloadManifest} loading={loading} style={styles.flexButton} />
          <Button title="Offline check-in" icon={WifiOff} onPress={checkInOffline} loading={loading} disabled={!offlineState.manifest} style={styles.flexButton} />
        </View>
        <Button title="Sync pending scans" icon={UploadCloud} variant="secondary" onPress={syncOfflineQueue} loading={loading} disabled={!offlineState.queue.length} style={styles.syncButton} />
      </Card>

      {result ? (
        <Card style={styles.resultCard}>
          <View style={styles.resultHeader}>
            {result.valid ? <CheckCircle color={colors.green} size={28} /> : <XCircle color={colors.red} size={28} />}
            <Text style={[styles.title, result.valid ? styles.successText : styles.errorText]}>
              {result.valid ? 'Ticket is valid' : 'Ticket is not valid'}
            </Text>
          </View>
          <Text style={styles.reasonText}>{result.reason || 'No additional information.'}</Text>
          {result.pass ? (
            <View style={styles.passDetails}>
              <Text style={styles.sectionTitle}>{result.pass.passCode}</Text>
              <Text style={styles.muted}>{result.pass.ticketSnapshot?.eventName || result.pass.ticketSnapshot?.ticketName || 'TicketStage event'}</Text>
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
              setScanMethod(data.startsWith('TICKETBOOKING:') ? 'qr' : 'barcode');
              setScannerOpen(false);
            }}
          />
          <View style={styles.cameraFooter}>
            <Button title="Close scanner" variant="ghost" onPress={() => setScannerOpen(false)} />
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
  eventButton: {
    marginTop: 8
  },
  eventChoices: {
    marginBottom: 8
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
  offlineCard: {
    marginTop: 16
  },
  offlineMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6
  },
  offlineTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 10
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
  syncButton: {
    marginTop: 12
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26
  }
});
