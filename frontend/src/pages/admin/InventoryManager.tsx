import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface MenuItem {
  _id: string; isSoldOut?: boolean;
  translations: { locale: string; name: string }[];
}

export default function InventoryManager() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);

  const fetchItems = useCallback(async () => {
    const res = await fetch('/api/menu/items', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setItems(await res.json());
  }, [token]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const toggleSoldOut = async (id: string, current: boolean) => {
    await fetch(`/api/menu/items/${id}/sold-out`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isSoldOut: !current }),
    });
    fetchItems();
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{t('admin.inventory')}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {items.map(item => {
          const name = item.translations.find(t2 => t2.locale === 'zh-CN')?.name || item.translations[0]?.name || '';
          return (
            <div key={item._id} className="card" style={{
              padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              opacity: item.isSoldOut ? 0.6 : 1,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                <span className="badge" style={{
                  marginTop: 4,
                  background: item.isSoldOut ? 'var(--red-light)' : 'var(--green-light)',
                  color: item.isSoldOut ? 'var(--red-primary)' : 'var(--green)',
                }}>
                  {item.isSoldOut ? t('customer.soldOut') : '在售'}
                </span>
              </div>
              <button
                className={`btn ${item.isSoldOut ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 12, padding: '8px 14px' }}
                onClick={() => toggleSoldOut(item._id, !!item.isSoldOut)}
              >
                {item.isSoldOut ? '恢复供应' : '标记售罄'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
