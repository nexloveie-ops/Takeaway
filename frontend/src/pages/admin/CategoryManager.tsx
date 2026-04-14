import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface Translation { locale: string; name: string; }
interface Category { _id: string; sortOrder: number; translations: Translation[]; }

export default function CategoryManager() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nameZh, setNameZh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/menu/categories', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCategories(await res.json());
  }, [token]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const startEdit = (cat: Category | null) => {
    if (cat) {
      setEditingId(cat._id);
      setNameZh(cat.translations.find(t2 => t2.locale === 'zh-CN')?.name || '');
      setNameEn(cat.translations.find(t2 => t2.locale === 'en-US')?.name || '');
      setSortOrder(cat.sortOrder);
    } else {
      setEditingId(null);
      setNameZh(''); setNameEn(''); setSortOrder(categories.length);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    const body = {
      sortOrder,
      translations: [
        { locale: 'zh-CN', name: nameZh },
        { locale: 'en-US', name: nameEn },
      ],
    };
    if (editingId) {
      await fetch(`/api/menu/categories/${editingId}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    } else {
      await fetch('/api/menu/categories', { method: 'POST', headers, body: JSON.stringify(body) });
    }
    setShowForm(false);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirm') + '?')) return;
    await fetch(`/api/menu/categories/${id}`, { method: 'DELETE', headers });
    fetchCategories();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('admin.categories')}</h2>
        <button className="btn btn-primary" onClick={() => startEdit(null)}>{t('common.add')}</button>
      </div>

      {/* Edit form */}
      {showForm && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>中文名称</label>
              <input className="input" value={nameZh} onChange={e => setNameZh(e.target.value)} placeholder="中文名称" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>English Name</label>
              <input className="input" value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="English Name" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>排序</label>
              <input className="input" type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} style={{ width: 80 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleSave}>{t('common.save')}</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left' }}>排序</th>
              <th style={{ padding: '10px 16px', textAlign: 'left' }}>中文</th>
              <th style={{ padding: '10px 16px', textAlign: 'left' }}>English</th>
              <th style={{ padding: '10px 16px', textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {categories.sort((a, b) => a.sortOrder - b.sortOrder).map(cat => (
              <tr key={cat._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 16px' }}>{cat.sortOrder}</td>
                <td style={{ padding: '10px 16px', fontWeight: 600 }}>{cat.translations.find(t2 => t2.locale === 'zh-CN')?.name}</td>
                <td style={{ padding: '10px 16px' }}>{cat.translations.find(t2 => t2.locale === 'en-US')?.name}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => startEdit(cat)}>{t('common.edit')}</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--red-primary)' }} onClick={() => handleDelete(cat._id)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
