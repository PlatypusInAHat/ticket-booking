import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ticket, ShoppingBag, User, CheckCircle, CreditCard } from 'lucide-react-native';
import Screen from './components/Screen';
import Tabs from './components/Tabs';
import {
  authApi,
  bookingApi,
  paymentApi,
  setAuthToken,
  ticketApi
} from './services/api';
import { getDeviceFingerprint } from './services/deviceFingerprint';
import { clearAuth, loadAuth } from './services/storage';
import { colors } from './theme';
import AuthScreen from './screens/AuthScreen';
import CartScreen from './screens/CartScreen';
import CheckInScreen from './screens/CheckInScreen';
import MyTicketsScreen from './screens/MyTicketsScreen';
import PassModal from './screens/PassModal';
import ProfileScreen from './screens/ProfileScreen';
import TicketDetailModal from './screens/TicketDetailModal';
import TicketsScreen from './screens/TicketsScreen';

export default function App() {
  const [auth, setAuth] = useState(null);
  const [booting, setBooting] = useState(true);
  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [passes, setPasses] = useState([]);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');

  const canCheckIn = auth?.user?.role === 'admin' || auth?.user?.role === 'staff';

  const tabs = useMemo(() => [
    { key: 'tickets', label: 'Tickets', icon: Ticket },
    { key: 'cart', label: `Cart (${cart.reduce((sum, item) => sum + item.quantity, 0)})`, icon: ShoppingBag },
    { key: 'bookings', label: 'My Tickets', icon: CreditCard },
    ...(canCheckIn ? [{ key: 'checkin', label: 'Check-in', icon: CheckCircle }] : []),
    { key: 'profile', label: 'Profile', icon: User }
  ], [canCheckIn, cart]);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    setMessage('');

    try {
      const data = await ticketApi.list({ limit: 20 });
      setTickets(data.tickets || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    if (!auth?.token) {
      return;
    }

    setLoadingBookings(true);
    setMessage('');

    try {
      const data = await bookingApi.list();
      setBookings(data || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingBookings(false);
    }
  }, [auth?.token]);

  useEffect(() => {
    const bootstrap = async () => {
      const savedAuth = await loadAuth();
      if (savedAuth?.token) {
        if (savedAuth.refreshExpiresAt && Date.parse(savedAuth.refreshExpiresAt) <= Date.now()) {
          await clearAuth();
          setAuthToken(null, null);
        } else {
          setAuth(savedAuth);
          setAuthToken(savedAuth.token, savedAuth.refreshToken);
        }
      }
      setBooting(false);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!booting) {
      loadTickets();
    }
  }, [booting, loadTickets]);

  useEffect(() => {
    if (auth?.token) {
      loadBookings();
    }
  }, [auth?.token, loadBookings]);

  const handleAuthenticated = (nextAuth) => {
    setAuth(nextAuth);
    setActiveTab('tickets');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Keep logout reliable even if the access token is already expired.
    }
    setAuth(null);
    setAuthToken(null, null);
    setBookings([]);
    setActiveTab('tickets');
    await clearAuth();
  };

  const addToCart = (ticket) => {
    setCart(current => {
      const existing = current.find(item => item._id === ticket._id);

      if (existing) {
        return current.map(item => item._id === ticket._id
          ? { ...item, quantity: Math.min(item.quantity + 1, item.availableSeats) }
          : item);
      }

      return [...current, { ...ticket, quantity: 1 }];
    });
    setSelectedTicket(null);
    setActiveTab('cart');
  };

  const updateCartQuantity = (ticketId, quantity) => {
    setCart(current => current
      .map(item => item._id === ticketId
        ? { ...item, quantity: Math.min(Math.max(quantity, 1), item.availableSeats) }
        : item)
      .filter(item => item.quantity > 0));
  };

  const removeFromCart = (ticketId) => {
    setCart(current => current.filter(item => item._id !== ticketId));
  };

  const checkoutCart = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart is empty', 'Add tickets before checkout.');
      return;
    }

    setCheckingOut(true);
    try {
      const booking = await bookingApi.create({
        tickets: cart.map(item => ({
          ticketId: item._id,
          quantity: item.quantity
        })),
        paymentMethod: 'vnpay',
        customerName: auth.user.name,
        customerEmail: auth.user.email,
        customerPhone: auth.user.phone || '',
        source: 'mobile',
        deviceFingerprint: await getDeviceFingerprint()
      });
      const session = await paymentApi.createSession({
        bookingId: booking._id,
        provider: 'vnpay'
      });
      const paymentUrl = session.redirectUrl || session.paymentUrl || session.deeplink;

      if (!paymentUrl) {
        throw new Error('The payment gateway did not return a valid checkout URL.');
      }

      await Linking.openURL(paymentUrl);
      Alert.alert('Payment started', 'Complete payment in the gateway. Your tickets will appear after the payment webhook confirms the booking.');
      setCart([]);
      setActiveTab('bookings');
      await loadBookings();
      await loadTickets();
    } catch (error) {
      Alert.alert('Could not book tickets', error.message);
    } finally {
      setCheckingOut(false);
    }
  };

  const openPasses = async (booking) => {
    try {
      const data = await bookingApi.passes(booking._id);
      setSelectedBooking(booking);
      setPasses(data.passes || []);
    } catch (error) {
      Alert.alert('Could not load mobile passes', error.message);
    }
  };

  const cancelBooking = (booking) => {
    Alert.alert('Cancel booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            await bookingApi.cancel(booking._id);
            await loadBookings();
            await loadTickets();
          } catch (error) {
            Alert.alert('Could not cancel booking', error.message);
          }
        }
      }
    ]);
  };

  if (booting) {
    return (
      <>
        <StatusBar style="light" />
        <Screen title="TicketStage" subtitle="Loading mobile app..." />
      </>
    );
  }

  if (!auth) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen onAuthenticated={handleAuthenticated} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.appWrap}>
        <View style={styles.topBar}>
          <View style={styles.brandContainer}>
            <View style={styles.iconContainer}>
              <Ticket color={colors.accentForeground} size={18} />
            </View>
            <Text style={styles.brand}>TicketStage</Text>
          </View>
          <Text style={styles.roleText}>{auth.user?.role === 'staff' ? 'Staff' : auth.user?.name}</Text>
        </View>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {message ? <Text style={styles.errorText}>{message}</Text> : null}

        {activeTab === 'tickets' && (
          <TicketsScreen
            tickets={tickets}
            loading={loadingTickets}
            refresh={loadTickets}
            onOpenTicket={setSelectedTicket}
            onBookTicket={addToCart}
          />
        )}
        {activeTab === 'cart' && (
          <CartScreen
            cart={cart}
            onChangeQuantity={updateCartQuantity}
            onRemove={removeFromCart}
            onCheckout={checkoutCart}
            loading={checkingOut}
          />
        )}
        {activeTab === 'bookings' && (
          <MyTicketsScreen
            bookings={bookings}
            loading={loadingBookings}
            refresh={loadBookings}
            onOpenPasses={openPasses}
            onCancelBooking={cancelBooking}
          />
        )}
        {activeTab === 'checkin' && canCheckIn && <CheckInScreen />}
        {activeTab === 'profile' && <ProfileScreen auth={auth} onLogout={logout} />}
      </View>

      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onBook={addToCart}
      />
      <PassModal
        booking={selectedBooking}
        passes={passes}
        onClose={() => {
          setSelectedBooking(null);
          setPasses([]);
          loadBookings();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  appWrap: {
    backgroundColor: colors.background,
    flex: 1,
    paddingTop: 48
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconContainer: {
    backgroundColor: colors.accent,
    padding: 6,
    borderRadius: 8
  },
  brand: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 16,
    marginBottom: 8
  },
  roleText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600'
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface
  }
});
