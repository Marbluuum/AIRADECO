import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import type { ShippingZone } from '../types';
import { formatCurrency } from '../utils/format';
import { Truck, Plus, Pencil, Trash2, MapPin } from 'lucide-react';

const emptyForm = (): Omit<ShippingZone, 'id'> => ({ name: '', price: 0, description: '' });

export default function Shipping() {
  const { state, dispatch } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingZone | null>(null);
  const [toDelete, setToDelete] = useState<ShippingZone | null>(null);
  const [form, setForm] = useState(emptyForm());

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(z: ShippingZone) {
    setEditing(z);
    setForm({ name: z.name, price: z.price, description: z.description });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editing) {
      dispatch({ type: 'UPDATE_SHIPPING_ZONE', payload: { ...editing, ...form } });
    } else {
      dispatch({ type: 'ADD_SHIPPING_ZONE', payload: form });
    }
    setModalOpen(false);
  }

  const zones = [...state.shippingZones].sort((a, b) => a.price - b.price);

  return (
    <div className="flex flex-col min-h-screen pb-nav">
      <Header
        title="Zonas de Envío"
        subtitle={`${state.shippingZones.length} zonas configuradas`}
        right={
          <button className="btn-primary flex items-center gap-1 py-2 px-3 text-xs" onClick={openNew}>
            <Plus size={15} /> Nueva zona
          </button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {/* Info card */}
        <div className="bg-gold-50 border border-gold-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-gold-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gold-800">
              <p className="font-semibold mb-1">Cómo funcionan las zonas</p>
              <p className="text-xs text-gold-700">
                Configurá las zonas de envío con su precio. Al crear un pedido, elegís la zona y se calcula automáticamente el costo de envío.
              </p>
            </div>
          </div>
        </div>

        {zones.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Sin zonas configuradas"
            description="Agregá las zonas de envío con sus precios"
            action={{ label: '+ Nueva zona', onClick: openNew }}
          />
        ) : (
          <div className="space-y-2">
            {zones.map(zone => (
              <div key={zone.id} className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: zone.price === 0 ? '#dcfce7' : '#fef9c3' }}>
                  <Truck size={18} className={zone.price === 0 ? 'text-green-600' : 'text-yellow-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-dark-800 text-sm">{zone.name}</p>
                  {zone.description && <p className="text-xs text-gray-400 truncate">{zone.description}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-base font-bold ${zone.price === 0 ? 'text-green-600' : 'text-dark-800'}`}>
                    {zone.price === 0 ? 'Gratis' : formatCurrency(zone.price)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="p-2 rounded-lg hover:bg-cream-100 transition-colors"
                    onClick={() => openEdit(zone)}
                  >
                    <Pencil size={15} className="text-gray-400" />
                  </button>
                  <button
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    onClick={() => { setToDelete(zone); setDeleteOpen(true); }}
                  >
                    <Trash2 size={15} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Usage stats */}
        {zones.length > 0 && (
          <div className="card">
            <p className="section-title mb-3">Uso de zonas en pedidos</p>
            {zones.map(zone => {
              const count = state.orders.filter(o => o.shippingZoneId === zone.id).length;
              const revenue = state.orders
                .filter(o => o.shippingZoneId === zone.id)
                .reduce((s, o) => s + o.shippingCost, 0);
              return (
                <div key={zone.id} className="flex items-center justify-between py-2 border-b border-cream-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-dark-700">{zone.name}</p>
                    <p className="text-xs text-gray-400">{count} pedido{count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-dark-800">{formatCurrency(revenue)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar zona' : 'Nueva zona de envío'}>
        <div className="space-y-4">
          <div>
            <label className="label">Nombre de la zona *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: CABA / GBA Zona 1"
            />
          </div>
          <div>
            <label className="label">Precio de envío $</label>
            <input
              type="number" min={0} className="input"
              value={form.price}
              onChange={e => setForm({ ...form, price: Number(e.target.value) })}
              placeholder="0 = envío gratis"
            />
            {form.price === 0 && <p className="text-xs text-green-600 mt-1">Este envío será gratis</p>}
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input resize-none" rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción de la zona de cobertura…"
            />
          </div>
          <button className="btn-primary w-full" onClick={handleSave} disabled={!form.name.trim()}>
            {editing ? 'Guardar cambios' : 'Agregar zona'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (toDelete) dispatch({ type: 'DELETE_SHIPPING_ZONE', payload: toDelete.id });
          setToDelete(null);
        }}
        title="Eliminar zona"
        message={`¿Eliminar la zona "${toDelete?.name}"?`}
      />
    </div>
  );
}
