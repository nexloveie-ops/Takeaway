import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface Translation { locale: string; name: string; description?: string; }
interface Category { _id: string; sortOrder: number; translations: Translation[]; }
interface MenuItem {
  _id: string; categoryId: string; price: number; calories?: number;
  avgWaitMinutes?: number; photoUrl?: string; isSoldOut?: boolean;
  translations: Translation[];
}
interface OrderItem { menuItemId: string; name: string; price: number; qty: number; }

export default function CashierOrder() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const lang = i18n.language;

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCat, setActiveCat] = useState('');
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState(1);
  const [seatNumber, setSeatNumber] = useState(1);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeout'>('dine_in');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    const [catRes, itemRes] = await Promise.all([
      fetch(`/api/menu/categories?lang=${lang}`),
      fetch(`/api/menu/items?lang=${lang}`),
    ]);
    if (catRes.ok) {
      const cats: Category[] = await catRes.json();
      setCategories(cats);
      if (cats.length > 0 && !activeCat) setActiveCat(cats[0]._id);
    }
    if (itemRes.ok) setItems(await itemRes.json());
  }, [lang]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getName = (translations: Translation[]) => {
    const found = translations.find(t2 => t2.locale === lang) || translations[0];
    return found?.name || '';
  };

  // Filter items by category + search
  const filteredItems = useMemo(() => {
    let list = items.filter(i => i.categoryId === activeCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = items.filter(i =>
        i.translations.some(t2 => t2.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, activeCat, search]);

  // Order helpers
  const addToOrder = (item: MenuItem) => {
    if (item.isSoldOut) return;
    const name = getName(item.translations);
    setOrder(prev => {
      const existing = prev.find(o => o.menuItemId === item._id);
      if (existing) return prev.map(o => o.menuItemId === item._id ? { ...o, qty: o.qty + 1 } : o);
      return [...prev, { menuItemId: item._id, name, price: item.price, qty: 1 }];
    });
  };

  const changeQty = (menuItemId: string, delta: number) => {
    setOrder(prev => {
      const item = prev.find(o => o.menuItemId === menuItemId);
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) return prev.filter(o => o.menuItemId !== menuItemId);
      return prev.map(o => o.menuItemId === menuItemId ? { ...o, qty: newQty } : o);
    });
  };

  const clearOrder = () => setOrder([]);

  const totalAmount = order.reduce((s, o) => s + o.price * o.qty, 0);
  const totalItems = order.reduce((s, o) => s + o.qty, 0);

  const getItemQty = (menuItemId: string) => order.find(o => o.menuItemId === menuItemId)?.qty || 0;

  const handleSubmit = async () => {
    if (order.length === 0) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const body: Record<string, unknown> = {
        type: orderType,
        items: order.map(o => ({ menuItemId: o.menuItemId, quantity: o.qty })),
      };
      if (orderType === 'dine_in') {
        body.tableNumber = tableNumber;
        body.seatNumber = seatNumber;
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error?.message || 'Failed');
      }
      const data = await res.json();
      const orderNum = data.dailyOrderNumber ? `#${data.dailyOrderNumber}` : `T${tableNumber}-S${seatNumber}`;
      setSuccess(`下单成功 ${orderNum}`);
      setOrder([]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 0 }}>

      {/* Left: Category Sidebar */}
      <div style={{
        width: 110, flexShrink: 0, background: 'var(--bg-white)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        overflowY: 'auto', padding: '8px 0',
      }}>
        {categories.map(cat => {
          const isActive = activeCat === cat._id;
          return (
            <button key={cat._id} onClick={() => { setActiveCat(cat._id); setSearch(''); }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '14px 8px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--red-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--red-light)' : 'transparent',
                borderLeft: isActive ? '4px solid var(--red-primary)' : '4px solid transparent',
                minHeight: 56, transition: 'all 0.12s',
              }}>
              {getName(cat.translations)}
            </button>
          );
        })}
      </div>

      {/* Center: Menu Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search */}
        <div style={{ padding: '10px 12px', background: 'var(--bg-white)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <input className="input" placeholder={`🔍  ${t('common.search')}...`} value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', fontSize: 14 }} />
        </div>

        {/* Section title */}
        <div style={{ padding: '10px 12px 6px', fontSize: 14, fontWeight: 700, background: 'var(--bg)', flexShrink: 0 }}>
          {search ? `搜索: "${search}"` : getName(categories.find(c => c._id === activeCat)?.translations || [])}
          <span style={{ fontWeight: 400, color: 'var(--text-light)', marginLeft: 8 }}>({filteredItems.length})</span>
        </div>

        {/* Grid */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px 10px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 8, alignContent: 'start',
        }}>
          {filteredItems.map(item => {
            const qty = getItemQty(item._id);
            const name = getName(item.translations);
            return (
              <div key={item._id} onClick={() => addToOrder(item)}
                style={{
                  background: 'var(--bg-white)',
                  border: qty > 0 ? '2px solid var(--red-primary)' : '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                  cursor: item.isSoldOut ? 'not-allowed' : 'pointer',
                  opacity: item.isSoldOut ? 0.4 : 1,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  minHeight: 80, justifyContent: 'center', position: 'relative',
                  userSelect: 'none', transition: 'all 0.1s',
                }}>
                {qty > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, left: -6,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--red-primary)', color: '#fff',
                    fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(211,47,47,0.4)',
                  }}>{qty}</span>
                )}
                {item.isSoldOut && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    fontSize: 9, padding: '1px 5px', borderRadius: 3,
                    fontWeight: 600, background: '#9E9E9E', color: '#fff',
                  }}>售罄</span>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 4,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{name}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red-primary)' }}>€{item.price}</div>
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-light)' }}>
              暂无菜品
            </div>
          )}
        </div>
      </div>

      {/* Right: Order Panel */}
      <div style={{
        width: 320, flexShrink: 0, background: 'var(--bg-white)',
        borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>🧾 点单</h3>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={clearOrder}>清空</button>
        </div>

        {/* Order type + table/seat */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" onClick={() => setOrderType('dine_in')} style={{
              flex: 1, fontSize: 12, padding: '6px 0',
              background: orderType === 'dine_in' ? 'var(--red-primary)' : 'var(--bg)',
              color: orderType === 'dine_in' ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}>堂食</button>
            <button className="btn" onClick={() => setOrderType('takeout')} style={{
              flex: 1, fontSize: 12, padding: '6px 0',
              background: orderType === 'takeout' ? 'var(--red-primary)' : 'var(--bg)',
              color: orderType === 'takeout' ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}>外卖</button>
          </div>
          {orderType === 'dine_in' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-light)' }}>{t('cashier.table')}</label>
                <input className="input" type="number" min={1} value={tableNumber}
                  onChange={e => setTableNumber(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', fontSize: 14, textAlign: 'center' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-light)' }}>{t('cashier.seat')}</label>
                <input className="input" type="number" min={1} value={seatNumber}
                  onChange={e => setSeatNumber(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', fontSize: 14, textAlign: 'center' }} />
              </div>
            </div>
          )}
        </div>

        {/* Order items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {order.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)', gap: 8 }}>
              <span style={{ fontSize: 36, opacity: 0.3 }}>📋</span>
              <span style={{ fontSize: 13 }}>点击左侧菜品加入</span>
            </div>
          ) : order.map(o => (
            <div key={o.menuItemId} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderBottom: '1px solid #f0f0f0',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>€{o.price}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                <button onClick={() => changeQty(o.menuItemId, -1)} style={{
                  width: 30, height: 30, border: 'none', background: 'var(--bg)',
                  fontSize: 16, fontWeight: 700, color: 'var(--red-primary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>−</button>
                <span style={{ width: 30, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{o.qty}</span>
                <button onClick={() => changeQty(o.menuItemId, 1)} style={{
                  width: 30, height: 30, border: 'none', background: 'var(--bg)',
                  fontSize: 16, fontWeight: 700, color: 'var(--green)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>+</button>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--red-primary)', minWidth: 55, textAlign: 'right' }}>
                €{(o.price * o.qty).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '2px solid var(--border)', padding: '12px 16px', flexShrink: 0 }}>
          {success && <div style={{ color: 'var(--green)', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>✓ {success}</div>}
          {error && <div style={{ color: 'var(--red-primary)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>合计 · {totalItems} 件</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--red-primary)', fontFamily: "'Noto Serif SC', serif" }}>€{totalAmount.toFixed(2)}</span>
          </div>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || order.length === 0}
            style={{ width: '100%', fontSize: 15, padding: '12px 0', letterSpacing: 1 }}>
            {submitting ? t('common.loading') : '下单'}
          </button>
        </div>
      </div>
    </div>
  );
}
