import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth, SELLERS } from '../context/AuthContext';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/ui/StatusBadge';
import type { Order, OrderItem, OrderStatus, SaleChannel, PaymentStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import {
  ShoppingBag, Plus, Search, Filter, Pencil, Trash2, X
} from 'lucide-react';

const CHANNELS: SaleChannel[] = ['Instagram', 'Facebook', 'WhatsApp', 'Mercado Libre', 'Tienda Online', 'Presencial', 'Otro'];
const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'pendiente',        label: 'Pendiente' },
  { value: 'en_proceso',       label: 'En proceso' },
  { value: 'listo_para_envio', label: 'Listo p/ envío' },
  { value: 'enviado',          label: 'Enviado' },
  { value: 'entregado',        label: 'Entregado' },
  { value: 'cancelado',        label: 'Cancelado' },
];

type Step = 'client' | 'items' | 'shipping' | 'payment';

interface FormState {
  clientId: string;
  clientName: string;
  seller: string;
  channel: SaleChannel;
  items: OrderItem[];
  shippingZoneId: string;
  shippingZoneName: string;
  shippingCost: number;
  notes: string;
  status: OrderStatus;
  amountPaid: number;
  paymentStatus: PaymentStatus;
}

export default function Orders() {
  const { state, db, loading } = useApp();
  const { profile } = useAuth();

  function emptyForm(): FormState {
    return {
      clientId: '', clientName: '', seller: profile?.name ?? '',
      channel: 'WhatsApp', items: [],
      shippingZoneId: '', shippingZoneName: 'Sin envío', shippingCost: 0,
      notes: '', status: 'pendiente', amountPaid: 0, paymentStatus: 'pendiente',
    };
  }

  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'todos'>('todos');
  const [filterSeller, setFilterSeller] = useState<string>('todos');
  const [showFilters, setShowFilters]   = useState(false);
  const [modalOpen, setModalOpen]       = useState(false);
  const [step, setStep]                 = useState<Step>('client');
  const [detailOpen, setDetailOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [editing, setEditing]           = useState<Order | null>(null);
  const [selected, setSelected]         = useState<Order | null>(null);
  const [form, setForm]                 = useState<FormState>(emptyForm());
  const [newClientName, setNewClientName] = useState('');
  const [saving, setSaving]             = useState(false);

  // Sellers: lista estática + cualquier nombre extra que venga de pedidos viejos
  const knownSellers = useMemo(() => {
    const set = new Set<string>([...SELLERS]);
    state.orders.forEach(o => { if (o.seller) set.add(o.seller); });
    return Array.from(set).sort();
  }, [state.orders]);

  const filtered = useMemo(() => {
    let list = state.orders;
    if (search) list = list.filter(o =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName.toLowerCase().includes(search.toLowerCase()) ||
      o.channel.toLowerCase().includes(search.toLowerCase())
    );
    if (filterStatus !== 'todos') list = list.filter(o => o.status === filterStatus);
    if (filterSeller !== 'todos') list = list.filter(o => o.seller === filterSeller);
    return list;
  }, [state.orders, search, filterStatus, filterSeller]);

  const subtotal  = form.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total     = subtotal + form.shippingCost;
  const totalCost = form.items.reduce((s, i) => s + i.costPrice * i.quantity, 0) + form.shippingCost;

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setStep('client');
    setModalOpen(true);
  }

  function openEdit(o: Order) {
    setEditing(o);
    setForm({
      clientId: o.clientId, clientName: o.clientName, seller: o.seller,
      channel: o.channel, items: [...o.items], shippingZoneId: o.shippingZoneId,
      shippingZoneName: o.shippingZoneName, shippingCost: o.shippingCost,
      notes: o.notes, status: o.status, amountPaid: o.amountPaid, paymentStatus: o.paymentStatus,
    });
    setStep('client');
    setDetailOpen(false);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const ps: PaymentStatus = form.amountPaid >= total ? 'pagado' : form.amountPaid > 0 ? 'parcial' : 'pendiente';
      const payload = { ...form, subtotal, total, totalCost, paymentStatus: ps };
      if (editing) {
        await db.updateOrder({ ...editing, ...payload });
      } else {
        await db.addOrder(payload);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function addItem(productId: string) {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;
    const exists = form.items.findIndex(i => i.productId === productId);
    if (exists >= 0) {
      const items = [...form.items];
      items[exists] = { ...items[exists], quantity: items[exists].quantity + 1 };
      setForm({ ...form, items });
    } else {
      setForm({
        ...form,
        items: [...form.items, {
          productId: prod.id, productName: prod.name,
          quantity: 1, unitPrice: prod.salePrice, costPrice: prod.costPrice,
        }],
      });
    }
  }

  function updateItem(idx: number, field: 'quantity' | 'unitPrice', val: number) {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    setForm({ ...form, items });
  }

  function removeItem(idx: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  }

  function selectZone(zoneId: string) {
    const zone = state.shippingZones.find(z => z.id === zoneId);
    if (zone) setForm({ ...form, shippingZoneId: zone.id, shippingZoneName: zone.name, shippingCost: zone.price });
  }

  function selectClient(clientId: string) {
    const c = state.clients.find(c => c.id === clientId);
    if (c) setForm({ ...form, clientId: c.id, clientName: c.name });
  }

  async function addNewClient() {
    if (!newClientName.trim()) return;
    await db.addClient({ name: newClientName.trim(), phone: '', email: '', address: '', city: '', province: '', notes: '', seller: '' });
    setNewClientName('');
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen pb-nav items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-nav">
      <Header
        title="Pedidos"
        subtitle={`${state.orders.length} en total`}
        right={
          <button className="btn-primary flex items-center gap-1 py-2 px-3 text-xs" onClick={openNew}>
            <Plus size={15} /> Nuevo
          </button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {/* Search + filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Buscar pedido…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            className={`p-2.5 rounded-xl border transition-colors ${showFilters ? 'bg-gold-500 text-white border-gold-500' : 'bg-white border-cream-300'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
          </button>
        </div>

        {showFilters && (
          <div className="card grid grid-cols-2 gap-3 slide-up">
            <div>
              <label className="label">Estado</label>
              <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                <option value="todos">Todos</option>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vendedora</label>
              <select className="select" value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
                <option value="todos">Todas</option>
                {knownSellers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Status chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[{ value: 'todos', label: 'Todos' }, ...STATUSES].map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value as any)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterStatus === s.value ? 'bg-dark-800 text-white' : 'bg-white text-gray-500 border border-cream-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Sin pedidos" description="Registrá tu primer venta" action={{ label: '+ Nuevo pedido', onClick: openNew }} />
        ) : (
          <div className="space-y-2">
            {filtered.map(o => (
              <button key={o.id} className="card w-full text-left" onClick={() => { setSelected(o); setDetailOpen(true); }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-bold text-dark-800 text-sm">{o.orderNumber}</p>
                    <p className="text-xs text-gray-500">{o.clientName} · {o.seller}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-dark-800">{formatCurrency(o.total)}</p>
                    <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <OrderStatusBadge status={o.status} />
                  <PaymentStatusBadge status={o.paymentStatus} />
                  <span className="badge bg-cream-100 text-gray-500">{o.channel}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── New/Edit Order Modal ─── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar pedido' : 'Nuevo pedido'}>
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6">
          {(['client', 'items', 'shipping', 'payment'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <button
                onClick={() => setStep(s)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s ? 'bg-gold-500 text-white' : 'bg-cream-200 text-gray-400'
                }`}
              >
                {i + 1}
              </button>
              {i < 3 && <div className="flex-1 h-px bg-cream-200 mx-1" />}
            </div>
          ))}
        </div>

        {/* Step: Client */}
        {step === 'client' && (
          <div className="space-y-4">
            <div>
              <label className="label">Cliente</label>
              <select className="select mb-2" value={form.clientId} onChange={e => selectClient(e.target.value)}>
                <option value="">Seleccionar cliente…</option>
                {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="O crear nuevo: nombre…" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                <button className="btn-secondary text-xs px-3" onClick={addNewClient}>Agregar</button>
              </div>
            </div>
            <div>
              <label className="label">Vendedora</label>
              <input
                className="input"
                value={form.seller}
                onChange={e => setForm({ ...form, seller: e.target.value })}
                placeholder="Nombre de la vendedora"
              />
              {knownSellers.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {knownSellers.map(s => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, seller: s })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        form.seller === s ? 'bg-dark-800 text-white' : 'bg-cream-100 text-dark-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="label">Canal de venta</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, channel: c })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      form.channel === c ? 'bg-gold-500 text-white' : 'bg-cream-100 text-dark-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Estado del pedido</label>
              <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as OrderStatus })}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <button
              className="btn-primary w-full"
              disabled={!form.clientId && !form.clientName}
              onClick={() => setStep('items')}
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Step: Items */}
        {step === 'items' && (
          <div className="space-y-4">
            <div>
              <label className="label">Agregar producto</label>
              <select className="select" onChange={e => { if (e.target.value) addItem(e.target.value); e.target.value = ''; }}>
                <option value="">Seleccionar producto…</option>
                {state.products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.salePrice)}</option>
                ))}
              </select>
            </div>
            {form.items.length > 0 && (
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="bg-cream-50 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-semibold text-dark-800 flex-1 pr-2">{item.productName}</p>
                      <button onClick={() => removeItem(i)}>
                        <X size={15} className="text-red-400" />
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="label">Cantidad</label>
                        <input
                          type="number" min={1} className="input"
                          value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="label">Precio cobrado</label>
                        <input
                          type="number" min={0} className="input"
                          value={item.unitPrice}
                          onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Subtotal: {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-dark-800 px-1">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              </div>
            )}
            <div>
              <label className="label">Notas del pedido</label>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones…" />
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep('client')}>← Volver</button>
              <button className="btn-primary flex-1" disabled={form.items.length === 0} onClick={() => setStep('shipping')}>Siguiente →</button>
            </div>
          </div>
        )}

        {/* Step: Shipping */}
        {step === 'shipping' && (
          <div className="space-y-4">
            <div>
              <label className="label">Zona de envío</label>
              <div className="space-y-2">
                {state.shippingZones.map(z => (
                  <button
                    key={z.id}
                    onClick={() => selectZone(z.id)}
                    className={`w-full p-3 rounded-xl text-left border transition-colors ${
                      form.shippingZoneId === z.id
                        ? 'border-gold-500 bg-gold-50'
                        : 'border-cream-200 bg-white hover:border-cream-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-dark-800">{z.name}</p>
                        <p className="text-xs text-gray-400">{z.description}</p>
                      </div>
                      <span className="text-sm font-bold text-gold-600">
                        {z.price === 0 ? 'Gratis' : formatCurrency(z.price)}
                      </span>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setForm({ ...form, shippingZoneId: '', shippingZoneName: 'Sin envío', shippingCost: 0 })}
                  className={`w-full p-3 rounded-xl text-left border transition-colors ${
                    !form.shippingZoneId ? 'border-gold-500 bg-gold-50' : 'border-cream-200 bg-white'
                  }`}
                >
                  <p className="text-sm font-semibold text-dark-800">Sin envío / Retiro en mano</p>
                </button>
              </div>
            </div>
            <div className="card bg-cream-50">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Envío</span>
                <span>{formatCurrency(form.shippingCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-dark-800 pt-2 border-t border-cream-200 mt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep('items')}>← Volver</button>
              <button className="btn-primary flex-1" onClick={() => setStep('payment')}>Siguiente →</button>
            </div>
          </div>
        )}

        {/* Step: Payment */}
        {step === 'payment' && (
          <div className="space-y-4">
            <div className="card bg-cream-50">
              <p className="text-sm text-gray-500 mb-1">Total del pedido</p>
              <p className="text-2xl font-bold text-dark-800">{formatCurrency(total)}</p>
            </div>
            <div>
              <label className="label">Monto cobrado</label>
              <input
                type="number" min={0} max={total} className="input text-lg font-semibold"
                value={form.amountPaid}
                onChange={e => {
                  const v = Number(e.target.value);
                  const ps: PaymentStatus = v >= total ? 'pagado' : v > 0 ? 'parcial' : 'pendiente';
                  setForm({ ...form, amountPaid: v, paymentStatus: ps });
                }}
              />
              {form.amountPaid < total && form.amountPaid > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  Saldo pendiente: {formatCurrency(total - form.amountPaid)}
                </p>
              )}
            </div>
            <div>
              <label className="label">Estado de pago</label>
              <div className="flex gap-2">
                {(['pendiente', 'parcial', 'pagado'] as PaymentStatus[]).map(ps => (
                  <button
                    key={ps}
                    onClick={() => setForm({ ...form, paymentStatus: ps })}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                      form.paymentStatus === ps
                        ? ps === 'pagado' ? 'bg-green-500 text-white'
                          : ps === 'parcial' ? 'bg-yellow-400 text-dark-800'
                          : 'bg-red-400 text-white'
                        : 'bg-cream-100 text-gray-500'
                    }`}
                  >
                    {ps === 'pendiente' ? 'Sin pago' : ps === 'parcial' ? 'Parcial' : 'Pagado'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep('shipping')}>← Volver</button>
              <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear pedido'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Detail Modal ─── */}
      {selected && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected.orderNumber}>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <OrderStatusBadge status={selected.status} />
              <PaymentStatusBadge status={selected.paymentStatus} />
              <span className="badge bg-cream-100 text-gray-500">{selected.channel}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream-50 p-3 rounded-xl">
                <p className="text-xs text-gray-400 mb-0.5">Cliente</p>
                <p className="text-sm font-semibold">{selected.clientName}</p>
              </div>
              <div className="bg-cream-50 p-3 rounded-xl">
                <p className="text-xs text-gray-400 mb-0.5">Vendedora</p>
                <p className="text-sm font-semibold">{selected.seller}</p>
              </div>
              <div className="bg-cream-50 p-3 rounded-xl">
                <p className="text-xs text-gray-400 mb-0.5">Fecha</p>
                <p className="text-sm font-semibold">{formatDate(selected.createdAt)}</p>
              </div>
              <div className="bg-cream-50 p-3 rounded-xl">
                <p className="text-xs text-gray-400 mb-0.5">Envío</p>
                <p className="text-sm font-semibold">{selected.shippingZoneName}</p>
              </div>
            </div>

            <div>
              <p className="label">Productos</p>
              <div className="space-y-1">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-cream-100 last:border-0">
                    <span className="text-dark-700">{item.productName} ×{item.quantity}</span>
                    <span className="font-semibold">{formatCurrency(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-cream-50 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Envío</span>
                <span>{formatCurrency(selected.shippingCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-dark-800 pt-2 border-t border-cream-200 mt-1">
                <span>Total</span>
                <span>{formatCurrency(selected.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cobrado</span>
                <span className="text-green-600 font-semibold">{formatCurrency(selected.amountPaid)}</span>
              </div>
              {selected.amountPaid < selected.total && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Saldo</span>
                  <span className="text-red-500 font-semibold">{formatCurrency(selected.total - selected.amountPaid)}</span>
                </div>
              )}
            </div>

            <div className="bg-gold-50 border border-gold-200 rounded-xl p-3">
              <p className="text-xs text-gold-700 font-semibold mb-1">Rentabilidad del pedido</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Costo total</span>
                <span>{formatCurrency(selected.totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold mt-1">
                <span className="text-gold-700">Ganancia bruta</span>
                <span className={selected.total - selected.totalCost >= 0 ? 'text-green-600' : 'text-red-500'}>
                  {formatCurrency(selected.total - selected.totalCost)}
                </span>
              </div>
              <p className="text-xs text-gold-600 mt-0.5">
                Margen: {selected.total > 0 ? (((selected.total - selected.totalCost) / selected.total) * 100).toFixed(0) : 0}%
              </p>
            </div>

            {selected.notes && (
              <div className="bg-cream-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">Notas</p>
                <p className="text-sm text-dark-700">{selected.notes}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={() => openEdit(selected)}>
                <Pencil size={15} /> Editar
              </button>
              <button className="btn-danger flex-1 flex items-center justify-center gap-2" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (selected) {
            await db.deleteOrder(selected.id);
            setDetailOpen(false);
            setSelected(null);
          }
        }}
        title="Eliminar pedido"
        message={`¿Eliminar el pedido ${selected?.orderNumber}?`}
      />
    </div>
  );
}
