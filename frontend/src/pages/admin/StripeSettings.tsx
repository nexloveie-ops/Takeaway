import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function StripeSettings() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const [publishableKey, setPublishableKey] = useState('');
  const [secretKeyDraft, setSecretKeyDraft] = useState('');
  const [hasSecret, setHasSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stripe-config', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setPublishableKey(typeof data.publishableKey === 'string' ? data.publishableKey : '');
      setHasSecret(!!data.hasSecret);
      setSecretKeyDraft('');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (clearSecret: boolean) => {
    setSaving(true);
    try {
      const body: { publishableKey: string; secretKey?: string; clearSecret?: boolean } = {
        publishableKey,
      };
      if (clearSecret) {
        body.clearSecret = true;
      } else if (secretKeyDraft.trim().length > 0) {
        body.secretKey = secretKeyDraft.trim();
      }
      const res = await fetch('/api/admin/stripe-config', { method: 'PUT', headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error?.message || t('common.error'));
        return;
      }
      setSecretKeyDraft('');
      await load();
      alert(t('admin.savedSuccess'));
    } catch {
      alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-light)' }}>{t('common.loading')}</div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('admin.stripeSettings')}</h2>
      <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 16, maxWidth: 640, lineHeight: 1.5 }}>
        {t('admin.stripeSettingsHelp')}
      </p>

      <div className="card" style={{ padding: 20, maxWidth: 640 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-light)', marginBottom: 6 }}>
            {t('admin.stripePublishableKey')}
          </label>
          <input
            className="input"
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            placeholder="pk_live_... / pk_test_..."
            autoComplete="off"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-light)', marginBottom: 6 }}>
            {t('admin.stripeSecretKey')}
            {hasSecret && (
              <span style={{ marginLeft: 8, color: 'var(--text-secondary)', fontWeight: 400 }}>({t('admin.stripeSecretSaved')})</span>
            )}
          </label>
          <input
            className="input"
            type="password"
            value={secretKeyDraft}
            onChange={(e) => setSecretKeyDraft(e.target.value)}
            placeholder={hasSecret ? t('admin.stripeSecretPlaceholder') : 'sk_live_... / sk_test_...'}
            autoComplete="new-password"
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 6 }}>{t('admin.stripeSecretHint')}</div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={() => save(false)} disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </button>
          {hasSecret && (
            <button
              className="btn btn-outline"
              type="button"
              style={{ color: 'var(--red-primary)' }}
              onClick={() => {
                if (confirm(t('admin.stripeClearSecretConfirm'))) save(true);
              }}
              disabled={saving}
            >
              {t('admin.stripeClearSecret')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
