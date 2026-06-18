import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaReceipt } from 'react-icons/fa';
import { paymentAPI } from '../services/api';

const statusConfig = {
  completed: {
    icon: FaCheckCircle,
    title: 'Thanh toán thành công',
    description: 'Đơn đặt vé đã được xác nhận. Bạn có thể xem vé điện tử trong trang tài khoản.',
    color: 'text-neon-emerald',
    border: 'border-neon-emerald/30',
    bg: 'bg-neon-emerald/10'
  },
  pending: {
    icon: FaClock,
    title: 'Đang chờ xác nhận',
    description: 'Cổng thanh toán đang xử lý. Vui lòng kiểm tra lại sau ít phút.',
    color: 'text-neon-cyan',
    border: 'border-neon-cyan/30',
    bg: 'bg-neon-cyan/10'
  },
  failed: {
    icon: FaExclamationTriangle,
    title: 'Thanh toán chưa hoàn tất',
    description: 'Giao dịch chưa thành công hoặc đơn đã hết thời gian giữ vé.',
    color: 'text-neon-rose',
    border: 'border-neon-rose/30',
    bg: 'bg-neon-rose/10'
  }
};

function PaymentResult() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('Đang kiểm tra trạng thái thanh toán...');
  const bookingId = searchParams.get('bookingId') ||
    searchParams.get('orderId') ||
    window.localStorage.getItem('lastPendingBookingId');

  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      if (!bookingId) {
        setStatus('failed');
        setMessage('Không tìm thấy mã đơn để kiểm tra.');
        return;
      }

      try {
        const response = await paymentAPI.getPaymentStatus(bookingId);
        const paymentStatus = response.data.data?.paymentStatus || 'pending';

        if (!isMounted) {
          return;
        }

        setStatus(paymentStatus === 'completed' ? 'completed' : paymentStatus === 'failed' ? 'failed' : 'pending');
        setMessage(`Mã đơn: ${bookingId}`);

        if (paymentStatus === 'completed') {
          window.localStorage.removeItem('lastPendingBookingId');
        }
      } catch (error) {
        if (isMounted) {
          setStatus('pending');
          setMessage('Chưa thể xác nhận ngay. Nếu bạn đã thanh toán, hệ thống sẽ cập nhật sau khi webhook về.');
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-24">
      <div className={`glass-panel max-w-2xl border ${config.border} p-8 text-center md:p-12`}>
        <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl ${config.bg} ${config.color}`}>
          <Icon className="text-4xl" />
        </div>
        <h1 className="text-3xl font-black text-white">{config.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-slate-400">{config.description}</p>
        <p className="mt-5 rounded-2xl border border-white/10 bg-dark-900/50 px-4 py-3 text-sm font-semibold text-slate-300">
          {message}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/dashboard" className="btn-primary">
            <FaReceipt /> Xem đơn và vé
          </Link>
          <Link to="/tickets" className="btn-secondary">
            Tiếp tục xem sự kiện
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentResult;
