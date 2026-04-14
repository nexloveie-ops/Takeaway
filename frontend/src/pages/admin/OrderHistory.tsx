import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface OrderItem { _id: string; quantity: number; unitPrice: number; itemName: string; }
interface HistoryOrder {
  _id: string; type: string; tableNumber?: number; seatNumber?: number;
  dailyOrderNumber?: number; status: string; items: OrderItem[]; createdAt: string;
}

export default function OrderHistory() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/reports/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setOrders(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, startDate, endDate, typeFilter]);

  const orderTotal = (o: HistoryOrder) => o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{t('admin.orderHistory')}</h2>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>开始日期</label>
          <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>结束日期</label>
          <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>类型</label>
          <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">全部</option>
            <option value="dine_in">堂食</option>
            <option value="takeout">外卖</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={fetchOrders} disabled={loading}>
          {loading ? t('common.loading') : t('common.search')}
        </button>
      </div>

      {/* Results */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>订单号</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>类型</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>桌号/单号</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>菜品</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>金额</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>状态</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>时间</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{o._id.slice(-8)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span className="badge" style={{
                    background: o.type === 'dine_in' ? 'var(--blue-light)' : 'var(--gold-light)',
                    color: o.type === 'dine_in' ? 'var(--blue)' : 'var(--gold-dark)',
                  }}>{o.type === 'dine_in' ? '堂食' : '外卖'}</span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {o.type === 'dine_in' ? `桌${o.tableNumber} 座${o.seatNumber}` : `#${o.dailyOrderNumber}`}
                </td>
                <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {o.items.map(i => `${i.itemName}×${i.quantity}`).join(', ')}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--red-primary)' }}>€{orderTotal(o)}</td>
                <td style={{ padding: '8px 12px' }}>{o.status}</td>
                <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-light)' }}>{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
