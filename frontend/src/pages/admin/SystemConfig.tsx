import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface ConfigEntry { key: string; value: string; }

const STRIPE_KEYS = ['stripe_publishable_key', 'stripe_secret_key'];

export default function SystemConfig() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/admin/config', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setConfigs(data);
        const map: Record<string, string> = {};
        data.forEach((c: ConfigEntry) => { map[c.key] = c.value; });
        setEdits(map);
      } else {
        const entries = Object.entries(data).map(([key, value]) => ({ key, value: String(value) }));
        setConfigs(entries);
        setEdits(data);
      }
    }
  }, [token]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/config', { method: 'PUT', headers, body: JSON.stringify(edits) });
      fetchConfig();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const configLabels: Record<string, string> = {
    receipt_print_copies: '小票打印份数',
    restaurant_name: '餐厅名称',
    stripe_publishable_key: 'Stripe 公钥 (Publishable Key)',
    stripe_secret_key: 'Stripe 密钥 (Secret Key)',
  };

  // Separate general configs from Stripe configs
  const generalConfigs = configs.filter(c => !STRIPE_KEYS.includes(c.key));
  const stripeConfigs = STRIPE_KEYS.map(key => {
    const existing = configs.find(c => c.key === key);
    return existing || { key, value: '' };
  });

  const maskValue = (value: string) => {
    if (!value || value.length <= 8) return value;
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{t('admin.systemConfig')}</h2>

      {/* General Config */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
          基本设置
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {generalConfigs.map(c => (
            <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ width: 180, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
                {configLabels[c.key] || c.key}
              </label>
              <input
                className="input"
                value={edits[c.key] || ''}
                onChange={e => setEdits(prev => ({ ...prev, [c.key]: e.target.value }))}
                style={{ maxWidth: 300 }}
              />
            </div>
          ))}
          {generalConfigs.length === 0 && (
            <div style={{ color: 'var(--text-light)', textAlign: 'center', padding: 20 }}>暂无配置项</div>
          )}
        </div>
      </div>

      {/* Stripe Config */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            💳 Stripe 收款配置
          </h3>
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'var(--primary)' }}
          >
            获取密钥 →
          </a>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>
          配置 Stripe 密钥后，顾客可以使用在线支付（信用卡、Apple Pay、Google Pay）。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {stripeConfigs.map(c => {
            const isSecret = c.key === 'stripe_secret_key';
            const currentValue = edits[c.key] || '';
            const displayValue = isSecret && !showSecret ? currentValue : currentValue;

            return (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ width: 220, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {configLabels[c.key]}
                </label>
                <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
                  <input
                    className="input"
                    type={isSecret && !showSecret ? 'password' : 'text'}
                    value={displayValue}
                    onChange={e => setEdits(prev => ({ ...prev, [c.key]: e.target.value }))}
                    placeholder={isSecret ? 'sk_live_...' : 'pk_live_...'}
                    style={{ width: '100%', paddingRight: isSecret ? 40 : undefined, fontFamily: 'monospace', fontSize: 13 }}
                  />
                  {isSecret && (
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4,
                        color: 'var(--text-light)',
                      }}
                      title={showSecret ? '隐藏' : '显示'}
                    >
                      {showSecret ? '🙈' : '👁️'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {edits['stripe_publishable_key'] && edits['stripe_secret_key'] && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 6,
            background: '#e8f5e9', color: '#2e7d32', fontSize: 13,
          }}>
            ✅ Stripe 密钥已配置
          </div>
        )}
        {(!edits['stripe_publishable_key'] || !edits['stripe_secret_key']) && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 6,
            background: '#fff3e0', color: '#e65100', fontSize: 13,
          }}>
            ⚠️ 请填写公钥和密钥以启用在线支付
          </div>
        )}
      </div>

      {/* Save Button */}
      <div style={{ marginTop: 20 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>
    </div>
  );
}
