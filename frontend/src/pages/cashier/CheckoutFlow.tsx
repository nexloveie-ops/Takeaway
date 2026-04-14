import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { type Order, type OrderItem } from '../../components/cashier/OrderDetail';
import ReceiptPrint from '../../components/cashier/ReceiptPrint';

interface SeatGroup {
  seatNumber: number;
  orders: Order[];
  /** All items merged — same menuItemId quantities summed */
  mergedItems: OrderItem[];
  total: number;
}

function mergeSeatItems(orders: Order[]): OrderItem[] {
  const map = new Map<string, OrderItem>();
  for (const o of orders) {
    for (const item of o.items) {
      const existing = map.get(item.menuItemId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        map.set(item.menuItemId, { ...item });
      }
    }
  }
  return [...map.values()];
}

function groupBySeat(orders: Order[]): SeatGroup[] {
  const map = new Map<number, Order[]>();
  for (const o of orders) {
    const seat = o.seatNumber ?? 0;
    if (!map.has(seat)) map.set(seat, []);
    map.get(seat)!.push(o);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([seatNumber, seatOrders]) => ({
      seatNumber,
      orders: seatOrders,
      mergedItems: mergeSeatItems(seatOrders),
      total: seatOrders.reduce((s, o) => s + o.items.reduce((s2, i) => s2 + i.unitPrice * i.quantity, 0), 0),
    }));
}

export default function CheckoutFlow() {
  const { tableNumber, orderId } = useParams();
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [mode, setMode] = useState<'table' | 'seat'>('table');
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    if (orderId) {
      const res = await fetch(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const o = await res.json();
        setOrders([o]);
        setMode('seat');
        setSelectedSeat(o.seatNumber ?? 0);
      }
    } else if (tableNumber) {
      const res = await fetch('/api/orders/dine-in', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const allOrders: Order[] = await res.json();
        setOrders(allOrders.filter(o => o.tableNumber === Number(tableNumber)));
      }
    }
  }, [tableNumber, orderId, token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const seatGroups = useMemo(() => groupBySeat(orders), [orders]);
  const allTotal = orders.reduce((s, o) => s + o.items.reduce((s2, i) => s2 + i.unitPrice * i.quantity, 0), 0);

  const activeSeatGroup = seatGroups.find(g => g.seatNumber === selectedSeat);
  const displayTotal = mode === 'seat' && activeSeatGroup ? activeSeatGroup.total : allTotal;
  const displayItems = mode === 'seat' && activeSeatGroup
    ? activeSeatGroup.mergedItems
    : mergeSeatItems(orders);

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = { paymentMethod };
      if (paymentMethod === 'cash') body.cashAmount = displayTotal;
      else if (paymentMethod === 'card') body.cardAmount = displayTotal;
      else { body.cashAmount = Number(cashAmount); body.cardAmount = Number(cardAmount); }

      if (mode === 'table') {
        // Whole table checkout — one API call
        const res = await fetch(`/api/checkout/table/${tableNumber}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error?.message || 'Checkout failed'); }
        const data = await res.json();
        setCheckoutId(data._id);
      } else if (activeSeatGroup) {
        // Per-seat checkout — checkout each order for this seat
        let lastCheckoutId = '';
        for (const order of activeSeatGroup.orders) {
          const res = await fetch(`/api/checkout/seat/${order._id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
          });
          if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error?.message || 'Checkout failed'); }
          const data = await res.json();
          lastCheckoutId = data._id;
        }
        setCheckoutId(lastCheckoutId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (checkoutId) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
          <h2 style={{ color: 'var(--green)', marginBottom: 16 }}>{t('cashier.checkoutSuccess')}</h2>
          <button className="btn btn-outline" onClick={() => navigate('/cashier')} style={{ marginBottom: 20 }}>
            {t('common.back')}
          </button>
        </div>
        <ReceiptPrint checkoutId={checkoutId} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>
          {t('cashier.checkout')} — {tableNumber ? `${t('cashier.table')} ${tableNumber}` : 'Order'}
        </h2>
        <button className="btn btn-outline" onClick={() => navigate('/cashier')}>{t('common.back')}</button>
      </div>

      {/* Mode selector */}
      {tableNumber && !orderId && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn" onClick={() => { setMode('table'); setSelectedSeat(null); }}
            style={{ flex: 1, background: mode === 'table' ? 'var(--red-primary)' : 'var(--bg)', color: mode === 'table' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {t('cashier.wholeTable')}
          </button>
          <button className="btn" onClick={() => { setMode('seat'); if (!selectedSeat && seatGroups.length > 0) setSelectedSeat(seatGroups[0].seatNumber); }}
            style={{ flex: 1, background: mode === 'seat' ? 'var(--red-primary)' : 'var(--bg)', color: mode === 'seat' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {t('cashier.bySeat')}
          </button>
        </div>
      )}

      {/* Seat selector — deduplicated by seatNumber */}
      {mode === 'seat' && tableNumber && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {seatGroups.map(g => (
            <button key={g.seatNumber} className="btn" onClick={() => setSelectedSeat(g.seatNumber)}
              style={{
                background: selectedSeat === g.seatNumber ? 'var(--blue)' : 'var(--bg)',
                color: selectedSeat === g.seatNumber ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border)', fontSize: 13, minWidth: 80,
              }}>
              {t('cashier.seat')} {g.seatNumber}
              <span style={{ display: 'block', fontSize: 11, opacity: 0.8 }}>
                {g.orders.length > 1 ? `${g.orders.length}单` : ''} €{g.total}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Merged items display */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        {mode === 'seat' && activeSeatGroup && (
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
            {t('cashier.seat')} {activeSeatGroup.seatNumber}
            {activeSeatGroup.orders.length > 1 && (
              <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8, color: 'var(--text-light)' }}>
                （{activeSeatGroup.orders.length} 笔订单合并）
              </span>
            )}
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '8px 0', textAlign: 'left' }}>菜品</th>
              <th style={{ padding: '8px 0', textAlign: 'center', width: 60 }}>数量</th>
              <th style={{ padding: '8px 0', textAlign: 'right', width: 70 }}>单价</th>
              <th style={{ padding: '8px 0', textAlign: 'right', width: 80 }}>小计</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map(item => (
              <tr key={item.menuItemId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 0', fontWeight: 500 }}>{item.itemName}</td>
                <td style={{ padding: '8px 0', textAlign: 'center' }}>×{item.quantity}</td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--text-secondary)' }}>€{item.unitPrice}</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>€{(item.unitPrice * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div style={{ color: 'var(--red-primary)', marginBottom: 12, fontSize: 13 }}>{error}</div>}

      {/* Payment */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 20, marginBottom: 16 }}>
          <span>{t('cashier.total')}</span>
          <span style={{ color: 'var(--red-primary)', fontFamily: "'Noto Serif SC', serif" }}>€{displayTotal.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['cash', 'card', 'mixed'] as const).map(m => (
            <button key={m} onClick={() => setPaymentMethod(m)} className="btn" style={{
              flex: 1, background: paymentMethod === m ? 'var(--red-primary)' : 'var(--bg)',
              color: paymentMethod === m ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}>{t(`cashier.${m}`)}</button>
          ))}
        </div>

        {paymentMethod === 'mixed' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="input" placeholder={t('cashier.cashAmount')} value={cashAmount} onChange={e => setCashAmount(e.target.value)} type="number" />
            <input className="input" placeholder={t('cashier.cardAmount')} value={cardAmount} onChange={e => setCardAmount(e.target.value)} type="number" />
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%', fontSize: 16, padding: '14px 0' }}
          onClick={handleCheckout} disabled={loading || (mode === 'seat' && !activeSeatGroup)}>
          {loading ? t('common.loading') : t('cashier.submitCheckout')}
        </button>
      </div>
    </div>
  );
}
