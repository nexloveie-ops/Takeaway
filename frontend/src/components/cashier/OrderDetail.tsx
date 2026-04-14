import { useTranslation } from 'react-i18next';

export interface OrderItem {
  _id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  itemName: string;
}

export interface Order {
  _id: string;
  type: string;
  tableNumber?: number;
  seatNumber?: number;
  status: string;
  items: OrderItem[];
  createdAt: string;
}

interface OrderDetailProps {
  orders: Order[];
}

export default function OrderDetail({ orders }: OrderDetailProps) {
  const { t } = useTranslation();

  if (orders.length === 0) return null;

  const bySeat = new Map<number, Order[]>();
  for (const order of orders) {
    const seat = order.seatNumber ?? 0;
    if (!bySeat.has(seat)) bySeat.set(seat, []);
    bySeat.get(seat)!.push(order);
  }

  const sortedSeats = [...bySeat.keys()].sort((a, b) => a - b);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sortedSeats.map((seat) => {
        const seatOrders = bySeat.get(seat)!;
        return (
          <div key={seat} style={{ background: 'var(--bg)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('cashier.seat')} {seat}
            </div>
            {seatOrders.map((order) => (
              <div key={order._id}>
                {order.items.map((item) => (
                  <div key={item._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid #eee', fontSize: 13,
                  }}>
                    <span style={{ fontWeight: 500 }}>{item.itemName}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-light)' }}>×{item.quantity}</span>
                      <span style={{ fontWeight: 600, color: 'var(--red-primary)', minWidth: 50, textAlign: 'right' }}>
                        €{(item.unitPrice * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
