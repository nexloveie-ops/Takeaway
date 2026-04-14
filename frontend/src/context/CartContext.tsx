import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export interface CartItem {
  menuItemId: string;
  names: Record<string, string>; // { 'zh-CN': '叉烧', 'en-US': 'Char Siu' }
  price: number;
  quantity: number;
}

const STORAGE_KEY = 'cart_items';

function loadCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Migrate old format: if item has `name` string instead of `names` object
    return parsed.map((item: CartItem & { name?: string }) => {
      if (!item.names && item.name) {
        return { ...item, names: { 'zh-CN': item.name, 'en-US': item.name } };
      }
      return item;
    });
  } catch { return []; }
}

function saveCart(items: CartItem[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface CartContextValue {
  items: CartItem[];
  addItem: (menuItemId: string, names: Record<string, string>, price: number) => void;
  removeItem: (menuItemId: string) => void;
  increaseQuantity: (menuItemId: string) => void;
  decreaseQuantity: (menuItemId: string) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => { saveCart(items); }, [items]);

  const addItem = useCallback((menuItemId: string, names: Record<string, string>, price: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItemId);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { menuItemId, names, price, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  }, []);

  const increaseQuantity = useCallback((menuItemId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    );
  }, []);

  const decreaseQuantity = useCallback((menuItemId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.menuItemId === menuItemId);
      if (!item) return prev;
      if (item.quantity <= 1) return prev.filter((i) => i.menuItemId !== menuItemId);
      return prev.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i,
      );
    });
  }, []);

  const clearCart = useCallback(() => { setItems([]); sessionStorage.removeItem(STORAGE_KEY); }, []);

  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, increaseQuantity, decreaseQuantity, clearCart, totalAmount, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}
