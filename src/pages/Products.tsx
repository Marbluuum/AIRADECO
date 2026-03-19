import { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import type { Product } from '../types';
import { formatCurrency } from '../utils/format';
import { Package, Plus, Search, Pencil, Trash2, Upload, Download, TrendingUp } from 'lucide-react';

const CATEGORIES = ['Sillones', 'Mesas', 'Camas', 'Comedores', 'Roperos', 'Bibliotecas', 'Escritorios', 'Otro'];

const emptyForm = (): Omit<Product, 'id' | 'updatedAt'> => ({
  name: '', category: 'Sillones', costPrice: 0, salePrice: 0, stock: 0, description: '',
});

export default function Products() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [sheetsUrl, setSheetsUrl] = useState(localStorage.getItem('airadeco_sheets_url') || '');
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const cats = new Set(state.products.map(p => p.category));
    return ['todos', ...Array.from(cats)];
  }, [state.products]);

  const filtered = useMemo(() =>
    state.products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === 'todos' || p.category === filterCat;
      return matchSearch && matchCat;
    }).sort((a, b) => a.name.localeCompare(b.name)),
    [state.products, search, filterCat]
  );

  const margin = (p: Product) => p.salePrice > 0
    ? (((p.salePrice - p.costPrice) / p.salePrice) * 100).toFixed(0)
    : '0';

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, category: p.category, costPrice: p.costPrice, salePrice: p.salePrice, stock: p.stock, description: p.description });
    setDetailOpen(false);
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editing) {
      dispatch({ type: 'UPDATE_PRODUCT', payload: { ...editing, ...form } });
    } else {
      dispatch({ type: 'ADD_PRODUCT', payload: form });
    }
    setModalOpen(false);
  }

  function exportCSV() {
    const headers = ['Nombre', 'Categoría', 'Costo', 'Venta', 'Margen %', 'Stock'];
    const rows = state.products.map(p => [
      p.name, p.category, p.costPrice, p.salePrice, margin(p), p.stock
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'productos-airadeco.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // Import CSV from Google Sheets (published CSV URL)
  async function syncFromSheets() {
    if (!sheetsUrl) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch(sheetsUrl);
      if (!res.ok) throw new Error('No se pudo conectar');
      const text = await res.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) throw new Error('El archivo está vacío');
      // Expected columns: Nombre, Categoría, Costo, Venta, Stock, Descripción
      const products: Product[] = lines.slice(1).map((line, i) => {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        return {
          id: `sheet_${i}`,
          name: cols[0] || '',
          category: cols[1] || 'Otro',
          costPrice: parseFloat(cols[2]) || 0,
          salePrice: parseFloat(cols[3]) || 0,
          stock: parseInt(cols[4]) || 0,
          description: cols[5] || '',
          updatedAt: new Date().toISOString(),
        };
      }).filter(p => p.name);
      dispatch({ type: 'IMPORT_PRODUCTS', payload: products });
      setSyncMsg(`✓ ${products.length} productos importados`);
      localStorage.setItem('airadeco_sheets_url', sheetsUrl);
    } catch (e: any) {
      setSyncMsg(`✗ Error: ${e.message}`);
    }
    setSyncing(false);
  }

  // Import from local CSV file
  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split('\n');
      const products: Product[] = lines.slice(1).map((line, i) => {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        return {
          id: `import_${i}_${Date.now()}`,
          name: cols[0] || '',
          category: cols[1] || 'Otro',
          costPrice: parseFloat(cols[2]) || 0,
          salePrice: parseFloat(cols[3]) || 0,
          stock: parseInt(cols[4]) || 0,
          description: cols[5] || '',
          updatedAt: new Date().toISOString(),
        };
      }).filter(p => p.name);
      dispatch({ type: 'IMPORT_PRODUCTS', payload: products });
      setSyncMsg(`✓ ${products.length} productos importados desde archivo`);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }

  return (
    <div className="flex flex-col min-h-screen pb-nav">
      <Header
        title="Productos y Precios"
        subtitle={`${state.products.length} productos`}
        right={
          <div className="flex gap-2">
            <button className="btn-ghost p-2" onClick={() => setSheetsOpen(true)} title="Sincronizar con Sheets">
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
          <input className="input pl-9" placeholder="Buscar producto…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterCat === cat ? 'bg-dark-800 text-white' : 'bg-white text-gray-500 border border-cream-200'
              }`}
            >
              {cat === 'todos' ? 'Todos' : cat}
            </button>
          ))}
        </div>

        {syncMsg && (
          <div className={`text-xs font-medium px-3 py-2 rounded-xl ${syncMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {syncMsg}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="Sin productos" description="Agregá los muebles con sus precios" action={{ label: '+ Agregar producto', onClick: openNew }} />
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <button
                key={p.id}
                className="card w-full text-left flex items-center gap-3 hover:border-gold-300 transition-colors"
                onClick={() => { setSelected(p); setDetailOpen(true); }}
              >
                <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center flex-shrink-0">
                  <Package size={18} className="text-gold-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-dark-800 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.category} · Stock: {p.stock}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-dark-800 text-sm">{formatCurrency(p.salePrice)}</p>
                  <p className="text-xs text-green-600">+{margin(p)}% margen</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar producto' : 'Nuevo producto'}>
        <div className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sillón esquinero 3 cuerpos" />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Precio de compra $</label>
              <input type="number" min={0} className="input" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Precio de venta $</label>
              <input type="number" min={0} className="input" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: Number(e.target.value) })} />
            </div>
          </div>
          {form.salePrice > 0 && form.costPrice > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
              <TrendingUp size={16} className="text-green-600" />
              <div>
                <p className="text-xs text-green-700 font-semibold">
                  Ganancia: {formatCurrency(form.salePrice - form.costPrice)}
                </p>
                <p className="text-xs text-green-600">Margen: {margin({ ...form, id: '', updatedAt: '' })}%</p>
              </div>
            </div>
          )}
          <div>
            <label className="label">Stock actual</label>
            <input type="number" min={0} className="input" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn-primary w-full" onClick={handleSave} disabled={!form.name.trim()}>
            {editing ? 'Guardar cambios' : 'Agregar producto'}
          </button>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected.name}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream-50 p-3 rounded-xl text-center">
                <p className="text-xs text-gray-400 mb-1">Precio compra</p>
                <p className="text-lg font-bold text-dark-800">{formatCurrency(selected.costPrice)}</p>
              </div>
              <div className="bg-cream-50 p-3 rounded-xl text-center">
                <p className="text-xs text-gray-400 mb-1">Precio venta</p>
                <p className="text-lg font-bold text-gold-600">{formatCurrency(selected.salePrice)}</p>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-xs text-green-700 font-semibold mb-1">Ganancia por unidad</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(selected.salePrice - selected.costPrice)}</p>
              <p className="text-sm text-green-600 mt-0.5">Margen del {margin(selected)}%</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream-50 p-3 rounded-xl">
                <p className="text-xs text-gray-400">Categoría</p>
                <p className="text-sm font-semibold">{selected.category}</p>
              </div>
              <div className="bg-cream-50 p-3 rounded-xl">
                <p className="text-xs text-gray-400">Stock</p>
                <p className="text-sm font-semibold">{selected.stock} unidades</p>
              </div>
            </div>
            {selected.description && (
              <p className="text-sm text-gray-600">{selected.description}</p>
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

      {/* Google Sheets Sync Modal */}
      <Modal open={sheetsOpen} onClose={() => setSheetsOpen(false)} title="Sincronizar precios">
        <div className="space-y-4">
          <div className="bg-cream-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-dark-800 mb-2">¿Cómo configurar Google Sheets?</p>
            <p>1. Abrí tu Google Sheet con los precios</p>
            <p>2. Formato: <strong>Nombre, Categoría, Costo, Venta, Stock, Descripción</strong></p>
            <p>3. Archivo → Compartir → Publicar en la web → CSV</p>
            <p>4. Pegá la URL del CSV aquí</p>
          </div>
          <div>
            <label className="label">URL del Google Sheet (CSV publicado)</label>
            <input
              className="input text-xs"
              placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
              value={sheetsUrl}
              onChange={e => setSheetsUrl(e.target.value)}
            />
          </div>
          <button
            className="btn-primary w-full"
            disabled={!sheetsUrl || syncing}
            onClick={syncFromSheets}
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar desde Sheets'}
          </button>
          <div className="relative flex items-center">
            <div className="flex-1 h-px bg-cream-200" />
            <span className="px-3 text-xs text-gray-400">o</span>
            <div className="flex-1 h-px bg-cream-200" />
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
            <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Importar CSV desde archivo
            </button>
          </div>
          <button className="btn-ghost w-full flex items-center justify-center gap-2" onClick={exportCSV}>
            <Download size={16} /> Exportar lista de precios
          </button>
          {syncMsg && (
            <p className={`text-xs font-medium text-center ${syncMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
              {syncMsg}
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (selected) dispatch({ type: 'DELETE_PRODUCT', payload: selected.id });
          setDetailOpen(false);
          setSelected(null);
        }}
        title="Eliminar producto"
        message={`¿Eliminar "${selected?.name}"?`}
      />
    </div>
  );
}
