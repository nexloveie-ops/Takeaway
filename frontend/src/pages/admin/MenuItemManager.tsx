import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface Translation { locale: string; name: string; description?: string; }
interface Category { _id: string; translations: Translation[]; }
interface AllergenData { _id: string; name: string; icon: string; translations: { locale: string; name: string }[]; }
interface MenuItem {
  _id: string; categoryId: string; price: number; calories?: number;
  avgWaitMinutes?: number; photoUrl?: string; arFileUrl?: string;
  isSoldOut?: boolean; translations: Translation[]; allergenIds?: string[];
}

const emptyForm = { categoryId: '', price: 0, calories: 0, avgWaitMinutes: 0, nameZh: '', nameEn: '', descZh: '', descEn: '', allergenIds: [] as string[] };

export default function MenuItemManager() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allergens, setAllergens] = useState<AllergenData[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [uploadingArId, setUploadingArId] = useState<string | null>(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    const [catRes, itemRes, allergenRes] = await Promise.all([
      fetch('/api/menu/categories', { headers: authHeaders }),
      fetch('/api/menu/items', { headers: authHeaders }),
      fetch('/api/allergens', { headers: authHeaders }),
    ]);
    if (catRes.ok) setCategories(await catRes.json());
    if (itemRes.ok) setItems(await itemRes.json());
    if (allergenRes.ok) setAllergens(await allergenRes.json());
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startEdit = (item: MenuItem | null) => {
    if (item) {
      setForm({
        categoryId: item.categoryId,
        price: item.price,
        calories: item.calories || 0,
        avgWaitMinutes: item.avgWaitMinutes || 0,
        nameZh: item.translations.find(t2 => t2.locale === 'zh-CN')?.name || '',
        nameEn: item.translations.find(t2 => t2.locale === 'en-US')?.name || '',
        descZh: item.translations.find(t2 => t2.locale === 'zh-CN')?.description || '',
        descEn: item.translations.find(t2 => t2.locale === 'en-US')?.description || '',
        allergenIds: item.allergenIds || [],
      });
      setEditingId(item._id);
    } else {
      setForm({ ...emptyForm, categoryId: categories[0]?._id || '' });
      setEditingId(null);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    const body = {
      categoryId: form.categoryId, price: form.price,
      calories: form.calories, avgWaitMinutes: form.avgWaitMinutes,
      allergenIds: form.allergenIds,
      translations: [
        { locale: 'zh-CN', name: form.nameZh, description: form.descZh },
        { locale: 'en-US', name: form.nameEn, description: form.descEn },
      ],
    };
    if (editingId) {
      await fetch(`/api/menu/items/${editingId}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    } else {
      await fetch('/api/menu/items', { method: 'POST', headers, body: JSON.stringify(body) });
    }
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirm') + '?')) return;
    await fetch(`/api/menu/items/${id}`, { method: 'DELETE', headers });
    fetchData();
  };

  const uploadPhoto = async (id: string, file: File) => {
    const fd = new FormData(); fd.append('photo', file);
    await fetch(`/api/menu/items/${id}/photo`, { method: 'POST', headers: authHeaders, body: fd });
    fetchData();
  };

  const uploadAR = async (id: string, file: File) => {
    const fd = new FormData(); fd.append('ar', file);
    await fetch(`/api/menu/items/${id}/ar`, { method: 'POST', headers: authHeaders, body: fd });
    fetchData();
  };

  const getCatName = (catId: string) => {
    const cat = categories.find(c => c._id === catId);
    return cat?.translations.find(t2 => t2.locale === 'zh-CN')?.name || '';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('admin.menuItems')}</h2>
        <button className="btn btn-primary" onClick={() => startEdit(null)}>{t('common.add')}</button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>分类</label>
              <select className="input" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map(c => <option key={c._id} value={c._id}>{c.translations.find(t2 => t2.locale === 'zh-CN')?.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>价格</label>
              <input className="input" type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>热量 (卡)</label>
              <input className="input" type="number" value={form.calories} onChange={e => setForm({ ...form, calories: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>等待时间 (分钟)</label>
              <input className="input" type="number" value={form.avgWaitMinutes} onChange={e => setForm({ ...form, avgWaitMinutes: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>中文名称</label>
              <input className="input" value={form.nameZh} onChange={e => setForm({ ...form, nameZh: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>English Name</label>
              <input className="input" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>中文描述</label>
              <textarea className="input" value={form.descZh} onChange={e => setForm({ ...form, descZh: e.target.value })} rows={2} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>English Description</label>
              <textarea className="input" value={form.descEn} onChange={e => setForm({ ...form, descEn: e.target.value })} rows={2} />
            </div>
          </div>
          {allergens.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 6 }}>过敏原</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allergens.map(a => {
                  const checked = form.allergenIds.includes(a._id);
                  return (
                    <label key={a._id} style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                      borderRadius: 6, fontSize: 13, cursor: 'pointer',
                      background: checked ? 'var(--red-light)' : 'var(--bg)',
                      border: checked ? '1px solid var(--red-primary)' : '1px solid var(--border)',
                      color: checked ? 'var(--red-primary)' : 'var(--text-secondary)',
                    }}>
                      <input type="checkbox" checked={checked} style={{ display: 'none' }}
                        onChange={() => {
                          setForm(prev => ({
                            ...prev,
                            allergenIds: checked
                              ? prev.allergenIds.filter(id => id !== a._id)
                              : [...prev.allergenIds, a._id],
                          }));
                        }} />
                      <span>{a.icon}</span>
                      <span>{a.translations.find(t2 => t2.locale === 'zh-CN')?.name || a.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary" onClick={handleSave}>{t('common.save')}</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>照片</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>名称</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>分类</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>价格</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>过敏原</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>AR</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>状态</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 12px' }}>
                  <label style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 6,
                      background: item.photoUrl ? `url(${item.photoUrl}) center/cover` : 'var(--bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>
                      {!item.photoUrl && '📷'}
                    </div>
                    <input type="file" accept="image/*" hidden onChange={e => { if (e.target.files?.[0]) { uploadPhoto(item._id, e.target.files[0]); e.target.value = ''; } }} />
                  </label>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{item.translations.find(t2 => t2.locale === 'zh-CN')?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{item.translations.find(t2 => t2.locale === 'en-US')?.name}</div>
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{getCatName(item.categoryId)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--red-primary)' }}>€{item.price}</td>
                <td style={{ padding: '8px 12px' }}>
                  {(item.allergenIds || []).map(aid => {
                    const a = allergens.find(al => al._id === aid);
                    return a ? <span key={aid} title={a.translations.find(t2 => t2.locale === 'zh-CN')?.name || a.name} style={{ marginRight: 2 }}>{a.icon}</span> : null;
                  })}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  {item.arFileUrl ? (
                    <span style={{ color: 'var(--green)', fontSize: 16 }}>✓ AR</span>
                  ) : (
                    <label style={{ cursor: 'pointer' }}>
                      <span className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px', display: 'inline-block' }}>上传 AR</span>
                      <input type="file" accept=".usdz" hidden onChange={e => { if (e.target.files?.[0]) { uploadAR(item._id, e.target.files[0]); e.target.value = ''; } }} />
                    </label>
                  )}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  {item.isSoldOut
                    ? <span className="badge" style={{ background: 'var(--red-light)', color: 'var(--red-primary)' }}>售罄</span>
                    : <span className="badge" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>在售</span>}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => startEdit(item)}>{t('common.edit')}</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--red-primary)' }} onClick={() => handleDelete(item._id)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
