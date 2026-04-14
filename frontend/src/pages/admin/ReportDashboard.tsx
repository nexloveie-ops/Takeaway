import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface Summary {
  totalRevenue: number;
  orderCount: number;
  cashTotal: number;
  cardTotal: number;
  mixedTotal: number;
}

export default function ReportDashboard() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/reports/summary?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSummary(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, startDate, endDate]);

  const statCard = (label: string, value: string, color: string, icon: string) => (
    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: "'Noto Serif SC', serif" }}>{value}</div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{t('admin.reports')}</h2>

      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>开始日期</label>
          <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>结束日期</label>
          <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={fetchSummary} disabled={loading}>
          {loading ? t('common.loading') : t('common.search')}
        </button>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {statCard('总营业额', `€${summary.totalRevenue}`, 'var(--red-primary)', '💰')}
          {statCard('订单数量', String(summary.orderCount), 'var(--blue)', '📋')}
          {statCard('现金收入', `€${summary.cashTotal}`, 'var(--green)', '💵')}
          {statCard('刷卡收入', `€${summary.cardTotal}`, 'var(--blue)', '💳')}
          {statCard('混合支付', `€${summary.mixedTotal}`, 'var(--gold-dark)', '🔄')}
        </div>
      )}

      {!summary && !loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-light)' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <p>选择日期范围查看营业报表</p>
        </div>
      )}
    </div>
  );
}
