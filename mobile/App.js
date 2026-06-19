import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ticket, ShoppingBag, User, CheckCircle, CreditCard } from 'lucide-react-native';
import Screen from './src/components/Screen';
import Tabs from './src/components/Tabs';
import {
  bookingApi,
  paymentApi,
  setAuthToken,
  ticketApi
} from './src/services/api';
import { clearAuth, loadAuth } from './src/services/storage';
import { colors } from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import CartScreen from './src/screens/CartScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import MyTicketsScreen from './src/screens/MyTicketsScreen';
import PassModal from './src/screens/PassModal';
import ProfileScreen from './src/screens/ProfileScreen';
import TicketDetailModal from './src/screens/TicketDetailModal';
import TicketsScreen from './src/screens/TicketsScreen';

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
    { key: 'tickets', label: 'Vé', icon: Ticket },
    { key: 'cart', label: `Giỏ (${cart.reduce((sum, item) => sum + item.quantity, 0)})`, icon: ShoppingBag },
    { key: 'bookings', label: 'Vé của tôi', icon: CreditCard },
    ...(canCheckIn ? [{ key: 'checkin', label: 'Check-in', icon: CheckCircle }] : []),
    { key: 'profile', label: 'Tài khoản', icon: User }
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
        setAuth(savedAuth);
        setAuthToken(savedAuth.token);
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
    setAuth(null);
    setAuthToken(null);
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
      Alert.alert('Giỏ hàng trống', 'Vui lòng thêm vé trước khi thanh toán.');
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
        customerPhone: auth.user.phone || ''
      });
      await paymentApi.process({
        bookingId: booking._id,
        paymentToken: `mobile_demo_${Date.now()}`
      });
      Alert.alert('Đặt vé thành công', 'Vé điện tử đã được phát hành trong mục Vé của tôi.');
      setCart([]);
      setActiveTab('bookings');
      await loadBookings();
      await loadTickets();
    } catch (error) {
      Alert.alert('Không thể đặt vé', error.message);
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
      Alert.alert('Không thể tải vé điện tử', error.message);
    }
  };

  const cancelBooking = (booking) => {
    Alert.alert('Hủy đơn đặt vé', 'Bạn có chắc chắn muốn hủy đơn này?', [
      { text: 'Không' },
      {
        text: 'Hủy đơn',
        style: 'destructive',
        onPress: async () => {
          try {
            await bookingApi.cancel(booking._id);
            await loadBookings();
            await loadTickets();
          } catch (error) {
            Alert.alert('Không thể hủy đơn', error.message);
          }
        }
      }
    ]);
  };

  if (booting) {
    return (
      <>
        <StatusBar style="light" />
        <Screen title="TicketBooking" subtitle="Đang tải ứng dụng..." />
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
            <Text style={styles.brand}>TicketBooking</Text>
          </View>
          <Text style={styles.roleText}>{auth.user?.role === 'staff' ? 'Nhân viên' : auth.user?.name}</Text>
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
