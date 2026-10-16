import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Item, 
  CartItem, 
  Order, 
  Expense, 
  StockAdjustment, 
  StoreSettings, 
  PaymentMethod,
  StockAdjustmentType,
  POSData
} from '../types';
import { 
  INITIAL_ITEMS, 
  INITIAL_ORDERS, 
  INITIAL_EXPENSES, 
  INITIAL_STOCK_ADJUSTMENTS, 
  INITIAL_SETTINGS 
} from '../data/initialData';

interface POSContextType {
  items: Item[];
  orders: Order[];
  expenses: Expense[];
  stockAdjustments: StockAdjustment[];
  settings: StoreSettings;
  cart: CartItem[];
  cartSubtotal: number;
  cartDiscountTotal: number;
  cartTaxAmount: number;
  cartGrandTotal: number;
  cartTotalCOGS: number;
  cartEstimatedProfit: number;
  isBackendConnected: boolean;
  isSyncing: boolean;

  // Cart Actions
  addToCart: (item: Item, quantity?: number) => void;
  addCustomCartItem: (name: string, sellingPrice: number, costPrice?: number, quantity?: number) => void;
  updateCartQuantity: (itemId: string, delta: number) => void;
  setCartQuantity: (itemId: string, quantity: number) => void;
  setCartDiscount: (itemId: string, discount: number) => void;
  setCartNotes: (itemId: string, notes: string) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;

  // Order Actions
  processCheckout: (payload: {
    customerName?: string;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    notes?: string;
  }) => Promise<Order>;
  refundOrder: (orderId: string, reason: string) => Promise<void>;

  // Catalog / Inventory Actions
  addItem: (item: Omit<Item, 'id' | 'createdAt'>) => Promise<Item>;
  duplicateItem: (itemId: string) => Promise<Item | null>;
  updateItem: (item: Item) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  inputStock: (itemId: string, quantity: number, unitCost: number, supplier?: string, reasonNote?: string) => Promise<void>;
  adjustStockLoss: (
    itemId: string, 
    quantity: number, 
    type: Exclude<StockAdjustmentType, 'RESTOCK'>, 
    reasonNote: string
  ) => Promise<void>;

  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id' | 'timestamp'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Settings & System
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  clearAllData: () => Promise<void>;
  restoreFullBackup: (data: POSData) => Promise<void>;
  formatMoney: (amount: number) => string;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ITEMS: 'omnipos_items_v2',
  ORDERS: 'omnipos_orders_v2',
  EXPENSES: 'omnipos_expenses_v2',
  ADJUSTMENTS: 'omnipos_adjustments_v2',
  SETTINGS: 'omnipos_settings_v2',
};

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with local cache or simple sample data
  const [items, setItems] = useState<Item[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ITEMS);
      return saved ? JSON.parse(saved) : INITIAL_ITEMS;
    } catch {
      return INITIAL_ITEMS;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
      return saved ? JSON.parse(saved) : INITIAL_STOCK_ADJUSTMENTS;
    } catch {
      return INITIAL_STOCK_ADJUSTMENTS;
    }
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sync state to local storage as secondary cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(stockAdjustments));
  }, [stockAdjustments]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Load backend database on mount
  const fetchBackendData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/pos/data');
      if (res.ok) {
        const data: POSData = await res.json();
        if (data && Array.isArray(data.items)) {
          setItems(data.items);
          setOrders(data.orders || []);
          setExpenses(data.expenses || []);
          setStockAdjustments(data.stockAdjustments || []);
          if (data.settings) setSettings(data.settings);
          setIsBackendConnected(true);
        }
      } else {
        setIsBackendConnected(false);
      }
    } catch (err) {
      console.warn('Backend fetch failed, using local persistence:', err);
      setIsBackendConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendData();
  }, [fetchBackendData]);

  // Currency Formatter Helper
  const formatMoney = useCallback((amount: number): string => {
    const symbol = settings.currency || '$';
    const isNegative = amount < 0;
    const absVal = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return isNegative ? `-${symbol}${absVal}` : `${symbol}${absVal}`;
  }, [settings.currency]);

  // Cart Calculations
  const { cartSubtotal, cartDiscountTotal, cartTaxAmount, cartGrandTotal, cartTotalCOGS, cartEstimatedProfit } = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let totalCOGS = 0;

    cart.forEach(ci => {
      const price = ci.customPrice ?? ci.item.sellingPrice;
      const lineBase = price * ci.quantity;
      const lineDiscount = ci.discount * ci.quantity;
      subtotal += lineBase;
      discountTotal += lineDiscount;
      totalCOGS += ci.item.costPrice * ci.quantity;
    });

    const netSubtotal = Math.max(0, subtotal - discountTotal);
    const taxAmount = settings.enableTax 
      ? Number(((netSubtotal * settings.taxRatePercent) / 100).toFixed(2))
      : 0;
    const grandTotal = Number((netSubtotal + taxAmount).toFixed(2));
    const estimatedProfit = Number((netSubtotal - totalCOGS).toFixed(2));

    return {
      cartSubtotal: subtotal,
      cartDiscountTotal: discountTotal,
      cartTaxAmount: taxAmount,
      cartGrandTotal: grandTotal,
      cartTotalCOGS: totalCOGS,
      cartEstimatedProfit: estimatedProfit,
    };
  }, [cart, settings.enableTax, settings.taxRatePercent]);

  // Cart Operations
  const addToCart = (item: Item, quantity: number = 1) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(ci => ci.item.id === item.id);
      if (existingIndex > -1) {
        const next = [...prev];
        const currentQty = next[existingIndex].quantity;
        const newQty = currentQty + quantity;
        next[existingIndex] = {
          ...next[existingIndex],
          item, // update to latest item reference
          quantity: newQty,
        };
        return next;
      } else {
        return [...prev, { item, quantity, discount: 0 }];
      }
    });
  };

  const addCustomCartItem = (name: string, sellingPrice: number, costPrice: number = 0, quantity: number = 1) => {
    const customItem: Item = {
      id: `custom-${Date.now()}`,
      name: name.trim() || 'Custom Item',
      sku: `CUSTOM-${Math.floor(100 + Math.random() * 900)}`,
      category: 'Other',
      costPrice: costPrice > 0 ? costPrice : 0,
      sellingPrice: sellingPrice > 0 ? sellingPrice : 0,
      stock: 999,
      minStockAlert: 0,
      unit: 'pcs',
      createdAt: new Date().toISOString(),
    };
    addToCart(customItem, quantity);
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(ci => {
          if (ci.item.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter((ci): ci is CartItem => ci !== null);
    });
  };

  const setCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev =>
      prev.map(ci => (ci.item.id === itemId ? { ...ci, quantity } : ci))
    );
  };

  const setCartDiscount = (itemId: string, discount: number) => {
    setCart(prev =>
      prev.map(ci =>
        ci.item.id === itemId
          ? { ...ci, discount: Math.max(0, Math.min(ci.item.sellingPrice, discount)) }
          : ci
      )
    );
  };

  const setCartNotes = (itemId: string, notes: string) => {
    setCart(prev =>
      prev.map(ci => (ci.item.id === itemId ? { ...ci, notes } : ci))
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(ci => ci.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Process Checkout with Backend Persistence
  const processCheckout = async ({
    customerName = 'Walk-in Customer',
    paymentMethod,
    amountPaid,
    notes = '',
  }: {
    customerName?: string;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    notes?: string;
  }): Promise<Order> => {
    if (cart.length === 0) {
      throw new Error('Cart is empty.');
    }

    const nextOrderNum = orders.length + 1001;
    const orderNumber = `#ORD-${nextOrderNum}`;
    const timestamp = new Date().toISOString();

    const orderItems = cart.map(ci => {
      const price = ci.customPrice ?? ci.item.sellingPrice;
      const lineTotal = Number(((price - ci.discount) * ci.quantity).toFixed(2));
      const lineCOGS = Number((ci.item.costPrice * ci.quantity).toFixed(2));
      const lineProfit = Number((lineTotal - lineCOGS).toFixed(2));
      return {
        itemId: ci.item.id,
        itemName: ci.item.name,
        category: ci.item.category,
        unitCost: ci.item.costPrice,
        unitPrice: price,
        quantity: ci.quantity,
        discount: Number((ci.discount * ci.quantity).toFixed(2)),
        lineTotal,
        lineCOGS,
        lineProfit,
      };
    });

    const netSubtotal = Math.max(0, cartSubtotal - cartDiscountTotal);
    const taxAmount = settings.enableTax 
      ? Number(((netSubtotal * settings.taxRatePercent) / 100).toFixed(2))
      : 0;
    const grandTotal = Number((netSubtotal + taxAmount).toFixed(2));
    const grossProfit = Number((netSubtotal - cartTotalCOGS).toFixed(2));
    const changeDue = Math.max(0, Number((amountPaid - grandTotal).toFixed(2)));

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      timestamp,
      items: orderItems,
      customerName: customerName.trim() || 'Walk-in Customer',
      paymentMethod,
      subtotal: Number(cartSubtotal.toFixed(2)),
      discountTotal: Number(cartDiscountTotal.toFixed(2)),
      taxPercent: settings.enableTax ? settings.taxRatePercent : 0,
      taxAmount,
      grandTotal,
      totalCOGS: Number(cartTotalCOGS.toFixed(2)),
      grossProfit,
      amountPaid: Number(amountPaid.toFixed(2)),
      changeDue,
      status: 'COMPLETED',
      cashierName: settings.cashierName || 'Cashier',
      notes,
    };

    // Optimistically update stock & orders
    setItems(prevItems => {
      return prevItems.map(item => {
        const cartMatch = cart.find(ci => ci.item.id === item.id);
        if (cartMatch) {
          const updatedStock = Math.max(0, item.stock - cartMatch.quantity);
          return { ...item, stock: updatedStock };
        }
        return item;
      });
    });

    setOrders(prev => [newOrder, ...prev]);
    clearCart();

    // Persist to backend server
    try {
      const res = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.items) {
          setItems(body.items);
        }
        setIsBackendConnected(true);
      }
    } catch (err) {
      console.warn('Backend order sync warning:', err);
    }

    return newOrder;
  };

  // Refund Order (re-stocks items and logs refund)
  const refundOrder = async (orderId: string, reason: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder || targetOrder.status === 'REFUNDED') return;

    // Optimistic update
    setItems(prevItems => {
      return prevItems.map(item => {
        const orderItemMatch = targetOrder.items.find(oi => oi.itemId === item.id);
        if (orderItemMatch) {
          return {
            ...item,
            stock: item.stock + orderItemMatch.quantity,
          };
        }
        return item;
      });
    });

    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: 'REFUNDED',
              refundReason: reason,
              refundDate: new Date().toISOString(),
            }
          : o
      )
    );

    // Persist to backend server
    try {
      const res = await fetch(`/api/pos/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.items) {
          setItems(body.items);
        }
        setIsBackendConnected(true);
      }
    } catch (err) {
      console.warn('Backend refund sync warning:', err);
    }
  };

  // Add Item to Catalog
  const addItem = async (itemData: Omit<Item, 'id' | 'createdAt'>): Promise<Item> => {
    const newItem: Item = {
      ...itemData,
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };

    setItems(prev => [newItem, ...prev]);

    // Backend save
    try {
      const res = await fetch('/api/pos/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        setIsBackendConnected(true);
      }
    } catch (err) {
      console.warn('Backend item add error:', err);
    }

    return newItem;
  };

  // Duplicate an existing item
  const duplicateItem = async (itemId: string): Promise<Item | null> => {
    const original = items.find(i => i.id === itemId);
    if (!original) return null;

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newItem: Item = {
      ...original,
      id: `item-${Date.now()}-${randomSuffix}`,
      name: `${original.name} (Copy)`,
      sku: `${original.sku}-COPY${randomSuffix}`,
      barcode: undefined,
      createdAt: new Date().toISOString(),
    };

    setItems(prev => [newItem, ...prev]);

    try {
      await fetch('/api/pos/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend duplicate item error:', err);
    }

    return newItem;
  };

  // Update Item in Catalog
  const updateItem = async (updated: Item) => {
    setItems(prev => prev.map(item => (item.id === updated.id ? updated : item)));

    try {
      await fetch(`/api/pos/items/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend update item error:', err);
    }
  };

  // Delete Item from Catalog
  const deleteItem = async (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    setCart(prev => prev.filter(ci => ci.item.id !== itemId));

    try {
      await fetch(`/api/pos/items/${itemId}`, {
        method: 'DELETE',
      });
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend delete item error:', err);
    }
  };

  // Input Stocks (Restock with cost & supplier)
  const inputStock = async (
    itemId: string,
    quantity: number,
    unitCost: number,
    supplier: string = '',
    reasonNote: string = ''
  ) => {
    const target = items.find(i => i.id === itemId);
    if (!target || quantity <= 0) return;

    setItems(prev =>
      prev.map(i => {
        if (i.id === itemId) {
          return {
            ...i,
            stock: i.stock + quantity,
            costPrice: unitCost > 0 ? unitCost : i.costPrice,
          };
        }
        return i;
      })
    );

    const log: StockAdjustment = {
      id: `stk-${Date.now()}`,
      timestamp: new Date().toISOString(),
      itemId: target.id,
      itemName: target.name,
      type: 'RESTOCK',
      quantityChange: quantity,
      unitCost: unitCost > 0 ? unitCost : target.costPrice,
      financialImpact: 0,
      reasonNote: reasonNote || `Stock in of ${quantity} ${target.unit}`,
      supplier,
    };

    setStockAdjustments(prev => [log, ...prev]);

    try {
      await fetch('/api/pos/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend stock adjustment error:', err);
    }
  };

  // Adjust Stock Loss (Damage, Expired, Theft, Sampling)
  const adjustStockLoss = async (
    itemId: string,
    quantity: number,
    type: Exclude<StockAdjustmentType, 'RESTOCK'>,
    reasonNote: string
  ) => {
    const target = items.find(i => i.id === itemId);
    if (!target || quantity <= 0) return;

    const actualQtyChange = -Math.min(target.stock, quantity);
    const lossValue = Number((Math.abs(actualQtyChange) * target.costPrice).toFixed(2));

    setItems(prev =>
      prev.map(i => {
        if (i.id === itemId) {
          return {
            ...i,
            stock: Math.max(0, i.stock + actualQtyChange),
          };
        }
        return i;
      })
    );

    const log: StockAdjustment = {
      id: `loss-${Date.now()}`,
      timestamp: new Date().toISOString(),
      itemId: target.id,
      itemName: target.name,
      type,
      quantityChange: actualQtyChange,
      unitCost: target.costPrice,
      financialImpact: lossValue,
      reasonNote: reasonNote || `${type} write-off for ${Math.abs(actualQtyChange)} ${target.unit}`,
    };

    setStockAdjustments(prev => [log, ...prev]);

    try {
      await fetch('/api/pos/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend loss adjustment error:', err);
    }
  };

  // Expenses Operations
  const addExpense = async (expenseData: Omit<Expense, 'id' | 'timestamp'>) => {
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    setExpenses(prev => [newExp, ...prev]);

    try {
      await fetch('/api/pos/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExp),
      });
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend expense error:', err);
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));

    try {
      await fetch(`/api/pos/expenses/${id}`, {
        method: 'DELETE',
      });
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend delete expense error:', err);
    }
  };

  // Update Settings
  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    try {
      await fetch('/api/pos/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend settings update error:', err);
    }
  };

  // Reset to simple defaults on backend & frontend
  const resetToDefaults = async () => {
    setCart([]);
    try {
      const res = await fetch('/api/pos/reset', { method: 'POST' });
      if (res.ok) {
        const body = await res.json();
        const data: POSData = body.data;
        setItems(data.items);
        setOrders(data.orders);
        setExpenses(data.expenses);
        setStockAdjustments(data.stockAdjustments);
        setSettings(data.settings);
        setIsBackendConnected(true);
        return;
      }
    } catch (err) {
      console.warn('Backend reset error, applying client-side:', err);
    }

    setItems(INITIAL_ITEMS);
    setOrders(INITIAL_ORDERS);
    setExpenses(INITIAL_EXPENSES);
    setStockAdjustments(INITIAL_STOCK_ADJUSTMENTS);
    setSettings(INITIAL_SETTINGS);
  };

  // Clear all data
  const clearAllData = async () => {
    setCart([]);
    setItems([]);
    setOrders([]);
    setExpenses([]);
    setStockAdjustments([]);

    try {
      await fetch('/api/pos/clear', { method: 'POST' });
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend clear error:', err);
    }
  };

  // Restore full backup
  const restoreFullBackup = async (data: POSData) => {
    if (!data || !Array.isArray(data.items)) return;
    setItems(data.items);
    setOrders(data.orders || []);
    setExpenses(data.expenses || []);
    setStockAdjustments(data.stockAdjustments || []);
    if (data.settings) setSettings(data.settings);
    setCart([]);

    try {
      await fetch('/api/pos/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend backup restore error:', err);
    }
  };

  return (
    <POSContext.Provider
      value={{
        items,
        orders,
        expenses,
        stockAdjustments,
        settings,
        cart,
        cartSubtotal,
        cartDiscountTotal,
        cartTaxAmount,
        cartGrandTotal,
        cartTotalCOGS,
        cartEstimatedProfit,
        isBackendConnected,
        isSyncing,
        addToCart,
        addCustomCartItem,
        updateCartQuantity,
        setCartQuantity,
        setCartDiscount,
        setCartNotes,
        removeFromCart,
        clearCart,
        processCheckout,
        refundOrder,
        addItem,
        duplicateItem,
        updateItem,
        deleteItem,
        inputStock,
        adjustStockLoss,
        addExpense,
        deleteExpense,
        updateSettings,
        resetToDefaults,
        clearAllData,
        restoreFullBackup,
        formatMoney,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
