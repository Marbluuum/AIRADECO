import type { AppStore, Order, ShippingZone, Product } from '../types';

const STORAGE_KEY = 'airadeco_v1';

const defaultShippingZones: ShippingZone[] = [
  { id: 'z1', name: 'Local (mismo barrio)', price: 0, description: 'Entrega sin costo' },
  { id: 'z2', name: 'CABA / GBA Zona 1', price: 2500, description: 'Capital y zona norte/sur cercana' },
  { id: 'z3', name: 'GBA Zona 2', price: 4500, description: 'Gran Buenos Aires lejano' },
  { id: 'z4', name: 'Interior del país', price: 8000, description: 'Envío por transporte/flota' },
];

const defaultProducts: Product[] = [
  { id: 'p1', name: 'Sillón esquinero', category: 'Sillones', costPrice: 85000, salePrice: 130000, stock: 3, description: '', updatedAt: new Date().toISOString() },
  { id: 'p2', name: 'Mesa ratona vidrio', category: 'Mesas', costPrice: 42000, salePrice: 68000, stock: 5, description: '', updatedAt: new Date().toISOString() },
  { id: 'p3', name: 'Cama sommier 2 plazas', category: 'Camas', costPrice: 120000, salePrice: 185000, stock: 2, description: '', updatedAt: new Date().toISOString() },
  { id: 'p4', name: 'Comedor 6 sillas', category: 'Comedores', costPrice: 165000, salePrice: 250000, stock: 1, description: '', updatedAt: new Date().toISOString() },
];

function getInitialStore(): AppStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    clients: [],
    products: defaultProducts,
    orders: [],
    shippingZones: defaultShippingZones,
    expenses: [],
  };
}

function saveStore(store: AppStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadStore(): AppStore {
  return getInitialStore();
}

export function persistStore(store: AppStore) {
  saveStore(store);
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function generateOrderNumber(orders: Order[]): string {
  const next = orders.length + 1;
  return `AD-${String(next).padStart(4, '0')}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
