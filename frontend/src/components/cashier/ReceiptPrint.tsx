import { useEffect, useState, useRef } from 'react';

interface ReceiptOrderItem {
  _id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  itemName: string;
  itemNameEn?: string;
  selectedOptions?: { groupName: string; choiceName: string; extraPrice: number }[];
}

interface ReceiptOrder {
  _id: string;
  type: 'dine_in' | 'takeout';
  tableNumber?: number;
  seatNumber?: number;
  dailyOrderNumber?: number;
  status: string;
  items: ReceiptOrderItem[];
}

interface ReceiptData {
  checkoutId: string;
  type: 'table' | 'seat';
  tableNumber?: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'mixed';
  cashAmount?: number;
  cardAmount?: number;
  checkedOutAt: string;
  orders: ReceiptOrder[];
}

interface RestaurantConfig {
  restaurant_name_en?: string;
  restaurant_name_zh?: string;
  restaurant_address?: string;
  restaurant_phone?: string;
  restaurant_website?: string;
  restaurant_email?: string;
  receipt_terms?: string;
  receipt_print_copies?: string;
}

interface ReceiptPrintProps {
  checkoutId: string;
  cashReceived?: number;
  changeAmount?: number;
}

function parseQRCodes(text: string): Array<{ type: 'text' | 'qr'; value: string }> {
  const segments: Array<{ type: 'text' | 'qr'; value: string }> = [];
  const regex = /\[QR:(.*?)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    segments.push({ type: 'qr', value: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) segments.push({ type: 'text', value: text.slice(lastIndex) });
  return segments;
}

export default function ReceiptPrint({ checkoutId, cashReceived, changeAmount }: ReceiptPrintProps) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [config, setConfig] = useState<RestaurantConfig>({});
  const [copies, setCopies] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printedRef = useRef(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [receiptRes, configRes] = await Promise.all([
          fetch(`/api/checkout/receipt/${checkoutId}`),
          fetch('/api/admin/config'),
        ]);
        if (!receiptRes.ok) throw new Error('Failed to fetch receipt');
        setReceipt(await receiptRes.json());
        if (configRes.ok) {
          const c: Record<string, string> = await configRes.json();
          setConfig(c);
          if (c.receipt_print_copies) setCopies(parseInt(c.receipt_print_copies, 10) || 1);
        }
      } catch {
        setError('Error loading receipt');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [checkoutId]);

  useEffect(() => {
    if (receipt && !printedRef.current) {
      printedRef.current = true;
      const timer = setTimeout(() => {
        for (let i = 0; i < copies; i++) window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [receipt, copies]);

  // Portal: inject receipt HTML into a root-level div for clean printing
  useEffect(() => {
    if (!receipt) return;
    let printRoot = document.getElementById('receipt-print-root');
    if (!printRoot) {
      printRoot = document.createElement('div');
      printRoot.id = 'receipt-print-root';
      document.body.appendChild(printRoot);
    }
    // Small delay to ensure DOM is rendered
    const timer = setTimeout(() => {
      const receiptEl = document.getElementById('receipt-content');
      if (receiptEl && printRoot) {
        printRoot.innerHTML = receiptEl.outerHTML;
      }
    }, 100);
    return () => {
      clearTimeout(timer);
      if (printRoot) printRoot.innerHTML = '';
    };
  }, [receipt, config, cashReceived, changeAmount]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!receipt) return null;

  const isDineIn = receipt.orders.some(o => o.type === 'dine_in');
  const checkedOutAt = new Date(receipt.checkedOutAt);

  const paymentLabel =
    receipt.paymentMethod === 'cash' ? 'Cash' :
    receipt.paymentMethod === 'card' ? 'Card' : 'Mixed';

  // Always use English restaurant name
  const restaurantName = config.restaurant_name_en || config.restaurant_name_zh || '';
  const termsSegments = config.receipt_terms ? parseQRCodes(config.receipt_terms) : [];

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#receipt-print-root) { display: none !important; }
          #receipt-print-root { display: block !important; }
          #receipt-print-root .receipt-box {
            display: block !important;
            position: static !important;
            margin: 0 !important;
          }
        }
        #receipt-print-root { display: none; }
        .receipt-box {
          font-family: monospace;
          max-width: 300px;
          margin: 0 auto;
          padding: 16px;
          font-size: 12px;
          color: #000;
        }
        .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
        .receipt-items { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .receipt-items td { padding: 2px 0; }
        .receipt-items .item-qty { text-align: center; width: 30px; }
        .receipt-items .item-amount { text-align: right; }
        .receipt-divider { border-top: 1px dashed #000; margin: 8px 0; }
        .receipt-row { display: flex; justify-content: space-between; margin: 2px 0; }
        .receipt-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
        .receipt-footer { text-align: center; margin-top: 12px; border-top: 1px dashed #000; padding-top: 8px; font-size: 11px; }
        .receipt-terms { text-align: center; margin-top: 8px; border-top: 1px dashed #000; padding-top: 8px; font-size: 10px; white-space: pre-line; }
      `}</style>
      <div id="receipt-content" className="receipt-box">
        {/* Header: Restaurant Info */}
        <div className="receipt-header">
          {restaurantName && <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 2 }}>{restaurantName}</div>}
          {config.restaurant_address && <div style={{ fontSize: 10 }}>{config.restaurant_address}</div>}
          {config.restaurant_phone && <div style={{ fontSize: 10 }}>Tel: {config.restaurant_phone}</div>}
          {config.restaurant_website && <div style={{ fontSize: 10 }}>{config.restaurant_website}</div>}
          {config.restaurant_email && <div style={{ fontSize: 10 }}>{config.restaurant_email}</div>}
          <div style={{ marginTop: 6 }}>
            {isDineIn ? (
              <>
                <div>Table: {receipt.tableNumber}</div>
                <div style={{ fontSize: 10 }}>Order: {String(receipt.checkoutId).slice(-8).toUpperCase()}</div>
              </>
            ) : (
              <div>Pickup #: {receipt.orders[0]?.dailyOrderNumber}</div>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="receipt-items">
          <tbody>
            {receipt.orders.flatMap(order =>
              order.items.map(item => (
                <tr key={item._id}>
                  <td>
                    <div>{item.itemName}</div>
                    {item.itemNameEn && item.itemNameEn !== item.itemName && (
                      <div style={{ fontSize: 10, color: '#666' }}>{item.itemNameEn}</div>
                    )}
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div style={{ fontSize: 9, color: '#888', paddingLeft: 4 }}>
                        {item.selectedOptions.map((opt, i) => (
                          <span key={i}>{i > 0 ? ', ' : ''}{opt.choiceName}{opt.extraPrice > 0 ? ` +€${opt.extraPrice}` : ''}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="item-qty">x{item.quantity}</td>
                  <td className="item-amount">€{(item.unitPrice * item.quantity).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="receipt-divider" />

        {/* Total */}
        <div className="receipt-total">
          <span>Total</span>
          <span>€{receipt.totalAmount.toFixed(2)}</span>
        </div>

        {/* Payment method */}
        <div className="receipt-row" style={{ marginTop: 4 }}>
          <span>Payment</span>
          <span>{paymentLabel}</span>
        </div>

        {/* Mixed payment breakdown */}
        {receipt.paymentMethod === 'mixed' && (
          <>
            <div className="receipt-row">
              <span>Cash</span>
              <span>€{(receipt.cashAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="receipt-row">
              <span>Card</span>
              <span>€{(receipt.cardAmount ?? 0).toFixed(2)}</span>
            </div>
          </>
        )}

        {/* Cash: received + change */}
        {receipt.paymentMethod === 'cash' && cashReceived != null && cashReceived > 0 && (
          <>
            <div className="receipt-divider" />
            <div className="receipt-row">
              <span>Cash Received</span>
              <span>€{cashReceived.toFixed(2)}</span>
            </div>
            {changeAmount != null && changeAmount > 0 && (
              <div className="receipt-row" style={{ fontWeight: 'bold' }}>
                <span>Change</span>
                <span>€{changeAmount.toFixed(2)}</span>
              </div>
            )}
          </>
        )}

        {/* Terms & Conditions */}
        {termsSegments.length > 0 && (
          <div className="receipt-terms">
            {termsSegments.map((seg, idx) =>
              seg.type === 'text' ? (
                <span key={idx}>{seg.value}</span>
              ) : (
                <div key={idx} style={{ margin: '6px auto' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(seg.value)}`}
                    alt="QR"
                    width={100}
                    height={100}
                  />
                </div>
              )
            )}
          </div>
        )}

        {/* Footer: Date/Time */}
        <div className="receipt-footer">
          <div>{checkedOutAt.toLocaleString('en-GB')}</div>
          <div style={{ marginTop: 4, fontSize: 10 }}>Thank you for dining with us!</div>
        </div>
      </div>
    </>
  );
}
