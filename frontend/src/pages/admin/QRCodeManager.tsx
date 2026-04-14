import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';

interface QRItem { label: string; url: string; dataUrl: string; }

export default function QRCodeManager() {
  const { t } = useTranslation();
  const [tables, setTables] = useState(5);
  const [seatsPerTable, setSeatsPerTable] = useState(4);
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const generate = useCallback(async () => {
    setGenerating(true);
    const items: QRItem[] = [];

    // Dine-in QR codes
    for (let table = 1; table <= tables; table++) {
      for (let seat = 1; seat <= seatsPerTable; seat++) {
        const url = `${baseUrl}/customer?table=${table}&seat=${seat}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
        items.push({ label: `${t('cashier.table')} ${table} · ${t('cashier.seat')} ${seat}`, url, dataUrl });
      }
    }

    // Takeout QR code
    const takeoutUrl = `${baseUrl}/customer?type=takeout`;
    const takeoutDataUrl = await QRCode.toDataURL(takeoutUrl, { width: 200, margin: 1 });
    items.push({ label: t('cashier.takeout'), url: takeoutUrl, dataUrl: takeoutDataUrl });

    setQrItems(items);
    setGenerating(false);
  }, [tables, seatsPerTable, baseUrl, t]);

  useEffect(() => { generate(); }, []);

  const printAll = () => {
    const w = window.open('', '_blank');
    if (!w || !printRef.current) return;
    w.document.write(`<html><head><title>QR Codes</title><style>
      body { font-family: 'Noto Sans SC', sans-serif; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 20px; }
      .qr-card { text-align: center; border: 1px solid #ddd; padding: 16px; border-radius: 8px; page-break-inside: avoid; }
      .qr-card img { width: 160px; height: 160px; }
      .qr-card .label { font-weight: 600; margin-top: 8px; font-size: 14px; }
      .qr-card .url { font-size: 10px; color: #999; word-break: break-all; }
      @media print { .grid { gap: 12px; } }
    </style></head><body><div class="grid">`);
    for (const item of qrItems) {
      w.document.write(`<div class="qr-card"><img src="${item.dataUrl}" /><div class="label">${item.label}</div><div class="url">${item.url}</div></div>`);
    }
    w.document.write('</div></body></html>');
    w.document.close();
    setTimeout(() => { w.print(); }, 300);
  };

  const printSingle = (item: QRItem) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${item.label}</title><style>
      body { font-family: 'Noto Sans SC', sans-serif; text-align: center; padding: 40px; }
      img { width: 240px; height: 240px; }
      .label { font-weight: 700; font-size: 20px; margin-top: 12px; }
      .url { font-size: 11px; color: #999; margin-top: 8px; }
    </style></head><body>
      <img src="${item.dataUrl}" /><div class="label">${item.label}</div><div class="url">${item.url}</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 300);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('admin.qrCodes', 'QR码管理')}</h2>
        <button className="btn btn-primary" onClick={printAll} disabled={qrItems.length === 0}>
          🖨️ {t('cashier.printReceipt', '打印全部')}
        </button>
      </div>

      {/* Config */}
      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>桌数</label>
          <input className="input" type="number" min={1} value={tables} onChange={e => setTables(Number(e.target.value))} style={{ width: 100 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>每桌座位数</label>
          <input className="input" type="number" min={1} value={seatsPerTable} onChange={e => setSeatsPerTable(Number(e.target.value))} style={{ width: 100 }} />
        </div>
        <button className="btn btn-gold" onClick={generate} disabled={generating}>
          {generating ? t('common.loading') : '生成 QR 码'}
        </button>
      </div>

      {/* QR Grid */}
      <div ref={printRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {qrItems.map((item, idx) => (
          <div key={idx} className="card" style={{ padding: 16, textAlign: 'center', cursor: 'pointer' }}
            onClick={() => printSingle(item)}>
            <img src={item.dataUrl} alt={item.label} style={{ width: 140, height: 140 }} />
            <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8 }}>{item.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 4, wordBreak: 'break-all' }}>{item.url}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
