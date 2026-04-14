import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

interface OrderItem { _id: string; menuItemId: string; quantity: number; unitPrice: number; itemName: string; }
interface TakeoutOrder {
  _id: string; type: string; dailyOrderNumber?: number; status: string;
  items: OrderItem[]; createdAt: string;
}

export default function TakeoutOrderList() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [orders, setOrders] = useState<TakeoutOrder[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/takeout', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setOrders(await res.json());
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const socket = io({ transports: ['websocket'] });
    socket.on('order:new', fetchOrders);
    socket.on('order:updated', fetchOrders);
    return () => { socket.disconnect(); };
  }, [fetchOrders]);

  const selectedOrder = orders.find(o => o._id === selected);
  const orderTotal = (o: TakeoutOrder) => o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const handleCheckout = async () => {
    if (!selectedOrder) return;
    setCheckingOut(true);
    try {
      const body: Record<string, unknown> = { paymentMethod };
      if (paymentMethod === 'cash') body.cashAmount = orderTotal(selectedOrder);
      else if (paymentMethod === 'card') body.cardAmount = orderTotal(selectedOrder);
      else { body.cashAmount = Number(cashAmount); body.cardAmount = Number(cardAmount); }
      const res = await fetch(`/api/checkout/seat/${selectedOrder._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) { setSelected(null); fetchOrders(); }
    } catch { /* ignore */ }
    finally { setCheckingOut(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('cashier.takeout')}</h2>
        {orders.length === 0 && <div style={{ color: 'var(--text-light)', padding: 40, textAlign: 'center' }}>{t('cashier.noOrders')}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(o => (
            <div key={o._id} onClick={() => setSelected(o._id)} className="card" style={{
              padding: '14px 16px', cursor: 'pointer',
              border: selected === o._id ? '2px solid var(--red-primary)' : '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--red-primary)' }}>#{o.dailyOrderNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{o.items.length} items · {new Date(o.createdAt).toLocaleTimeString()}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--red-primary)', fontFamily: "'Noto Serif SC', serif" }}>€{orderTotal(o)}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedOrder && (
        <div style={{ width: 340, flexShrink: 0, background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>#{selectedOrder.dailyOrderNumber} {t('cashier.orderDetail')}</h3>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {selectedOrder.items.map(item => (
              <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                <span>{item.itemName} ×{item.quantity}</span>
                <span style={{ fontWeight: 600, color: 'var(--red-primary)' }}>€{item.unitPrice * item.quantity}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 16, borderTop: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18 }}>
              <span>{t('cashier.total')}</span>
              <span style={{ color: 'var(--red-primary)' }}>€{orderTotal(selectedOrder)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['cash', 'card', 'mixed'] as const).map(m => (
                <button key={m} onClick={() => setPaymentMethod(m)} className="btn" style={{
                  flex: 1, fontSize: 12, padding: '8px 0',
                  background: paymentMethod === m ? 'var(--red-primary)' : 'var(--bg)',
                  color: paymentMethod === m ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}>{t(`cashier.${m}`)}</button>
              ))}
            </div>
            {paymentMethod === 'mixed' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" placeholder={t('cashier.cashAmount')} value={cashAmount} onChange={e => setCashAmount(e.target.value)} type="number" />
                <input className="input" placeholder={t('cashier.cardAmount')} value={cardAmount} onChange={e => setCardAmount(e.target.value)} type="number" />
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCheckout} disabled={checkingOut}>
              {checkingOut ? t('common.loading') : t('cashier.submitCheckout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
