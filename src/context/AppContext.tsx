import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppStore, Client, Product, Order, ShippingZone, Expense } from '../types';
import { loadStore, persistStore, generateId, generateOrderNumber, nowISO } from '../store';

// ─── Actions ─────────────────────────────────────────────────────────────────
type Action =
  | { type: 'ADD_CLIENT'; payload: Omit<Client, 'id' | 'createdAt'> }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Omit<Product, 'id' | 'updatedAt'> }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_ORDER'; payload: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'ADD_SHIPPING_ZONE'; payload: Omit<ShippingZone, 'id'> }
  | { type: 'UPDATE_SHIPPING_ZONE'; payload: ShippingZone }
  | { type: 'DELETE_SHIPPING_ZONE'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Omit<Expense, 'id' | 'createdAt'> }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'IMPORT_PRODUCTS'; payload: Product[] };

function reducer(state: AppStore, action: Action): AppStore {
  switch (action.type) {
    // Clients
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, { ...action.payload, id: generateId(), createdAt: nowISO() }] };
    case 'UPDATE_CLIENT':
      return { ...state, clients: state.clients.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CLIENT':
      return { ...state, clients: state.clients.filter(c => c.id !== action.payload) };

    // Products
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, { ...action.payload, id: generateId(), updatedAt: nowISO() }] };
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => p.id === action.payload.id ? { ...action.payload, updatedAt: nowISO() } : p) };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'IMPORT_PRODUCTS':
      return { ...state, products: action.payload };

    // Orders
    case 'ADD_ORDER': {
      const newOrder: Order = {
        ...action.payload,
        id: generateId(),
        orderNumber: generateOrderNumber(state.orders),
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      return { ...state, orders: [newOrder, ...state.orders] };
    }
    case 'UPDATE_ORDER':
      return { ...state, orders: state.orders.map(o => o.id === action.payload.id ? { ...action.payload, updatedAt: nowISO() } : o) };
    case 'DELETE_ORDER':
      return { ...state, orders: state.orders.filter(o => o.id !== action.payload) };

    // Shipping
    case 'ADD_SHIPPING_ZONE':
      return { ...state, shippingZones: [...state.shippingZones, { ...action.payload, id: generateId() }] };
    case 'UPDATE_SHIPPING_ZONE':
      return { ...state, shippingZones: state.shippingZones.map(z => z.id === action.payload.id ? action.payload : z) };
    case 'DELETE_SHIPPING_ZONE':
      return { ...state, shippingZones: state.shippingZones.filter(z => z.id !== action.payload) };

    // Expenses
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, { ...action.payload, id: generateId(), createdAt: nowISO() }] };
    case 'UPDATE_EXPENSE':
      return { ...state, expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextValue {
  state: AppStore;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadStore);

  useEffect(() => {
    persistStore(state);
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
