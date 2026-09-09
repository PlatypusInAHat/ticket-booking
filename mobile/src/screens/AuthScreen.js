import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ticket, User, LogIn, UserPlus, Mail } from 'lucide-react-native';
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
  password: 'user12345',
  confirmPassword: 'user12345'
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
      if (mode === 'forgot') {
        await authApi.forgotPassword(form.email);
        setMessage('If this email exists, a password reset link has been sent.');
        return;
      }

      const auth = mode === 'login'
        ? await authApi.login(form.email, form.password)
        : await authApi.register(form);

      setAuthToken(auth.token, auth.refreshToken);
      await saveAuth(auth);
      onAuthenticated(auth);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const useDemoAccount = (type) => {
    const isStaff = type === 'staff';
    setForm(current => ({
      ...current,
      email: isStaff ? 'staff@ticketbooking.com' : 'user@ticketbooking.com',
      password: isStaff ? 'staff12345' : 'user12345',
      confirmPassword: isStaff ? 'staff12345' : 'user12345'
    }));
  };

  return (
    <Screen
      title="TicketStage"
      subtitle="Book tickets, manage mobile passes, and check in guests with QR, barcode, or NFC."
      right={<Ticket color={colors.accent} size={36} />}
    >
      <Card style={styles.card}>
        <Tabs
          tabs={[
            { key: 'login', label: 'Log in', icon: LogIn },
            { key: 'register', label: 'Register', icon: UserPlus },
            { key: 'forgot', label: 'Forgot password', icon: Mail }
          ]}
          activeTab={mode}
          onChange={setMode}
        />

        {mode === 'register' && (
          <Field
            label="Full name"
            value={form.name}
            onChangeText={(value) => setForm(current => ({ ...current, name: value }))}
            placeholder="Alex Nguyen"
          />
        )}

        {mode !== 'forgot' && <Field
          label="Email"
          value={form.email}
          onChangeText={(value) => setForm(current => ({ ...current, email: value }))}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />}

        <Field
          label="Password"
          value={form.password}
          onChangeText={(value) => setForm(current => ({ ...current, password: value }))}
          secureTextEntry
          placeholder="Enter your password"
        />

        {mode === 'register' && (
          <Field
            label="Confirm password"
            value={form.confirmPassword}
            onChangeText={(value) => setForm(current => ({ ...current, confirmPassword: value }))}
            secureTextEntry
            placeholder="Repeat your password"
          />
        )}

        {message ? <Text style={styles.errorText}>{message}</Text> : null}

        <Button
          title={mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : 'Send reset email'}
          icon={mode === 'login' ? LogIn : mode === 'register' ? UserPlus : Mail}
          onPress={submit}
          loading={loading}
          style={styles.mainButton}
        />

        {mode === 'login' && <View style={styles.demoRow}>
          <Button title="Customer" variant="secondary" icon={User} onPress={() => useDemoAccount('user')} style={styles.demoButton} />
          <Button title="Staff" variant="secondary" icon={User} onPress={() => useDemoAccount('staff')} style={styles.demoButton} />
        </View>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8
  },
  mainButton: {
    marginTop: 8
  },
  demoButton: {
    flex: 1
  },
  demoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12
  }
});
