import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, writeBatch,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import type { AppStore, Client, Product, Order, ShippingZone, Expense } from '../types';

// ─── Default data (se inserta solo si Firestore está vacío) ───────────────────

const DEFAULT_ZONES: Omit<ShippingZone, 'id'>[] = [
  { name: 'Local (mismo barrio)', price: 0,    description: 'Entrega sin costo' },
  { name: 'CABA / GBA Zona 1',   price: 2500,  description: 'Capital y zona norte/sur cercana' },
  { name: 'GBA Zona 2',          price: 4500,  description: 'Gran Buenos Aires lejano' },
  { name: 'Interior del país',   price: 8000,  description: 'Envío por transporte/flota' },
];

const DEFAULT_PRODUCTS: Omit<Product, 'id' | 'updatedAt'>[] = [
  { name: 'Sillón esquinero',      category: 'Sillones',  costPrice: 85000,  salePrice: 130000, stock: 3, description: '' },
  { name: 'Mesa ratona vidrio',    category: 'Mesas',     costPrice: 42000,  salePrice: 68000,  stock: 5, description: '' },
  { name: 'Cama sommier 2 plazas', category: 'Camas',     costPrice: 120000, salePrice: 185000, stock: 2, description: '' },
  { name: 'Comedor 6 sillas',      category: 'Comedores', costPrice: 165000, salePrice: 250000, stock: 1, description: '' },
];

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_ALL'; payload: AppStore }
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

const EMPTY: AppStore = { clients: [], products: [], orders: [], shippingZones: [], expenses: [] };

function reducer(state: AppStore, action: Action): AppStore {
  switch (action.type) {
    case 'SET_ALL':              return action.payload;
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

// ─── Firestore helpers ────────────────────────────────────────────────────────

function col(name: string) { return collection(firestore, name); }
function ref(colName: string, id: string) { return doc(firestore, colName, id); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadCol<T>(colName: string, order: string): Promise<T[]> {
  try {
    const snap = await getDocs(col(colName));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
    return (docs as any[]).sort((a, b) => {
      const av = String(a[order] ?? '');
      const bv = String(b[order] ?? '');
      return bv > av ? 1 : bv < av ? -1 : 0;
    }) as T[];
  } catch {
    return [];
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface AppActions {
  addClient:          (data: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  updateClient:       (client: Client) => Promise<void>;
  deleteClient:       (id: string) => Promise<void>;
  addProduct:         (data: Omit<Product, 'id' | 'updatedAt'>) => Promise<void>;
  updateProduct:      (product: Product) => Promise<void>;
  deleteProduct:      (id: string) => Promise<void>;
  importProducts:     (products: Omit<Product, 'id' | 'updatedAt'>[]) => Promise<void>;
  addOrder:           (data: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder:        (order: Order) => Promise<void>;
  deleteOrder:        (id: string) => Promise<void>;
  addShippingZone:    (data: Omit<ShippingZone, 'id'>) => Promise<void>;
  updateShippingZone: (zone: ShippingZone) => Promise<void>;
  deleteShippingZone: (id: string) => Promise<void>;
  addExpense:         (data: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense:      (expense: Expense) => Promise<void>;
  deleteExpense:      (id: string) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue { state: AppStore; loading: boolean; db: AppActions }
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [clients, products, orders, shippingZones, expenses] = await Promise.all([
        loadCol<Client>('clients', 'createdAt'),
        loadCol<Product>('products', 'updatedAt'),
        loadCol<Order>('orders', 'createdAt'),
        loadCol<ShippingZone>('shippingZones', 'name'),
        loadCol<Expense>('expenses', 'date'),
      ]);

      let finalZones    = shippingZones;
      let finalProducts = products;

      try {
        if (shippingZones.length === 0) finalZones    = await seedZones();
        if (products.length === 0)      finalProducts = await seedProducts();
      } catch { /* si falla el seed, continúa con lo que haya */ }

      dispatch({ type: 'SET_ALL', payload: { clients, products: finalProducts, orders, shippingZones: finalZones, expenses } });
    } finally {
      setLoading(false);
    }
  }

  async function seedZones(): Promise<ShippingZone[]> {
    const result: ShippingZone[] = [];
    for (const z of DEFAULT_ZONES) {
      const r = await addDoc(col('shippingZones'), z);
      result.push({ id: r.id, ...z });
    }
    return result;
  }

  async function seedProducts(): Promise<Product[]> {
    const now = new Date().toISOString();
    const result: Product[] = [];
    for (const p of DEFAULT_PRODUCTS) {
      const data = { ...p, updatedAt: now };
      const r    = await addDoc(col('products'), data);
      result.push({ id: r.id, ...data });
    }
    return result;
  }

  function nextOrderNumber(): string {
    return `AD-${String(state.orders.length + 1).padStart(4, '0')}`;
  }

  const db: AppActions = {
    // Clients
    async addClient(data) {
      const now  = new Date().toISOString();
      const full = { ...data, createdAt: now };
      const r    = await addDoc(col('clients'), full);
      dispatch({ type: 'ADD_CLIENT', payload: { id: r.id, ...full } });
    },
    async updateClient(client) {
      const { id, ...data } = client;
      await updateDoc(ref('clients', id), data);
      dispatch({ type: 'UPDATE_CLIENT', payload: client });
    },
    async deleteClient(id) {
      await deleteDoc(ref('clients', id));
      dispatch({ type: 'DELETE_CLIENT', payload: id });
    },

    // Products
    async addProduct(data) {
      const full = { ...data, updatedAt: new Date().toISOString() };
      const r    = await addDoc(col('products'), full);
      dispatch({ type: 'ADD_PRODUCT', payload: { id: r.id, ...full } });
    },
    async updateProduct(product) {
      const updated = { ...product, updatedAt: new Date().toISOString() };
      const { id, ...data } = updated;
      await updateDoc(ref('products', id), data);
      dispatch({ type: 'UPDATE_PRODUCT', payload: updated });
    },
    async deleteProduct(id) {
      await deleteDoc(ref('products', id));
      dispatch({ type: 'DELETE_PRODUCT', payload: id });
    },
    async importProducts(products) {
      const snap  = await getDocs(col('products'));
      const batch = writeBatch(firestore);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();

      const now = new Date().toISOString();
      const inserted: Product[] = [];
      for (const p of products) {
        const full = { ...p, updatedAt: now };
        const r    = await addDoc(col('products'), full);
        inserted.push({ id: r.id, ...full });
      }
      dispatch({ type: 'SET_PRODUCTS', payload: inserted });
    },

    // Orders
    async addOrder(data) {
      const now  = new Date().toISOString();
      const full = { ...data, orderNumber: nextOrderNumber(), createdAt: now, updatedAt: now };
      const r    = await addDoc(col('orders'), full);
      dispatch({ type: 'ADD_ORDER', payload: { id: r.id, ...full } });
    },
    async updateOrder(order) {
      const updated = { ...order, updatedAt: new Date().toISOString() };
      const { id, ...data } = updated;
      await updateDoc(ref('orders', id), data);
      dispatch({ type: 'UPDATE_ORDER', payload: updated });
    },
    async deleteOrder(id) {
      await deleteDoc(ref('orders', id));
      dispatch({ type: 'DELETE_ORDER', payload: id });
    },

    // Shipping zones
    async addShippingZone(data) {
      const r = await addDoc(col('shippingZones'), data);
      dispatch({ type: 'ADD_SHIPPING_ZONE', payload: { id: r.id, ...data } });
    },
    async updateShippingZone(zone) {
      const { id, ...data } = zone;
      await updateDoc(ref('shippingZones', id), data);
      dispatch({ type: 'UPDATE_SHIPPING_ZONE', payload: zone });
    },
    async deleteShippingZone(id) {
      await deleteDoc(ref('shippingZones', id));
      dispatch({ type: 'DELETE_SHIPPING_ZONE', payload: id });
    },

    // Expenses
    async addExpense(data) {
      const now  = new Date().toISOString();
      const full = { ...data, createdAt: now };
      const r    = await addDoc(col('expenses'), full);
      dispatch({ type: 'ADD_EXPENSE', payload: { id: r.id, ...full } });
    },
    async updateExpense(expense) {
      const { id, ...data } = expense;
      await updateDoc(ref('expenses', id), data);
      dispatch({ type: 'UPDATE_EXPENSE', payload: expense });
    },
    async deleteExpense(id) {
      await deleteDoc(ref('expenses', id));
      dispatch({ type: 'DELETE_EXPENSE', payload: id });
    },
  };

  return (
    <AppContext.Provider value={{ state, loading, db }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
