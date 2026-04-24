import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface DaySchedule {
  open: string;
  close: string;
  enabled: boolean;
}

type WeeklySchedule = Record<string, DaySchedule>;

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS_ZH: Record<string, string> = {
  mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日',
};
const DAY_LABELS_EN: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

const DEFAULT_SCHEDULE: WeeklySchedule = {
  mon: { open: '11:00', close: '22:00', enabled: true },
  tue: { open: '11:00', close: '22:00', enabled: true },
  wed: { open: '11:00', close: '22:00', enabled: true },
  thu: { open: '11:00', close: '22:00', enabled: true },
  fri: { open: '11:00', close: '22:00', enabled: true },
  sat: { open: '11:00', close: '22:00', enabled: true },
  sun: { open: '11:00', close: '22:00', enabled: true },
};

export default function BusinessHours() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('Europe/Dublin');
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  const isZh = i18n.language?.startsWith('zh');
  const dayLabels = isZh ? DAY_LABELS_ZH : DAY_LABELS_EN;

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/business-hours');
      if (res.ok) {
        const data = await res.json();
        if (data.schedule) setSchedule(data.schedule);
        if (data.closedDates) setClosedDates(data.closedDates);
        if (data.timezone) setTimezone(data.timezone);
        setIsOpen(data.isOpen);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/business-hours', {
        method: 'PUT', headers,
        body: JSON.stringify({ schedule, closedDates, timezone }),
      });
      if (res.ok) {
        setSaved(true);
        fetchData();
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const updateDay = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const addClosedDate = () => {
    if (!newDate || closedDates.includes(newDate)) return;
    setClosedDates(prev => [...prev, newDate].sort());
    setNewDate('');
  };

  const removeClosedDate = (date: string) => {
    setClosedDates(prev => prev.filter(d => d !== date));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          {isZh ? '🕐 营业时间设置' : '🕐 Business Hours'}
        </h2>
        {isOpen !== null && (
          <span style={{
            fontSize: 12, padding: '3px 10px', borderRadius: 12,
            background: isOpen ? '#e8f5e9' : '#ffebee',
            color: isOpen ? '#2e7d32' : '#c62828',
            fontWeight: 600,
          }}>
            {isOpen ? (isZh ? '营业中' : 'Open Now') : (isZh ? '已打烊' : 'Closed')}
          </span>
        )}
      </div>

      {/* Timezone */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          {isZh ? '时区' : 'Timezone'}
        </h3>
        <select
          className="input"
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          style={{ maxWidth: 300 }}
        >
          <option value="Europe/Dublin">Europe/Dublin (GMT/IST)</option>
          <option value="Europe/London">Europe/London (GMT/BST)</option>
          <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
          <option value="Asia/Hong_Kong">Asia/Hong Kong (HKT)</option>
          <option value="America/New_York">America/New York (EST/EDT)</option>
          <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
        </select>
      </div>

      {/* Weekly Schedule */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          {isZh ? '每周营业时间' : 'Weekly Schedule'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DAY_KEYS.map(day => (
            <div key={day} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 12px', borderRadius: 8,
              background: schedule[day]?.enabled ? '#f8f9fa' : '#fafafa',
              opacity: schedule[day]?.enabled ? 1 : 0.6,
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 100, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={schedule[day]?.enabled ?? true}
                  onChange={e => updateDay(day, 'enabled', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{dayLabels[day]}</span>
              </label>
              {schedule[day]?.enabled ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    className="input"
                    value={schedule[day]?.open || '11:00'}
                    onChange={e => {
                      const v = e.target.value.replace(/[^\d:]/g, '');
                      updateDay(day, 'open', v);
                    }}
                    placeholder="HH:mm"
                    maxLength={5}
                    style={{ width: 80, textAlign: 'center', fontFamily: 'monospace', fontSize: 14 }}
                  />
                  <span style={{ color: 'var(--text-light)' }}>—</span>
                  <input
                    type="text"
                    className="input"
                    value={schedule[day]?.close || '22:00'}
                    onChange={e => {
                      const v = e.target.value.replace(/[^\d:]/g, '');
                      updateDay(day, 'close', v);
                    }}
                    placeholder="HH:mm"
                    maxLength={5}
                    style={{ width: 80, textAlign: 'center', fontFamily: 'monospace', fontSize: 14 }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-light)' }}>
                  {isZh ? '休息' : 'Closed'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Closed Dates */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
          {isZh ? '🚫 特殊休息日' : '🚫 Closed Dates'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>
          {isZh ? '设置的日期将全天不营业，优先级高于每周营业时间。' : 'These dates override the weekly schedule. The shop will be closed all day.'}
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="date"
            className="input"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            style={{ width: 180 }}
          />
          <button className="btn btn-primary" onClick={addClosedDate} disabled={!newDate}
            style={{ padding: '6px 16px', fontSize: 13 }}>
            {isZh ? '添加' : 'Add'}
          </button>
        </div>
        {closedDates.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {closedDates.map(date => (
              <div key={date} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 16,
                background: '#ffebee', fontSize: 13,
              }}>
                <span>{date}</span>
                <button
                  onClick={() => removeClosedDate(date)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#c62828', fontSize: 14, padding: 0, lineHeight: 1,
                  }}
                >×</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-light)', fontSize: 13 }}>
            {isZh ? '暂无特殊休息日' : 'No closed dates set'}
          </div>
        )}
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? (isZh ? '保存中...' : 'Saving...') : t('common.save')}
        </button>
        {saved && (
          <span style={{ color: '#2e7d32', fontSize: 13 }}>
            ✅ {t('admin.savedSuccess')}
          </span>
        )}
      </div>
    </div>
  );
}
