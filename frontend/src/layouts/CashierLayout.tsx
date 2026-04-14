import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

export default function CashierLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [clock, setClock] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'));
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '12px 24px', fontWeight: isActive ? 700 : 500, fontSize: 14,
    color: isActive ? 'var(--red-primary)' : 'var(--text-secondary)',
    borderBottom: isActive ? '3px solid var(--red-primary)' : '3px solid transparent',
    background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
    textDecoration: 'none', display: 'inline-block',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 20px', background: 'var(--bg-white)',
        borderBottom: '2px solid var(--border)', flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--red-primary)', fontFamily: 'var(--font-heading)' }}>
          港知味 · {t('cashier.title')}
        </h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          <span className="badge" style={{ background: '#F3E5F5', color: '#7B1FA2', padding: '4px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>{clock}</span>
          <span style={{ fontWeight: 600 }}>{user?.username}</span>
          <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleLogout}>
            {t('login.logout', '退出')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: 0, background: 'var(--bg-white)',
        borderBottom: '2px solid var(--border)', flexShrink: 0, paddingLeft: 16,
      }}>
        <NavLink to="/cashier" end style={({ isActive }) => tabStyle(isActive)}>
          {t('cashier.dineIn')}
        </NavLink>
        <NavLink to="/cashier/order" style={({ isActive }) => tabStyle(isActive)}>
          {t('cashier.newOrder', '点单')}
        </NavLink>
        <NavLink to="/cashier/takeout" style={({ isActive }) => tabStyle(isActive)}>
          {t('cashier.takeout')}
        </NavLink>
        <NavLink to="/cashier/delivery" style={({ isActive }) => tabStyle(isActive)}>
          {t('cashier.delivery')}
        </NavLink>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <Outlet />
      </div>
    </div>
  );
}
