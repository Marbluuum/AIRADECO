export type Seller = 'Yanil Giselle' | 'Taiel';

export type OrderStatus =
  | 'pendiente'
  | 'en_proceso'
  | 'listo_para_envio'
  | 'enviado'
  | 'entregado'
  | 'cancelado';

export type SaleChannel =
  | 'Instagram'
  | 'Facebook'
  | 'WhatsApp'
  | 'Mercado Libre'
  | 'Tienda Online'
  | 'Presencial'
  | 'Otro';

export type PaymentStatus = 'pendiente' | 'parcial' | 'pagado';

// ─── Client ────────────────────────────────────────────────────────────────
export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  notes: string;
  createdAt: string;
}

// ─── Product ───────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;   // precio de compra
  salePrice: number;   // precio de venta sugerido
  stock: number;
  description: string;
  updatedAt: string;
}

// ─── Shipping Zone ──────────────────────────────────────────────────────────
export interface ShippingZone {
  id: string;
  name: string;
  price: number;
  description: string;
}

// ─── Order Item ─────────────────────────────────────────────────────────────
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;   // precio cobrado al cliente
  costPrice: number;   // costo del producto
}

// ─── Order ──────────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  seller: Seller;
  channel: SaleChannel;
  items: OrderItem[];
  shippingZoneId: string;
  shippingZoneName: string;
  shippingCost: number;
  subtotal: number;
  total: number;
  totalCost: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Expense ─────────────────────────────────────────────────────────────────
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
}

// ─── App Store ───────────────────────────────────────────────────────────────
export interface AppStore {
  clients: Client[];
  products: Product[];
  orders: Order[];
  shippingZones: ShippingZone[];
  expenses: Expense[];
}
