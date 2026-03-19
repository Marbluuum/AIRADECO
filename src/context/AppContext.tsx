import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, setDoc, writeBatch,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import type { AppStore, Client, Product, Order, ShippingZone, Expense } from '../types';

// ─── Default data (inserted on first run) ────────────────────────────────────

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

// ─── Local reducer ────────────────────────────────────────────────────────────

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
    case 'SET_ALL':           return action.payload;
    case 'ADD_CLIENT':        return { ...state, clients: [action.payload, ...state.clients] };
    case 'UPDATE_CLIENT':     return { ...state, clients: state.clients.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CLIENT':     return { ...state, clients: state.clients.filter(c => c.id !== action.payload) };
    case 'ADD_PRODUCT':       return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':    return { ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PRODUCT':    return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'SET_PRODUCTS':      return { ...state, products: action.payload };
    case 'ADD_ORDER':         return { ...state, orders: [action.payload, ...state.orders] };
    case 'UPDATE_ORDER':      return { ...state, orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o) };
    case 'DELETE_ORDER':      return { ...state, orders: state.orders.filter(o => o.id !== action.payload) };
    case 'ADD_SHIPPING_ZONE': return { ...state, shippingZones: [...state.shippingZones, action.payload] };
    case 'UPDATE_SHIPPING_ZONE': return { ...state, shippingZones: state.shippingZones.map(z => z.id === action.payload.id ? action.payload : z) };
    case 'DELETE_SHIPPING_ZONE': return { ...state, shippingZones: state.shippingZones.filter(z => z.id !== action.payload) };
    case 'ADD_EXPENSE':       return { ...state, expenses: [...state.expenses, action.payload] };
    case 'UPDATE_EXPENSE':    return { ...state, expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EXPENSE':    return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };
    default:                  return state;
  }
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

function col(name: string) { return collection(firestore, name); }
function d(colName: string, id: string) { return doc(firestore, colName, id); }

async function loadCollection<T>(colName: string, orderField = 'createdAt'): Promise<T[]> {
  try {
    const q    = query(col(colName), orderBy(orderField, 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
  } catch {
    // Si no hay documentos con ese campo, cargar sin ordenar
    const snap = await getDocs(col(colName));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
  }
}

// ─── DB Actions interface ─────────────────────────────────────────────────────

export interface AppActions {
  addClient:         (data: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  updateClient:      (client: Client) => Promise<void>;
  deleteClient:      (id: string) => Promise<void>;
  addProduct:        (data: Omit<Product, 'id' | 'updatedAt'>) => Promise<void>;
  updateProduct:     (product: Product) => Promise<void>;
  deleteProduct:     (id: string) => Promise<void>;
  importProducts:    (products: Omit<Product, 'id' | 'updatedAt'>[]) => Promise<void>;
  addOrder:          (data: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder:       (order: Order) => Promise<void>;
  deleteOrder:       (id: string) => Promise<void>;
  addShippingZone:   (data: Omit<ShippingZone, 'id'>) => Promise<void>;
  updateShippingZone:(zone: ShippingZone) => Promise<void>;
  deleteShippingZone:(id: string) => Promise<void>;
  addExpense:        (data: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense:     (expense: Expense) => Promise<void>;
  deleteExpense:     (id: string) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppStore;
  loading: boolean;
  db: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [loading, setLoading] = useState(true);

  // ── Load data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const [clients, products, orders, shippingZones, expenses] = await Promise.all([
          loadCollection<Client>('clients', 'createdAt'),
          loadCollection<Product>('products', 'updatedAt'),
          loadCollection<Order>('orders', 'createdAt'),
          loadCollection<ShippingZone>('shippingZones', 'name'),
          loadCollection<Expense>('expenses', 'date'),
        ]);

        // Insertar datos por defecto si es la primera vez
        let finalZones = shippingZones;
        let finalProducts = products;

        if (shippingZones.length === 0) {
          finalZones = await insertDefaultZones();
        }
        if (products.length === 0) {
          finalProducts = await insertDefaultProducts();
        }

        dispatch({
          type: 'SET_ALL',
          payload: { clients, products: finalProducts, orders, shippingZones: finalZones, expenses },
        });
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  async function insertDefaultZones(): Promise<ShippingZone[]> {
    const zones: ShippingZone[] = [];
    for (const z of DEFAULT_ZONES) {
      const ref = await addDoc(col('shippingZones'), z);
      zones.push({ id: ref.id, ...z });
    }
    return zones;
  }

  async function insertDefaultProducts(): Promise<Product[]> {
    const now = new Date().toISOString();
    const prods: Product[] = [];
    for (const p of DEFAULT_PRODUCTS) {
      const data = { ...p, updatedAt: now };
      const ref  = await addDoc(col('products'), data);
      prods.push({ id: ref.id, ...data });
    }
    return prods;
  }

  // ── Next order number ────────────────────────────────────────────────────
  function nextOrderNumber(currentOrders: Order[]): string {
    const n = currentOrders.length + 1;
    return `AD-${String(n).padStart(4, '0')}`;
  }

  // ── DB Actions ────────────────────────────────────────────────────────────
  const db: AppActions = {
    // ── Clients
    async addClient(data) {
      const now = new Date().toISOString();
      const ref = await addDoc(col('clients'), { ...data, createdAt: now });
      dispatch({ type: 'ADD_CLIENT', payload: { id: ref.id, ...data, createdAt: now } });
    },
    async updateClient(client) {
      const { id, ...data } = client;
      await updateDoc(d('clients', id), data);
      dispatch({ type: 'UPDATE_CLIENT', payload: client });
    },
    async deleteClient(id) {
      await deleteDoc(d('clients', id));
      dispatch({ type: 'DELETE_CLIENT', payload: id });
    },

    // ── Products
    async addProduct(data) {
      const now  = new Date().toISOString();
      const full = { ...data, updatedAt: now };
      const ref  = await addDoc(col('products'), full);
      dispatch({ type: 'ADD_PRODUCT', payload: { id: ref.id, ...full } });
    },
    async updateProduct(product) {
      const now = new Date().toISOString();
      const { id, ...data } = { ...product, updatedAt: now };
      await updateDoc(d('products', id), data);
      dispatch({ type: 'UPDATE_PRODUCT', payload: { id, ...data } });
    },
    async deleteProduct(id) {
      await deleteDoc(d('products', id));
      dispatch({ type: 'DELETE_PRODUCT', payload: id });
    },
    async importProducts(products) {
      // Borrar todos y reinsertar
      const snap = await getDocs(col('products'));
      const batch = writeBatch(firestore);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();

      const now  = new Date().toISOString();
      const inserted: Product[] = [];
      for (const p of products) {
        const full = { ...p, updatedAt: now };
        const ref  = await addDoc(col('products'), full);
        inserted.push({ id: ref.id, ...full });
      }
      dispatch({ type: 'SET_PRODUCTS', payload: inserted });
    },

    // ── Orders
    async addOrder(data) {
      const now         = new Date().toISOString();
      const orderNumber = nextOrderNumber(state.orders);
      const full        = { ...data, orderNumber, createdAt: now, updatedAt: now };
      const ref         = await addDoc(col('orders'), full);
      dispatch({ type: 'ADD_ORDER', payload: { id: ref.id, ...full } });
    },
    async updateOrder(order) {
      const now = new Date().toISOString();
      const { id, ...data } = { ...order, updatedAt: now };
      await updateDoc(d('orders', id), data);
      dispatch({ type: 'UPDATE_ORDER', payload: { id, ...data } });
    },
    async deleteOrder(id) {
      await deleteDoc(d('orders', id));
      dispatch({ type: 'DELETE_ORDER', payload: id });
    },

    // ── Shipping zones
    async addShippingZone(data) {
      const ref = await addDoc(col('shippingZones'), data);
      dispatch({ type: 'ADD_SHIPPING_ZONE', payload: { id: ref.id, ...data } });
    },
    async updateShippingZone(zone) {
      const { id, ...data } = zone;
      await updateDoc(d('shippingZones', id), data);
      dispatch({ type: 'UPDATE_SHIPPING_ZONE', payload: zone });
    },
    async deleteShippingZone(id) {
      await deleteDoc(d('shippingZones', id));
      dispatch({ type: 'DELETE_SHIPPING_ZONE', payload: id });
    },

    // ── Expenses
    async addExpense(data) {
      const now = new Date().toISOString();
      const ref = await addDoc(col('expenses'), { ...data, createdAt: now });
      dispatch({ type: 'ADD_EXPENSE', payload: { id: ref.id, ...data, createdAt: now } });
    },
    async updateExpense(expense) {
      const { id, ...data } = expense;
      await updateDoc(d('expenses', id), data);
      dispatch({ type: 'UPDATE_EXPENSE', payload: expense });
    },
    async deleteExpense(id) {
      await deleteDoc(d('expenses', id));
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
