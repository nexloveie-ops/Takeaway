import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const CONFIG_KEYS = [
  'restaurant_name_zh',
  'restaurant_name_en',
  'restaurant_address',
  'restaurant_phone',
  'restaurant_website',
  'restaurant_email',
  'receipt_terms',
] as const;

type ConfigKey = (typeof CONFIG_KEYS)[number];

const FIELD_I18N: Record<ConfigKey, string> = {
  restaurant_name_zh: 'admin.restaurantNameZh',
  restaurant_name_en: 'admin.restaurantNameEn',
  restaurant_address: 'admin.restaurantAddress',
  restaurant_phone: 'admin.restaurantPhone',
  restaurant_website: 'admin.restaurantWebsite',
  restaurant_email: 'admin.restaurantEmail',
  receipt_terms: 'admin.receiptTerms',
};

export default function RestaurantInfo() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [values, setValues] = useState<Record<ConfigKey, string>>(() => {
    const init: Record<string, string> = {};
    CONFIG_KEYS.forEach(k => { init[k] = ''; });
    return init as Record<ConfigKey, string>;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Record<string, string> = await res.json();
        setValues(prev => {
          const next = { ...prev };
          CONFIG_KEYS.forEach(k => {
            if (data[k] !== undefined) next[k] = data[k];
          });
          return next;
        });
      }
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleChange = (key: ConfigKey, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const body: Record<string, string> = {};
      CONFIG_KEYS.forEach(k => { body[k] = values[k]; });
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) setSaved(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{t('admin.restaurantInfo')}</h2>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CONFIG_KEYS.map(key => (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: key === 'receipt_terms' ? 'flex-start' : 'center', gap: 16 }}>
                <label style={{ width: 180, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', flexShrink: 0, paddingTop: key === 'receipt_terms' ? 8 : 0 }}>
                  {t(FIELD_I18N[key])}
                </label>
                {key === 'receipt_terms' ? (
                  <div style={{ flex: 1, maxWidth: 400 }}>
                    <textarea
                      className="input"
                      value={values[key]}
                      onChange={e => handleChange(key, e.target.value)}
                      rows={5}
                      style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>
                      {t('admin.receiptTermsHelp')}
                    </div>
                  </div>
                ) : (
                  <input
                    className="input"
                    value={values[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    style={{ maxWidth: 400, flex: 1 }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </button>
          {saved && (
            <span style={{ color: 'green', fontSize: 13 }}>✓ {t('admin.savedSuccess')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
