import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../context/CartContext';

export default function CartPage() {
  const { items, increaseQuantity, decreaseQuantity, removeItem, clearCart, totalAmount, totalItems, getItemKey } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const getItemName = (names: Record<string, string>) => names[lang] || Object.values(names)[0] || '';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const table = searchParams.get('table');
  const seat = searchParams.get('seat');
  const orderType = searchParams.get('type');
  const qs = searchParams.toString();

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        items: items.map(i => {
          const item: Record<string, unknown> = { menuItemId: i.menuItemId, quantity: i.quantity };
          if (i.options && i.options.length > 0) {
            item.selectedOptions = i.options.map(o => ({ groupId: o.groupId, choiceId: o.choiceId }));
          }
          return item;
        }),
      };
      if (orderType === 'takeout') {
        body.type = 'takeout';
      } else {
        body.type = 'dine_in';
        body.tableNumber = Number(table);
        body.seatNumber = Number(seat);
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to submit order');
      const order = await res.json();
      clearCart();
      navigate(`/customer/order/${order._id}?${qs}`);
    } catch {
      setError(t('customer.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <span style={{ fontSize: 48, opacity: 0.3 }}>🛒</span>
        <p style={{ color: 'var(--text-light)' }}>{t('customer.emptyCart')}</p>
        <button className="btn btn-primary" onClick={() => navigate(`/customer/menu?${qs}`)}>
          {t('customer.backToMenu')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, paddingBottom: 120 }}>
      <h2 style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 20, marginBottom: 16, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(`/customer/menu?${qs}`)} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 0,
        }}>←</button>
        {t('customer.cart')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => {
          const key = getItemKey(item);
          const optExtra = (item.options || []).reduce((s, o) => s + o.extraPrice, 0);
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg-white)', borderRadius: 10, padding: '12px 14px',
              border: '1px solid rgba(232,213,184,0.5)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-dark)' }}>{getItemName(item.names)}</div>
                {item.options && item.options.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                    {item.options.map((o, i) => (
                      <span key={i}>
                        {i > 0 && ' · '}
                        {o.groupName[lang] || Object.values(o.groupName)[0]}: {o.choiceName[lang] || Object.values(o.choiceName)[0]}
                        {o.extraPrice > 0 && ` +€${o.extraPrice}`}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 13, color: 'var(--red-primary)', fontWeight: 600, fontFamily: "'Noto Serif SC', serif" }}>
                  €{item.price}{optExtra > 0 && ` +€${optExtra}`}
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden',
              }}>
                <button onClick={() => decreaseQuantity(key)} style={{
                  width: 34, height: 34, background: 'var(--bg)', fontSize: 16, fontWeight: 700,
                  color: 'var(--red-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>−</button>
                <span style={{ width: 34, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{item.quantity}</span>
                <button onClick={() => increaseQuantity(key)} style={{
                  width: 34, height: 34, background: 'var(--bg)', fontSize: 16, fontWeight: 700,
                  color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>+</button>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--red-primary)', minWidth: 50, textAlign: 'right', fontFamily: "'Noto Serif SC', serif" }}>
                €{((item.price + optExtra) * item.quantity).toFixed(2)}
              </div>
              <button onClick={() => removeItem(key)} style={{
                background: 'none', color: 'var(--text-light)', fontSize: 18, padding: 4,
              }}>✕</button>
            </div>
          );
        })}
      </div>

      {error && <div style={{ color: 'var(--red-primary)', marginTop: 12, fontSize: 13 }}>{error}</div>}

      {/* Fixed bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        maxWidth: 430, width: '100%', padding: '16px 20px',
        background: 'var(--bg-white)', borderTop: '2px solid var(--border-light)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100,
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{t('customer.totalAmount')} · {totalItems} {t('customer.quantity')}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red-primary)', fontFamily: "'Noto Serif SC', serif" }}>€{totalAmount.toFixed(2)}</div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}
          style={{ padding: '12px 28px', fontSize: 15, letterSpacing: 1 }}>
          {submitting ? t('common.loading') : t('customer.submitOrder')}
        </button>
      </div>
    </div>
  );
}
