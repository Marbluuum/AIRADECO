import type { OrderStatus, PaymentStatus } from '../../types';

const orderStatusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pendiente:        { label: 'Pendiente',        color: 'bg-yellow-100 text-yellow-700' },
  en_proceso:       { label: 'En proceso',       color: 'bg-blue-100 text-blue-700' },
  listo_para_envio: { label: 'Listo p/ envío',   color: 'bg-purple-100 text-purple-700' },
  enviado:          { label: 'Enviado',           color: 'bg-orange-100 text-orange-700' },
  entregado:        { label: 'Entregado',         color: 'bg-green-100 text-green-700' },
  cancelado:        { label: 'Cancelado',         color: 'bg-red-100 text-red-600' },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  pendiente: { label: 'Sin pago',    color: 'bg-red-100 text-red-600' },
  parcial:   { label: 'Pago parcial', color: 'bg-yellow-100 text-yellow-700' },
  pagado:    { label: 'Pagado',      color: 'bg-green-100 text-green-700' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = orderStatusConfig[status];
  return <span className={`badge ${cfg.color}`}>{cfg.label}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = paymentStatusConfig[status];
  return <span className={`badge ${cfg.color}`}>{cfg.label}</span>;
}
