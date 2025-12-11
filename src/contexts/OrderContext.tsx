import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Order, OrderStatus, MenuItem } from '@/types';
import { playNotificationSound } from '@/hooks/useNotificationSound';

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  assignDelivery: (orderId: string, deliveryPersonId: string, deliveryPersonName: string) => void;
  acceptDelivery: (orderId: string) => void;
  rejectDelivery: (orderId: string) => void;
  cancelOrder: (orderId: string, reason?: string) => void;
  getOrdersByStatus: (status: OrderStatus) => Order[];
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Sample menu items
export const MENU_ITEMS: MenuItem[] = [
  { id: '1', name: 'برجر كلاسيك', price: 5000, image: '/placeholder.svg', category: 'برجر' },
  { id: '2', name: 'برجر دبل', price: 7500, image: '/placeholder.svg', category: 'برجر' },
  { id: '3', name: 'برجر سبايسي', price: 6000, image: '/placeholder.svg', category: 'برجر' },
  { id: '4', name: 'شاورما دجاج', price: 4000, image: '/placeholder.svg', category: 'شاورما' },
  { id: '5', name: 'شاورما لحم', price: 5000, image: '/placeholder.svg', category: 'شاورما' },
  { id: '6', name: 'بيتزا مارغريتا', price: 8000, image: '/placeholder.svg', category: 'بيتزا' },
  { id: '7', name: 'بيتزا بيبروني', price: 10000, image: '/placeholder.svg', category: 'بيتزا' },
  { id: '8', name: 'سلطة سيزر', price: 3500, image: '/placeholder.svg', category: 'سلطات' },
  { id: '9', name: 'بطاطس مقلية', price: 2000, image: '/placeholder.svg', category: 'جانبية' },
  { id: '10', name: 'كولا', price: 1000, image: '/placeholder.svg', category: 'مشروبات' },
  { id: '11', name: 'عصير برتقال', price: 1500, image: '/placeholder.svg', category: 'مشروبات' },
  { id: '12', name: 'ماء', price: 500, image: '/placeholder.svg', category: 'مشروبات' },
];

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderCounter, setOrderCounter] = useState(1);

  const addOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => {
    const newOrder: Order = {
      ...orderData,
      id: `order-${Date.now()}`,
      orderNumber: orderCounter,
      createdAt: new Date(),
    };
    setOrders(prev => [...prev, newOrder]);
    setOrderCounter(prev => prev + 1);
    playNotificationSound('newOrder');
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status } : order
      )
    );
    if (status === 'ready') {
      playNotificationSound('orderReady');
    } else if (status === 'cancelled') {
      playNotificationSound('orderCancelled');
    }
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, ...updates } : order
      )
    );
  };

  const assignDelivery = (orderId: string, deliveryPersonId: string, deliveryPersonName: string) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? { ...order, deliveryPersonId, deliveryPersonName, pendingDeliveryAcceptance: true }
          : order
      )
    );
    playNotificationSound('orderAssigned');
  };

  const acceptDelivery = (orderId: string) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? { ...order, status: 'delivering' as OrderStatus, pendingDeliveryAcceptance: false }
          : order
      )
    );
    playNotificationSound('orderAssigned');
  };

  const rejectDelivery = (orderId: string) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? { ...order, deliveryPersonId: undefined, deliveryPersonName: undefined, pendingDeliveryAcceptance: false }
          : order
      )
    );
    playNotificationSound('alert');
  };

  const cancelOrder = (orderId: string, reason?: string) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? { ...order, status: 'cancelled' as OrderStatus, cancellationReason: reason }
          : order
      )
    );
    playNotificationSound('orderCancelled');
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(order => order.status === status);
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        addOrder,
        updateOrderStatus,
        updateOrder,
        assignDelivery,
        acceptDelivery,
        rejectDelivery,
        cancelOrder,
        getOrdersByStatus,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}
