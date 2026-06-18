import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaArrowLeft, FaCheckCircle, FaCreditCard, FaLock, FaReceipt } from 'react-icons/fa';
import { clearCart } from '../redux/slices/cartSlice';
import { bookingsAPI, paymentAPI } from '../services/api';
import { formatCurrency } from '../utils/format';
import { paymentMethodLabels } from '../utils/labels';

const gatewayMethods = new Set(['vnpay', 'momo']);

const getPaymentActionText = (paymentMethod) => {
  if (paymentMethod === 'vnpay') {
    return 'Sang cổng VNPay';
  }

  if (paymentMethod === 'momo') {
    return 'Mở thanh toán MoMo';
  }

  return 'Xác nhận thanh toán demo';
};

function Checkout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { items, totalPrice } = useSelector(state => state.cart);

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');

  const createBookingPayload = () => ({
    tickets: items.map(item => ({
      ticketId: item._id,
      quantity: item.quantity
    })),
    paymentMethod,
    customerName,
    customerEmail,
    customerPhone,
    source: 'web'
  });

  const redirectToGateway = (session) => {
    const redirectUrl = session.redirectUrl || session.paymentUrl || session.deeplink;

    if (!redirectUrl) {
      throw new Error('Cổng thanh toán chưa trả về đường dẫn thanh toán.');
    }

    window.localStorage.setItem('lastPendingBookingId', session.bookingId || '');
    dispatch(clearCart());
    window.location.assign(redirectUrl);
  };

  const completeMockPayment = async (booking) => {
    await paymentAPI.processPayment({
      bookingId: booking._id,
      paymentToken: `demo_payment_${Date.now()}`
    });

    dispatch(clearCart());
    navigate('/dashboard');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setStatusText('Đang giữ vé cho bạn...');

    try {
      const bookingResponse = await bookingsAPI.create(createBookingPayload());
      const booking = bookingResponse.data.data;

      window.localStorage.setItem('lastPendingBookingId', booking._id);

      if (gatewayMethods.has(paymentMethod)) {
        setStatusText('Đang tạo phiên thanh toán an toàn...');
        const sessionResponse = await paymentAPI.createSession({
          bookingId: booking._id,
          provider: paymentMethod
        });

        redirectToGateway({
          ...sessionResponse.data.data,
          bookingId: booking._id
        });
        return;
      }

      setStatusText('Đang hoàn tất thanh toán demo...');
      await completeMockPayment(booking);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Thanh toán thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  if (items.length === 0) {
    return (
      <div className="container py-24 text-center">
        <div className="glass-panel mx-auto max-w-xl p-10">
          <FaReceipt className="mx-auto mb-5 text-5xl text-slate-500" />
          <p className="font-bold text-white">Giỏ hàng đang trống, chưa thể thanh toán.</p>
          <button onClick={() => navigate('/events')} className="btn-primary mt-6">
            Quay lại danh sách vé
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-24 relative z-10">
      <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-neon-cyan/10 blur-[130px] pointer-events-none" />
      <div className="absolute right-0 top-60 h-96 w-96 rounded-full bg-neon-violet/10 blur-[130px] pointer-events-none" />

      <button
        type="button"
        onClick={() => navigate('/cart')}
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-white"
      >
        <FaArrowLeft /> Quay lại giỏ hàng
      </button>

      <div className="mb-8">
        <span className="badge mb-3 bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan">Bước cuối</span>
        <h1 className="text-4xl font-black text-white">Thanh toán đặt vé</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          Hệ thống sẽ giữ vé trong thời gian ngắn. Nếu bạn chọn VNPay hoặc MoMo, app sẽ chuyển sang cổng thanh toán tương ứng.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <form onSubmit={handleSubmit} className="glass-panel p-6 md:p-8">
          <div className="mb-8 flex items-center gap-4 border-b border-white/10 pb-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon-cyan/10 text-neon-cyan">
              <FaLock />
            </span>
            <div>
              <h2 className="text-xl font-black text-white">Thông tin nhận vé</h2>
              <p className="text-sm text-slate-400">Email và số điện thoại dùng để xác nhận đơn, gửi vé và hỗ trợ sau mua.</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-neon-rose/30 bg-neon-rose/10 px-5 py-4 text-sm font-semibold text-neon-rose">
              {error}
            </div>
          )}

          {statusText && (
            <div className="mb-6 rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 px-5 py-4 text-sm font-semibold text-neon-cyan">
              {statusText}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">Họ và tên</label>
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="field bg-dark-900/60"
                required
              />
            </div>
            <div>
              <label className="label">Email nhận vé</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                className="field bg-dark-900/60"
                required
              />
            </div>
            <div>
              <label className="label">Số điện thoại</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="field bg-dark-900/60"
                required
              />
            </div>
            <div>
              <label className="label">Phương thức thanh toán</label>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="field bg-dark-900/60"
              >
                {['vnpay', 'momo', 'credit_card', 'bank_transfer'].map(value => (
                  <option key={value} value={value} className="bg-dark-900">
                    {paymentMethodLabels[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-dark-900/50 p-5 text-sm text-slate-300">
            <p className="font-bold text-white">Lưu ý thanh toán</p>
            <p className="mt-2">
              VNPay/MoMo cần cấu hình merchant thật trong `.env`. Nếu chưa cấu hình, hãy dùng thẻ hoặc chuyển khoản để chạy luồng demo.
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-8 w-full py-4 text-lg md:w-auto">
            <FaCreditCard className="text-xl" />
            {loading ? 'Đang xử lý...' : getPaymentActionText(paymentMethod)}
          </button>
        </form>

        <aside className="glass-panel p-6 lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-xl font-black text-white">Tóm tắt đơn hàng</h2>
          <div className="mt-6 space-y-4">
            {items.map(item => (
              <div key={item._id} className="rounded-2xl border border-white/5 bg-dark-900/50 p-4">
                <p className="font-black text-white">{item.eventName}</p>
                <div className="mt-3 flex justify-between text-sm text-slate-400">
                  <span>{item.quantity} vé</span>
                  <span className="font-bold text-neon-emerald">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Tạm tính</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            <div className="mt-4 flex justify-between text-xl font-black text-white">
              <span>Tổng thanh toán</span>
              <span className="text-neon-emerald">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-neon-emerald/20 bg-neon-emerald/10 p-4 text-sm text-neon-emerald">
            <FaCheckCircle className="mt-0.5 shrink-0" />
            <p>Vé chỉ được xác nhận sau khi booking chuyển sang trạng thái đã thanh toán.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Checkout;
