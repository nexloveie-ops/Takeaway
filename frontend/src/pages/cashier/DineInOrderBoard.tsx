import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import OrderDetail, { type Order } from '../../components/cashier/OrderDetail';

interface TableGroup { tableNumber: number; orders: Order[]; total: number; }

export default function DineInOrderBoard() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableGroup[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/dine-in', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data: Order[] = await res.json();
      // Group flat array by tableNumber
      const grouped = new Map<number, Order[]>();
      for (const order of data) {
        const tbl = order.tableNumber ?? 0;
        if (!grouped.has(tbl)) grouped.set(tbl, []);
        grouped.get(tbl)!.push(order);
      }
      const groups: TableGroup[] = [...grouped.entries()].map(([tableNumber, orders]) => ({
        tableNumber,
        orders,
        total: orders.reduce((s, o) => s + o.items.reduce((s2, i) => s2 + i.unitPrice * i.quantity, 0), 0),
      })).sort((a, b) => a.tableNumber - b.tableNumber);
      setTables(groups);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const socket = io({ transports: ['websocket'] });
    socket.on('order:new', fetchOrders);
    socket.on('order:updated', fetchOrders);
    socket.on('order:checked-out', fetchOrders);
    return () => { socket.disconnect(); };
  }, [fetchOrders]);

  const selected = tables.find(t2 => t2.tableNumber === selectedTable);

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* Table grid */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('cashier.dineIn')}</h2>
        {tables.length === 0 && <div style={{ color: 'var(--text-light)', padding: 40, textAlign: 'center' }}>{t('cashier.noOrders')}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {tables.map(tbl => (
            <div key={tbl.tableNumber} onClick={() => setSelectedTable(tbl.tableNumber)}
              className="card" style={{
                padding: 16, cursor: 'pointer', textAlign: 'center',
                border: selectedTable === tbl.tableNumber ? '2px solid var(--red-primary)' : '1px solid var(--border)',
                background: selectedTable === tbl.tableNumber ? 'var(--red-light)' : 'var(--bg-white)',
              }}>
              <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 4 }}>{t('cashier.table')}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--red-primary)', fontFamily: "'Noto Serif SC', serif" }}>{tbl.tableNumber}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{tbl.orders.length} {t('cashier.orderDetail')}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red-primary)', marginTop: 4 }}>€{tbl.total}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ width: 340, flexShrink: 0, background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t('cashier.table')} {selected.tableNumber}</h3>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => navigate(`/cashier/checkout/${selected.tableNumber}`)}>
              {t('cashier.checkout')}
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            <OrderDetail orders={selected.orders} />
          </div>
          <div style={{ padding: '12px 16px', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
            <span>{t('cashier.total')}</span>
            <span style={{ color: 'var(--red-primary)' }}>€{selected.total}</span>
          </div>
        </div>
      )}
    </div>
  );
}
