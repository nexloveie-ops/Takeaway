import { Outlet, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useRestaurant } from '../context/RestaurantContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { matchBundles, calcBundleTotal, type OfferData } from '../utils/bundleMatcher';

export default function CustomerLayout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { totalItems, totalAmount, items: cartItems, getItemKey } = useCart();
  const restaurant = useRestaurant();
  const isZh = i18n.language?.startsWith('zh');
  const shopName = isZh ? (restaurant.nameZh || restaurant.nameEn) : (restaurant.nameEn || restaurant.nameZh);
  const table = searchParams.get('table');
  const seat = searchParams.get('seat');
  const qs = searchParams.toString();

  const isCartPage = location.pathname.includes('/cart');

  const [offers, setOffers] = useState<OfferData[]>([]);
  const [menuItemCats, setMenuItemCats] = useState<Record<string, string>>({});
  const [businessStatus, setBusinessStatus] = useState<{
    isOpen: boolean;
    reason: string;
    todayOpen?: string;
    todayClose?: string;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetch('/api/business-hours')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setBusinessStatus(data);
        setStatusLoading(false);
      })
      .catch(() => setStatusLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/offers').then(r => r.ok ? r.json() : []).then(setOffers).catch(() => {});
    fetch('/api/menu/items').then(r => r.ok ? r.json() : []).then((data: { _id: string; categoryId: string }[]) => {
      const map: Record<string, string> = {};
      for (const item of data) map[item._id] = item.categoryId;
      setMenuItemCats(map);
    }).catch(() => {});
  }, []);

  const finalTotal = useMemo(() => {
    if (offers.length === 0 || cartItems.length === 0) return totalAmount;
    const entries = cartItems.map(ci => ({
      key: getItemKey(ci),
      menuItemId: ci.menuItemId,
      categoryId: menuItemCats[ci.menuItemId] || '',
      basePrice: ci.price,
      optionExtra: (ci.options || []).reduce((s, o) => s + o.extraPrice, 0),
      quantity: ci.quantity,
    }));
    const matched = matchBundles(entries, offers);
    return calcBundleTotal(entries, matched).finalTotal;
  }, [cartItems, offers, menuItemCats, totalAmount, getItemKey]);

  const hasDiscount = finalTotal < totalAmount;

  const goToCart = () => {
    navigate(`/customer/cart${qs ? '?' + qs : ''}`);
  };

  // Show loading while checking business status
  if (statusLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-cream)' }}>
        <div style={{ color: 'var(--text-light)', fontSize: 14 }}>{t('common.loading')}</div>
      </div>
    );
  }

  // Show closed page if not open
  if (businessStatus && !businessStatus.isOpen) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: 20, textAlign: 'center', background: 'var(--bg-cream)',
        maxWidth: 430, margin: '0 auto', width: '100%',
      }}>
        {/* Language switcher */}
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <LanguageSwitcher />
        </div>

        {/* Branding */}
        <div style={{
          background: 'linear-gradient(135deg, #8B1A1A 0%, #C41E24 50%, #D4342A 100%)',
          borderRadius: 16, padding: '40px 32px', marginBottom: 32, width: '100%', maxWidth: 340,
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 26, fontWeight: 700, letterSpacing: 3, marginBottom: 4 }}>
              {restaurant.nameZh || restaurant.nameEn}
            </h1>
            <div style={{ fontSize: 12, fontWeight: 300, letterSpacing: 6, color: '#F0D68A', textTransform: 'uppercase' }}>
              {restaurant.nameEn || restaurant.nameZh}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 56, marginBottom: 16 }}>🌙</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          {t('customer.shopClosed')}
        </h2>
        <p style={{ color: 'var(--text-light)', fontSize: 14, maxWidth: 300, lineHeight: 1.6 }}>
          {businessStatus.reason === 'closed_today'
            ? t('customer.closedToday')
            : businessStatus.reason === 'day_off'
              ? t('customer.dayOff')
              : t('customer.outsideHours')
          }
        </p>
        {businessStatus.todayOpen && businessStatus.todayClose && (
          <div style={{
            marginTop: 20, padding: '12px 24px', borderRadius: 12,
            background: 'var(--bg-white)', border: '1px solid var(--border-light)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>
              {t('customer.todayHours')}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {businessStatus.todayOpen} — {businessStatus.todayClose}
            </div>
          </div>
        )}
      </div>
    );
  }

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
            {shopName}
          </span>
          {table && seat && (
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
              🪑 Table {table} · Seat {seat}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageSwitcher />
          {!isCartPage && totalItems > 0 && (
            <div onClick={goToCart} style={{
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--red-primary)', color: '#fff',
              borderRadius: 20, padding: '5px 12px 5px 8px',
            }}>
              <div style={{ position: 'relative', fontSize: 18 }}>
                🛒
                <span style={{
                  position: 'absolute', top: -6, right: -8,
                  background: '#F9A825', color: '#000',
                  fontSize: 9, fontWeight: 700, width: 16, height: 16,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{totalItems}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                {hasDiscount && (
                  <span style={{ fontSize: 10, textDecoration: 'line-through', opacity: 0.6 }}>€{totalAmount.toFixed(2)}</span>
                )}
                <span style={{ fontSize: 14, fontWeight: 700 }}>€{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
