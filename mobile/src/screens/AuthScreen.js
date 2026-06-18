import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import Screen from '../components/Screen';
import Tabs from '../components/Tabs';
import { authApi, setAuthToken } from '../services/api';
import { saveAuth } from '../services/storage';
import { colors } from '../theme';

const initialForm = {
  name: '',
  email: 'user@ticketbooking.com',
  password: 'user123',
  confirmPassword: 'user123'
};

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    setLoading(true);
    setMessage('');

    try {
      const auth = mode === 'login'
        ? await authApi.login(form.email, form.password)
        : await authApi.register(form);

      setAuthToken(auth.token);
      await saveAuth(auth);
      onAuthenticated(auth);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const useDemoAccount = (type) => {
    setForm(current => ({
      ...current,
      email: type === 'staff' ? 'staff@ticketbooking.com' : 'user@ticketbooking.com',
      password: type === 'staff' ? 'staff123' : 'user123'
    }));
  };

  return (
    <Screen
      title="TicketBooking"
      subtitle="Ứng dụng đặt vé, quản lý vé điện tử và check-in tại cổng."
    >
      <Card>
        <Tabs
          tabs={[
            { key: 'login', label: 'Đăng nhập' },
            { key: 'register', label: 'Đăng ký' }
          ]}
          activeTab={mode}
          onChange={setMode}
        />

        {mode === 'register' && (
          <Field
            label="Họ và tên"
            value={form.name}
            onChangeText={(value) => setForm(current => ({ ...current, name: value }))}
            placeholder="Nguyễn Văn A"
          />
        )}

        <Field
          label="Email"
          value={form.email}
          onChangeText={(value) => setForm(current => ({ ...current, email: value }))}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="ban@example.com"
        />

        <Field
          label="Mật khẩu"
          value={form.password}
          onChangeText={(value) => setForm(current => ({ ...current, password: value }))}
          secureTextEntry
          placeholder="Nhập mật khẩu"
        />

        {mode === 'register' && (
          <Field
            label="Xác nhận mật khẩu"
            value={form.confirmPassword}
            onChangeText={(value) => setForm(current => ({ ...current, confirmPassword: value }))}
            secureTextEntry
            placeholder="Nhập lại mật khẩu"
          />
        )}

        {message ? <Text style={styles.errorText}>{message}</Text> : null}

        <Button
          title={mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          onPress={submit}
          loading={loading}
        />

        <View style={styles.demoRow}>
          <Button title="Demo khách" variant="secondary" onPress={() => useDemoAccount('user')} style={styles.demoButton} />
          <Button title="Demo nhân viên" variant="secondary" onPress={() => useDemoAccount('staff')} style={styles.demoButton} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  demoButton: {
    flex: 1
  },
  demoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12
  }
});
