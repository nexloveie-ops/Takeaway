import { Outlet, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function CustomerLayout() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const table = searchParams.get('table');
  const seat = searchParams.get('seat');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 430, margin: '0 auto', width: '100%', background: 'var(--bg-cream)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', background: 'var(--bg-white)',
        borderBottom: '1px solid var(--border-light)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, color: 'var(--red-primary)' }}>
            港知味
          </span>
          {table && seat && (
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
              🪑 {t('cashier.table')} {table} · {t('cashier.seat')} {seat}
            </span>
          )}
        </div>
        <LanguageSwitcher />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
