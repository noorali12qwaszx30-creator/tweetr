import { useState, useCallback } from 'react';
import { DbMenuItem } from '@/hooks/useSupabaseOrders';
import { MenuItem } from '@/hooks/useMenuItems';

export interface CartItem {
  menuItem: DbMenuItem | MenuItem;
  quantity: number;
  notes?: string;
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null);

  const addToCart = useCallback((item: MenuItem | DbMenuItem) => {
    // Trigger animation
    setAnimatingItemId(item.id);
    setTimeout(() => setAnimatingItemId(null), 300);
    
    setCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.menuItem.id === item.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.menuItem.id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : i;
        }
        return i;
      }).filter(i => i.quantity > 0);
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(i => i.menuItem.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const setCartItems = useCallback((items: CartItem[]) => {
    setCart(items);
  }, []);

  const totalPrice = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const itemCount = cart.length;

  const getItemQuantity = useCallback((itemId: string) => {
    const item = cart.find(i => i.menuItem.id === itemId);
    return item?.quantity || 0;
  }, [cart]);

  return {
    cart,
    animatingItemId,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setCartItems,
    totalPrice,
    itemCount,
    getItemQuantity,
  };
}
