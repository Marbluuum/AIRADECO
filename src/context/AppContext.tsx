import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import type { AppStore, Client, Product, Order, ShippingZone, Expense } from '../types';
import { supabase } from '../lib/supabase';

// ─── Helpers: DB ↔ App field mapping ─────────────────────────────────────────

function dbToClient(r: Record<string, unknown>): Client {
  return {
    id: r.id as string,
    name: r.name as string,
    phone: (r.phone as string) ?? '',
    email: (r.email as string) ?? '',
    address: (r.address as string) ?? '',
    city: (r.city as string) ?? '',
    province: (r.province as string) ?? '',
    notes: (r.notes as string) ?? '',
    createdAt: r.created_at as string,
  };
}

function dbToProduct(r: Record<string, unknown>): Product {
  return {
    id: r.id as string,
    name: r.name as string,
    category: (r.category as string) ?? '',
    costPrice: Number(r.cost_price) ?? 0,
    salePrice: Number(r.sale_price) ?? 0,
    stock: Number(r.stock) ?? 0,
    description: (r.description as string) ?? '',
    updatedAt: r.updated_at as string,
  };
}

function dbToOrder(r: Record<string, unknown>): Order {
  return {
    id: r.id as string,
    orderNumber: r.order_number as string,
    clientId: (r.client_id as string) ?? '',
    clientName: r.client_name as string,
    seller: r.seller as string,
    channel: r.channel as import('../types').SaleChannel,
    items: (r.items as import('../types').OrderItem[]) ?? [],
    shippingZoneId: (r.shipping_zone_id as string) ?? '',
    shippingZoneName: (r.shipping_zone_name as string) ?? '',
    shippingCost: Number(r.shipping_cost) ?? 0,
    subtotal: Number(r.subtotal) ?? 0,
    total: Number(r.total) ?? 0,
    totalCost: Number(r.total_cost) ?? 0,
    amountPaid: Number(r.amount_paid) ?? 0,
    paymentStatus: r.payment_status as import('../types').PaymentStatus,
    status: r.status as import('../types').OrderStatus,
    notes: (r.notes as string) ?? '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function dbToShippingZone(r: Record<string, unknown>): ShippingZone {
  return {
    id: r.id as string,
    name: r.name as string,
    price: Number(r.price) ?? 0,
    description: (r.description as string) ?? '',
  };
}

function dbToExpense(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string,
    description: r.description as string,
    amount: Number(r.amount) ?? 0,
    category: (r.category as string) ?? '',
    date: r.date as string,
    createdAt: r.created_at as string,
  };
}

// ─── Local state actions (for optimistic updates) ─────────────────────────────

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
    case 'SET_ALL':      return action.payload;
    case 'ADD_CLIENT':   return { ...state, clients: [action.payload, ...state.clients] };
    case 'UPDATE_CLIENT':return { ...state, clients: state.clients.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CLIENT':return { ...state, clients: state.clients.filter(c => c.id !== action.payload) };
    case 'ADD_PRODUCT':  return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':return { ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PRODUCT':return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'SET_PRODUCTS': return { ...state, products: action.payload };
    case 'ADD_ORDER':    return { ...state, orders: [action.payload, ...state.orders] };
    case 'UPDATE_ORDER': return { ...state, orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o) };
    case 'DELETE_ORDER': return { ...state, orders: state.orders.filter(o => o.id !== action.payload) };
    case 'ADD_SHIPPING_ZONE':    return { ...state, shippingZones: [...state.shippingZones, action.payload] };
    case 'UPDATE_SHIPPING_ZONE': return { ...state, shippingZones: state.shippingZones.map(z => z.id === action.payload.id ? action.payload : z) };
    case 'DELETE_SHIPPING_ZONE': return { ...state, shippingZones: state.shippingZones.filter(z => z.id !== action.payload) };
    case 'ADD_EXPENSE':   return { ...state, expenses: [...state.expenses, action.payload] };
    case 'UPDATE_EXPENSE':return { ...state, expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EXPENSE':return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };
    default:             return state;
  }
}

// ─── DB Actions ───────────────────────────────────────────────────────────────

export interface AppActions {
  addClient:    (data: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  addProduct:    (data: Omit<Product, 'id' | 'updatedAt'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  importProducts:(products: Omit<Product, 'id' | 'updatedAt'>[]) => Promise<void>;

  addOrder:    (data: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  addShippingZone:    (data: Omit<ShippingZone, 'id'>) => Promise<void>;
  updateShippingZone: (zone: ShippingZone) => Promise<void>;
  deleteShippingZone: (id: string) => Promise<void>;

  addExpense:    (data: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
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

  // ── Load all data from Supabase on mount ──────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const [clients, products, orders, zones, expenses] = await Promise.all([
          supabase.from('clients').select('*').order('created_at', { ascending: false }),
          supabase.from('products').select('*').order('name'),
          supabase.from('orders').select('*').order('created_at', { ascending: false }),
          supabase.from('shipping_zones').select('*').order('price'),
          supabase.from('expenses').select('*').order('date', { ascending: false }),
        ]);
        dispatch({
          type: 'SET_ALL',
          payload: {
            clients:       (clients.data  ?? []).map(r => dbToClient(r as Record<string, unknown>)),
            products:      (products.data ?? []).map(r => dbToProduct(r as Record<string, unknown>)),
            orders:        (orders.data   ?? []).map(r => dbToOrder(r as Record<string, unknown>)),
            shippingZones: (zones.data    ?? []).map(r => dbToShippingZone(r as Record<string, unknown>)),
            expenses:      (expenses.data ?? []).map(r => dbToExpense(r as Record<string, unknown>)),
          },
        });
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ── Helper: next order number ────────────────────────────────────────────
  async function nextOrderNumber(): Promise<string> {
    const { data } = await supabase
      .from('orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1);
    const last = data?.[0]?.order_number as string | undefined;
    const n = last ? (parseInt(last.replace('AD-', '')) + 1) : (state.orders.length + 1);
    return `AD-${String(n).padStart(4, '0')}`;
  }

  // ── DB Actions ────────────────────────────────────────────────────────────
  const db: AppActions = {
    // Clients
    async addClient(data) {
      const { data: row, error } = await supabase.from('clients').insert({
        name: data.name, phone: data.phone, email: data.email,
        address: data.address, city: data.city, province: data.province, notes: data.notes,
      }).select().single();
      if (error) throw error;
      dispatch({ type: 'ADD_CLIENT', payload: dbToClient(row as Record<string, unknown>) });
    },
    async updateClient(client) {
      const { error } = await supabase.from('clients').update({
        name: client.name, phone: client.phone, email: client.email,
        address: client.address, city: client.city, province: client.province, notes: client.notes,
      }).eq('id', client.id);
      if (error) throw error;
      dispatch({ type: 'UPDATE_CLIENT', payload: client });
    },
    async deleteClient(id) {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      dispatch({ type: 'DELETE_CLIENT', payload: id });
    },

    // Products
    async addProduct(data) {
      const { data: row, error } = await supabase.from('products').insert({
        name: data.name, category: data.category,
        cost_price: data.costPrice, sale_price: data.salePrice,
        stock: data.stock, description: data.description,
      }).select().single();
      if (error) throw error;
      dispatch({ type: 'ADD_PRODUCT', payload: dbToProduct(row as Record<string, unknown>) });
    },
    async updateProduct(product) {
      const now = new Date().toISOString();
      const { error } = await supabase.from('products').update({
        name: product.name, category: product.category,
        cost_price: product.costPrice, sale_price: product.salePrice,
        stock: product.stock, description: product.description,
        updated_at: now,
      }).eq('id', product.id);
      if (error) throw error;
      dispatch({ type: 'UPDATE_PRODUCT', payload: { ...product, updatedAt: now } });
    },
    async deleteProduct(id) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      dispatch({ type: 'DELETE_PRODUCT', payload: id });
    },
    async importProducts(products) {
      // Delete all and re-insert
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (products.length === 0) { dispatch({ type: 'SET_PRODUCTS', payload: [] }); return; }
      const rows = products.map(p => ({
        name: p.name, category: p.category,
        cost_price: p.costPrice, sale_price: p.salePrice,
        stock: p.stock, description: p.description,
      }));
      const { data, error } = await supabase.from('products').insert(rows).select();
      if (error) throw error;
      dispatch({ type: 'SET_PRODUCTS', payload: (data ?? []).map(r => dbToProduct(r as Record<string, unknown>)) });
    },

    // Orders
    async addOrder(data) {
      const orderNumber = await nextOrderNumber();
      const now = new Date().toISOString();
      const { data: row, error } = await supabase.from('orders').insert({
        order_number: orderNumber,
        client_id: data.clientId,
        client_name: data.clientName,
        seller: data.seller,
        channel: data.channel,
        items: data.items,
        shipping_zone_id: data.shippingZoneId,
        shipping_zone_name: data.shippingZoneName,
        shipping_cost: data.shippingCost,
        subtotal: data.subtotal,
        total: data.total,
        total_cost: data.totalCost,
        amount_paid: data.amountPaid,
        payment_status: data.paymentStatus,
        status: data.status,
        notes: data.notes,
        created_at: now,
        updated_at: now,
      }).select().single();
      if (error) throw error;
      dispatch({ type: 'ADD_ORDER', payload: dbToOrder(row as Record<string, unknown>) });
    },
    async updateOrder(order) {
      const now = new Date().toISOString();
      const { error } = await supabase.from('orders').update({
        client_id: order.clientId,
        client_name: order.clientName,
        seller: order.seller,
        channel: order.channel,
        items: order.items,
        shipping_zone_id: order.shippingZoneId,
        shipping_zone_name: order.shippingZoneName,
        shipping_cost: order.shippingCost,
        subtotal: order.subtotal,
        total: order.total,
        total_cost: order.totalCost,
        amount_paid: order.amountPaid,
        payment_status: order.paymentStatus,
        status: order.status,
        notes: order.notes,
        updated_at: now,
      }).eq('id', order.id);
      if (error) throw error;
      dispatch({ type: 'UPDATE_ORDER', payload: { ...order, updatedAt: now } });
    },
    async deleteOrder(id) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      dispatch({ type: 'DELETE_ORDER', payload: id });
    },

    // Shipping zones
    async addShippingZone(data) {
      const { data: row, error } = await supabase.from('shipping_zones').insert({
        name: data.name, price: data.price, description: data.description,
      }).select().single();
      if (error) throw error;
      dispatch({ type: 'ADD_SHIPPING_ZONE', payload: dbToShippingZone(row as Record<string, unknown>) });
    },
    async updateShippingZone(zone) {
      const { error } = await supabase.from('shipping_zones').update({
        name: zone.name, price: zone.price, description: zone.description,
      }).eq('id', zone.id);
      if (error) throw error;
      dispatch({ type: 'UPDATE_SHIPPING_ZONE', payload: zone });
    },
    async deleteShippingZone(id) {
      const { error } = await supabase.from('shipping_zones').delete().eq('id', id);
      if (error) throw error;
      dispatch({ type: 'DELETE_SHIPPING_ZONE', payload: id });
    },

    // Expenses
    async addExpense(data) {
      const { data: row, error } = await supabase.from('expenses').insert({
        description: data.description, amount: data.amount,
        category: data.category, date: data.date,
      }).select().single();
      if (error) throw error;
      dispatch({ type: 'ADD_EXPENSE', payload: dbToExpense(row as Record<string, unknown>) });
    },
    async updateExpense(expense) {
      const { error } = await supabase.from('expenses').update({
        description: expense.description, amount: expense.amount,
        category: expense.category, date: expense.date,
      }).eq('id', expense.id);
      if (error) throw error;
      dispatch({ type: 'UPDATE_EXPENSE', payload: expense });
    },
    async deleteExpense(id) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
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
