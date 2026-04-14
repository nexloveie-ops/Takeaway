import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface OrderItem { _id: string; menuItemId: string; quantity: number; unitPrice: number; itemName: string; }
interface Order {
  _id: string; type: string; tableNumber?: number; seatNumber?: number;
  dailyOrderNumber?: number; status: string; items: OrderItem[];
}

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);
  const qs = searchParams.toString();

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data);
      setEditItems(data.items.map((i: OrderItem) => ({ ...i })));
    } catch { setOrder(null); }
    finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const total = (items: OrderItem[]) => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const updateQty = (idx: number, delta: number) => {
    setEditItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: Math.max(0, next[idx].quantity + delta) };
      return next.filter(i => i.quantity > 0);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: editItems.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })) }),
      });
      if (!res.ok) throw new Error();
      await fetchOrder();
      setEditing(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>{t('customer.loadingOrder')}</div>;
  if (!order) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>{t('customer.orderNotFound')}</div>;

  const isPending = order.status === 'pending';
  const statusLabel = order.status === 'pending' ? t('customer.statusPending')
    : order.status === 'checked_out' ? t('customer.statusCheckedOut')
    : t('customer.statusCompleted');
  const statusColor = order.status === 'pending' ? 'var(--gold-primary)' : order.status === 'checked_out' ? 'var(--blue)' : 'var(--green)';

  const displayItems = editing ? editItems : order.items;

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {/* Status header */}
      <div style={{
        background: 'var(--bg-white)', borderRadius: 12, padding: 20, marginBottom: 16,
        border: '1px solid rgba(232,213,184,0.5)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 4 }}>{t('customer.orderNumber')}</div>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Noto Serif SC', serif", marginBottom: 8 }}>
          {order.dailyOrderNumber ? `#${order.dailyOrderNumber}` : order._id.slice(-8).toUpperCase()}
        </div>
        <span style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: 20,
          background: statusColor + '20', color: statusColor, fontWeight: 600, fontSize: 13,
        }}>{statusLabel}</span>
        {isPending && (
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
            {t('customer.goToCheckout')}
          </p>
        )}
      </div>

      {/* Items */}
      <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid rgba(232,213,184,0.5)', overflow: 'hidden' }}>
        {displayItems.map((item, idx) => (
          <div key={item._id || idx} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.itemName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)' }}>€{item.unitPrice} / {t('customer.quantity')}</div>
            </div>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                <button onClick={() => updateQty(idx, -1)} style={{ width: 32, height: 32, background: 'var(--bg)', fontSize: 16, fontWeight: 700, color: 'var(--red-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ width: 32, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{item.quantity}</span>
                <button onClick={() => updateQty(idx, 1)} style={{ width: 32, height: 32, background: 'var(--bg)', fontSize: 16, fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600 }}>×{item.quantity}</span>
            )}
            <span style={{ fontWeight: 700, color: 'var(--red-primary)', minWidth: 50, textAlign: 'right', fontFamily: "'Noto Serif SC', serif" }}>
              €{item.unitPrice * item.quantity}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', fontWeight: 700, fontSize: 16 }}>
          <span>{t('customer.totalAmount')}</span>
          <span style={{ color: 'var(--red-primary)', fontFamily: "'Noto Serif SC', serif" }}>€{total(displayItems)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        {isPending && !editing && (
          <>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditing(true)}>
              {t('customer.modifyOrder')}
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/customer/menu?${qs}`)}>
              {t('customer.backToMenu')}
            </button>
          </>
        )}
        {editing && (
          <>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setEditing(false); setEditItems(order.items.map(i => ({ ...i }))); }}>
              {t('customer.cancelEdit')}
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
              {saving ? t('common.loading') : t('customer.saveChanges')}
            </button>
          </>
        )}
        {!isPending && (
          <p style={{ color: 'var(--text-light)', fontSize: 13, textAlign: 'center', width: '100%' }}>
            {t('customer.orderNotModifiable')}
          </p>
        )}
      </div>
    </div>
  );
}
