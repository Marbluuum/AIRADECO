import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppStore, Client, Product, Order, ShippingZone, Expense } from '../types';

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_ZONES: ShippingZone[] = [
  { id: 'z1', name: 'Local (mismo barrio)', price: 0,    description: 'Entrega sin costo' },
  { id: 'z2', name: 'CABA / GBA Zona 1',   price: 2500,  description: 'Capital y zona norte/sur cercana' },
  { id: 'z3', name: 'GBA Zona 2',          price: 4500,  description: 'Gran Buenos Aires lejano' },
  { id: 'z4', name: 'Interior del país',   price: 8000,  description: 'Envío por transporte/flota' },
];

const now = new Date().toISOString();
const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Sillón esquinero',      category: 'Sillones',  costPrice: 85000,  salePrice: 130000, stock: 3, description: '', updatedAt: now },
  { id: 'p2', name: 'Mesa ratona vidrio',    category: 'Mesas',     costPrice: 42000,  salePrice: 68000,  stock: 5, description: '', updatedAt: now },
  { id: 'p3', name: 'Cama sommier 2 plazas', category: 'Camas',     costPrice: 120000, salePrice: 185000, stock: 2, description: '', updatedAt: now },
  { id: 'p4', name: 'Comedor 6 sillas',      category: 'Comedores', costPrice: 165000, salePrice: 250000, stock: 1, description: '', updatedAt: now },
];

const INITIAL: AppStore = {
  clients: [],
  products: DEFAULT_PRODUCTS,
  orders: [],
  shippingZones: DEFAULT_ZONES,
  expenses: [],
};

const STORAGE_KEY = 'airadeco_data';

function loadState(): AppStore {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL;
  } catch {
    return INITIAL;
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'ADD_SHIPPING_ZONE'; payload: ShippingZone }
  | { type: 'UPDATE_SHIPPING_ZONE'; payload: ShippingZone }
  | { type: 'DELETE_SHIPPING_ZONE'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string };

function reducer(state: AppStore, action: Action): AppStore {
  switch (action.type) {
    case 'ADD_CLIENT':           return { ...state, clients: [action.payload, ...state.clients] };
    case 'UPDATE_CLIENT':        return { ...state, clients: state.clients.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CLIENT':        return { ...state, clients: state.clients.filter(c => c.id !== action.payload) };
    case 'ADD_PRODUCT':          return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':       return { ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PRODUCT':       return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'SET_PRODUCTS':         return { ...state, products: action.payload };
    case 'ADD_ORDER':            return { ...state, orders: [action.payload, ...state.orders] };
    case 'UPDATE_ORDER':         return { ...state, orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o) };
    case 'DELETE_ORDER':         return { ...state, orders: state.orders.filter(o => o.id !== action.payload) };
    case 'ADD_SHIPPING_ZONE':    return { ...state, shippingZones: [...state.shippingZones, action.payload] };
    case 'UPDATE_SHIPPING_ZONE': return { ...state, shippingZones: state.shippingZones.map(z => z.id === action.payload.id ? action.payload : z) };
    case 'DELETE_SHIPPING_ZONE': return { ...state, shippingZones: state.shippingZones.filter(z => z.id !== action.payload) };
    case 'ADD_EXPENSE':          return { ...state, expenses: [...state.expenses, action.payload] };
    case 'UPDATE_EXPENSE':       return { ...state, expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EXPENSE':       return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };
    default:                     return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function nextOrderNumber(orders: Order[]): string {
  return `AD-${String(orders.length + 1).padStart(4, '0')}`;
}

// ─── Actions interface ────────────────────────────────────────────────────────

export interface AppActions {
  addClient:          (data: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient:       (client: Client) => void;
  deleteClient:       (id: string) => void;
  addProduct:         (data: Omit<Product, 'id' | 'updatedAt'>) => void;
  updateProduct:      (product: Product) => void;
  deleteProduct:      (id: string) => void;
  importProducts:     (products: Omit<Product, 'id' | 'updatedAt'>[]) => void;
  addOrder:           (data: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => void;
  updateOrder:        (order: Order) => void;
  deleteOrder:        (id: string) => void;
  addShippingZone:    (data: Omit<ShippingZone, 'id'>) => void;
  updateShippingZone: (zone: ShippingZone) => void;
  deleteShippingZone: (id: string) => void;
  addExpense:         (data: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense:      (expense: Expense) => void;
  deleteExpense:      (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppStore;
  loading: false;
  db: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // Persistir en localStorage en cada cambio
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const db: AppActions = {
    addClient(data) {
      dispatch({ type: 'ADD_CLIENT', payload: { id: uid(), createdAt: new Date().toISOString(), ...data } });
    },
    updateClient(client) {
      dispatch({ type: 'UPDATE_CLIENT', payload: client });
    },
    deleteClient(id) {
      dispatch({ type: 'DELETE_CLIENT', payload: id });
    },

    addProduct(data) {
      dispatch({ type: 'ADD_PRODUCT', payload: { id: uid(), updatedAt: new Date().toISOString(), ...data } });
    },
    updateProduct(product) {
      dispatch({ type: 'UPDATE_PRODUCT', payload: { ...product, updatedAt: new Date().toISOString() } });
    },
    deleteProduct(id) {
      dispatch({ type: 'DELETE_PRODUCT', payload: id });
    },
    importProducts(products) {
      const now = new Date().toISOString();
      dispatch({ type: 'SET_PRODUCTS', payload: products.map(p => ({ id: uid(), updatedAt: now, ...p })) });
    },

    addOrder(data) {
      const now = new Date().toISOString();
      dispatch({
        type: 'ADD_ORDER',
        payload: {
          id: uid(),
          orderNumber: nextOrderNumber(state.orders),
          createdAt: now,
          updatedAt: now,
          ...data,
        },
      });
    },
    updateOrder(order) {
      dispatch({ type: 'UPDATE_ORDER', payload: { ...order, updatedAt: new Date().toISOString() } });
    },
    deleteOrder(id) {
      dispatch({ type: 'DELETE_ORDER', payload: id });
    },

    addShippingZone(data) {
      dispatch({ type: 'ADD_SHIPPING_ZONE', payload: { id: uid(), ...data } });
    },
    updateShippingZone(zone) {
      dispatch({ type: 'UPDATE_SHIPPING_ZONE', payload: zone });
    },
    deleteShippingZone(id) {
      dispatch({ type: 'DELETE_SHIPPING_ZONE', payload: id });
    },

    addExpense(data) {
      dispatch({ type: 'ADD_EXPENSE', payload: { id: uid(), createdAt: new Date().toISOString(), ...data } });
    },
    updateExpense(expense) {
      dispatch({ type: 'UPDATE_EXPENSE', payload: expense });
    },
    deleteExpense(id) {
      dispatch({ type: 'DELETE_EXPENSE', payload: id });
    },
  };

  return (
    <AppContext.Provider value={{ state, loading: false, db }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
