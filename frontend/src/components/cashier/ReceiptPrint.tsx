import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ReceiptOrderItem {
  _id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  itemName: string;
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

interface ReceiptPrintProps {
  checkoutId: string;
}

export default function ReceiptPrint({ checkoutId }: ReceiptPrintProps) {
  const { t } = useTranslation();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [copies, setCopies] = useState(1);
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
        const receiptData: ReceiptData = await receiptRes.json();
        setReceipt(receiptData);

        if (configRes.ok) {
          const config = await configRes.json();
          if (config.receipt_print_copies) {
            setCopies(parseInt(config.receipt_print_copies, 10) || 1);
          }
        }
      } catch {
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [checkoutId, t]);

  useEffect(() => {
    if (receipt && !printedRef.current) {
      printedRef.current = true;
      // Small delay to ensure DOM is rendered before printing
      const timer = setTimeout(() => {
        for (let i = 0; i < copies; i++) {
          window.print();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [receipt, copies]);

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!receipt) return null;

  const isDineIn = receipt.orders.some(o => o.type === 'dine_in');
  const checkedOutAt = new Date(receipt.checkedOutAt);

  const paymentLabel =
    receipt.paymentMethod === 'cash' ? t('cashier.cash') :
    receipt.paymentMethod === 'card' ? t('cashier.card') :
    t('cashier.mixed');

  return (
    <>
      <style>{`
        @media print {
          body > *:not(.receipt-print-container) { display: none !important; }
          .receipt-print-container { display: block !important; }
          .no-print { display: none !important; }
        }
        .receipt-print-container {
          font-family: monospace;
          max-width: 300px;
          margin: 0 auto;
          padding: 16px;
          font-size: 12px;
        }
        .receipt-header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .receipt-items {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .receipt-items td {
          padding: 2px 0;
        }
        .receipt-items .item-qty {
          text-align: center;
          width: 30px;
        }
        .receipt-items .item-amount {
          text-align: right;
        }
        .receipt-divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .receipt-total {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 14px;
        }
        .receipt-footer {
          text-align: center;
          margin-top: 12px;
          border-top: 1px dashed #000;
          padding-top: 8px;
        }
      `}</style>
      <div className="receipt-print-container">
        <div className="receipt-header">
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>{t('receipt.title')}</div>
          {isDineIn ? (
            <>
              <div>{t('cashier.table')}: {receipt.tableNumber}</div>
              <div>{t('receipt.orderId')}: {receipt.checkoutId}</div>
            </>
          ) : (
            <div>{t('receipt.dailyOrderNumber')}: {receipt.orders[0]?.dailyOrderNumber}</div>
          )}
        </div>

        <table className="receipt-items">
          <tbody>
            {receipt.orders.flatMap(order =>
              order.items.map(item => (
                <tr key={item._id}>
                  <td>{item.itemName}</td>
                  <td className="item-qty">x{item.quantity}</td>
                  <td className="item-amount">€{(item.unitPrice * item.quantity).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="receipt-divider" />

        <div className="receipt-total">
          <span>{t('cashier.total')}</span>
          <span>€{receipt.totalAmount.toFixed(2)}</span>
        </div>

        {receipt.paymentMethod === 'mixed' && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('cashier.cashAmount')}</span>
              <span>€{(receipt.cashAmount ?? 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('cashier.cardAmount')}</span>
              <span>€{(receipt.cardAmount ?? 0).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('cashier.paymentMethod')}</span>
          <span>{paymentLabel}</span>
        </div>

        <div className="receipt-footer">
          <div>{checkedOutAt.toLocaleString()}</div>
        </div>
      </div>
    </>
  );
}
