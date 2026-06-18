import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaArrowRight, FaMinus, FaPlus, FaRegTrashAlt, FaShoppingCart } from 'react-icons/fa';
import { removeFromCart, updateQuantity } from '../redux/slices/cartSlice';
import { formatCurrency, formatDate } from '../utils/format';

function Cart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, totalPrice } = useSelector(state => state.cart);
  const { token } = useSelector(state => state.auth);

  const handleCheckout = () => {
    if (!token) {
      navigate('/login');
      return;
    }

    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="container py-24 relative z-10">
        <div className="glass-panel mx-auto max-w-2xl p-10 text-center">
          <FaShoppingCart className="mx-auto mb-5 text-5xl text-slate-500" />
          <h1 className="text-3xl font-black text-white">Giỏ hàng đang trống</h1>
          <p className="mt-3 text-slate-400">Bạn chưa chọn vé nào. Hãy khám phá các sự kiện đang mở bán.</p>
          <Link to="/events" className="btn-primary mt-8 inline-flex">
            Khám phá sự kiện
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-24 relative z-10">
      <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-neon-cyan/10 blur-[130px] pointer-events-none" />
      <div className="mb-8">
        <span className="badge mb-3 bg-white/5 border-white/10 text-slate-300">Giỏ hàng</span>
        <h1 className="text-4xl font-black text-white">Vé của bạn</h1>
        <p className="mt-2 text-sm text-slate-400">Kiểm tra lại số lượng trước khi chuyển sang thanh toán.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          {items.map(item => (
            <article key={item._id} className="glass-panel p-4 overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-1 h-full bg-neon-cyan transition-all duration-300 group-hover:w-2" />
              <div className="grid gap-6 md:grid-cols-[160px_1fr_auto] md:items-center pl-4">
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1540039155733-d7696d4eb25e?auto=format&fit=crop&q=80'}
                  alt={item.eventName}
                  className="h-40 w-full rounded-xl object-cover"
                />

                <div>
                  <h2 className="text-xl font-black text-white group-hover:text-neon-cyan transition-colors">{item.eventName}</h2>
                  <p className="mt-2 text-sm text-slate-400 font-medium">
                    {item.location?.venue}, {item.location?.city}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{formatDate(item.date)} lúc {item.time}</p>
                  <p className="mt-4 font-black text-neon-emerald text-lg">
                    {formatCurrency(item.price)} <span className="text-xs text-slate-500 font-normal">/ vé</span>
                  </p>
                </div>

                <div className="flex items-center justify-between gap-6 md:flex-col md:items-end h-full py-2">
                  <div className="flex items-center rounded-xl border border-white/10 bg-dark-900/50 p-1">
                    <button
                      type="button"
                      className="p-3 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                      onClick={() => dispatch(updateQuantity({ id: item._id, quantity: item.quantity - 1 }))}
                      aria-label="Giảm số lượng"
                    >
                      <FaMinus className="text-xs" />
                    </button>
                    <span className="w-12 text-center font-black text-white">{item.quantity}</span>
                    <button
                      type="button"
                      className="p-3 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                      onClick={() => dispatch(updateQuantity({ id: item._id, quantity: item.quantity + 1 }))}
                      aria-label="Tăng số lượng"
                    >
                      <FaPlus className="text-xs" />
                    </button>
                  </div>

                  <button
                    onClick={() => dispatch(removeFromCart(item._id))}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-neon-rose transition-colors"
                  >
                    <FaRegTrashAlt /> Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="glass-panel p-6 lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-xl font-black text-white">Tóm tắt đơn hàng</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-400">
            <div className="flex justify-between">
              <span>Số loại vé</span>
              <span className="font-bold text-white">{items.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Tổng số vé</span>
              <span className="font-bold text-white">{items.reduce((total, item) => total + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-6 text-base">
              <span className="font-bold text-white">Tạm tính</span>
              <span className="font-black text-xl text-neon-emerald">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          <button onClick={handleCheckout} className="btn-primary mt-8 w-full py-4 text-lg">
            Thanh toán <FaArrowRight className="ml-2" />
          </button>
          <Link to="/events" className="btn-secondary mt-4 w-full">
            Tiếp tục chọn vé
          </Link>
        </aside>
      </div>
    </div>
  );
}

export default Cart;
