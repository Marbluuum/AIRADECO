import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import type { Client } from '../types';
import { formatDate } from '../utils/format';
import { Users, Plus, Search, Download, Pencil, Trash2, Phone, MapPin, Mail, ChevronRight } from 'lucide-react';

const empty: Omit<Client, 'id' | 'createdAt'> = {
  name: '', phone: '', email: '', address: '', city: '', province: '', notes: ''
};

export default function Clients() {
  const { state, db, loading } = useApp();
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing]     = useState<Client | null>(null);
  const [selected, setSelected]   = useState<Client | null>(null);
  const [form, setForm]           = useState(empty);
  const [saving, setSaving]       = useState(false);

  const filtered = useMemo(() =>
    state.clients.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.clients, search]
  );

  function openNew() {
    setEditing(null);
    setForm(empty);
    setModalOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, city: c.city, province: c.province, notes: c.notes });
    setDetailOpen(false);
    setModalOpen(true);
  }

  function openDetail(c: Client) {
    setSelected(c);
    setDetailOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await db.updateClient({ ...editing, ...form });
      } else {
        await db.addClient(form);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    await db.deleteClient(selected.id);
    setDetailOpen(false);
    setSelected(null);
  }

  function exportCSV() {
    const headers = ['Nombre', 'Teléfono', 'Email', 'Dirección', 'Ciudad', 'Provincia', 'Notas', 'Fecha Alta'];
    const rows = state.clients.map(c => [
      c.name, c.phone, c.email, c.address, c.city, c.province, c.notes, formatDate(c.createdAt)
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'clientes-airadeco.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const clientOrders = selected
    ? state.orders.filter(o => o.clientId === selected.id)
    : [];

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
        title="Clientes"
        subtitle={`${state.clients.length} registrados`}
        right={
          <div className="flex gap-2">
            <button className="btn-ghost p-2" onClick={exportCSV}>
              <Download size={18} />
            </button>
            <button className="btn-primary flex items-center gap-1 py-2 px-3 text-xs" onClick={openNew}>
              <Plus size={15} /> Nuevo
            </button>
          </div>
        }
      />

      <div className="px-4 py-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre, teléfono, ciudad…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin clientes aún"
            description="Agregá tu primer cliente para comenzar"
            action={{ label: '+ Agregar cliente', onClick: openNew }}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <button
                key={c.id}
                className="card w-full text-left flex items-center justify-between gap-3 hover:border-gold-300 transition-colors"
                onClick={() => openDetail(c)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gold-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-dark-800 text-sm truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {c.phone || c.email || `${c.city}${c.province ? `, ${c.province}` : ''}`}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar cliente' : 'Nuevo cliente'}>
        <div className="space-y-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="María García" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Teléfono</label>
              <input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="11 1234-5678" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="mail@ejemplo.com" />
            </div>
          </div>
          <div>
            <label className="label">Dirección</label>
            <input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Av. Corrientes 1234, Piso 3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ciudad</label>
              <input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Buenos Aires" />
            </div>
            <div>
              <label className="label">Provincia</label>
              <input className="input" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} placeholder="CABA" />
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones del cliente…" />
          </div>
          <button className="btn-primary w-full" onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar cliente'}
          </button>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected.name}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gold-400 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-2xl">{selected.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-bold text-dark-800">{selected.name}</p>
                <p className="text-xs text-gray-400">Cliente desde {formatDate(selected.createdAt)}</p>
              </div>
            </div>

            <div className="space-y-2">
              {selected.phone && (
                <a href={`tel:${selected.phone}`} className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl hover:bg-cream-100">
                  <Phone size={16} className="text-gold-500" />
                  <span className="text-sm text-dark-700">{selected.phone}</span>
                </a>
              )}
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl hover:bg-cream-100">
                  <Mail size={16} className="text-gold-500" />
                  <span className="text-sm text-dark-700">{selected.email}</span>
                </a>
              )}
              {(selected.address || selected.city) && (
                <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl">
                  <MapPin size={16} className="text-gold-500" />
                  <span className="text-sm text-dark-700">
                    {[selected.address, selected.city, selected.province].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {selected.notes && (
                <div className="p-3 bg-cream-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Notas</p>
                  <p className="text-sm text-dark-700">{selected.notes}</p>
                </div>
              )}
            </div>

            {clientOrders.length > 0 && (
              <div>
                <p className="label">Pedidos ({clientOrders.length})</p>
                <div className="space-y-2">
                  {clientOrders.map(o => (
                    <div key={o.id} className="flex justify-between items-center p-3 bg-cream-50 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold">{o.orderNumber}</p>
                        <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-dark-800">
                          ${o.total.toLocaleString('es-AR')}
                        </p>
                        <span className={`text-xs font-medium ${o.paymentStatus === 'pagado' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {o.paymentStatus === 'pagado' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
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
        onConfirm={handleDelete}
        title="Eliminar cliente"
        message={`¿Eliminar a ${selected?.name}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
