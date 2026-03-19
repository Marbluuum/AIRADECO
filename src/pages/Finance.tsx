import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import type { Expense } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import {
  Wallet, Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const EXPENSE_CATEGORIES = [
  'Logística', 'Marketing', 'Servicios', 'Compra de mercadería',
  'Alquiler', 'Impuestos', 'Sueldos', 'Otros'
];

const emptyForm = (): Omit<Expense, 'id' | 'createdAt'> => ({
  description: '', amount: 0, category: 'Otros',
  date: new Date().toISOString().slice(0, 10),
});

export default function Finance() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'resumen' | 'gastos'>('resumen');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const now = new Date();

  // Parse selected month
  const [selYear, selMonth] = selectedMonth.split('-').map(Number);
  const selStart = startOfMonth(new Date(selYear, selMonth - 1));
  const selEnd   = endOfMonth(new Date(selYear, selMonth - 1));
  const inRange  = (iso: string) => isWithinInterval(new Date(iso), { start: selStart, end: selEnd });

  // Orders this month (not cancelled)
  const monthOrders = useMemo(() =>
    state.orders.filter(o => o.status !== 'cancelado' && inRange(o.createdAt)),
    [state.orders, selectedMonth]
  );

  const revenue  = monthOrders.reduce((s, o) => s + o.total, 0);
  const cogs     = monthOrders.reduce((s, o) => s + o.totalCost, 0);
  const monthExpenses = state.expenses.filter(e => inRange(e.date));
  const expenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = revenue - cogs;
  const netProfit   = grossProfit - expenses;
  const margin      = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const collected   = monthOrders.reduce((s, o) => s + o.amountPaid, 0);
  const pending     = monthOrders.reduce((s, o) => s + (o.total - o.amountPaid), 0);

  // Last 6 months comparison
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d     = subMonths(now, 5 - i);
      const range = { start: startOfMonth(d), end: endOfMonth(d) };
      const ords  = state.orders.filter(o => o.status !== 'cancelado' && isWithinInterval(new Date(o.createdAt), range));
      const rev   = ords.reduce((s, o) => s + o.total, 0);
      const cost  = ords.reduce((s, o) => s + o.totalCost, 0);
      const exp   = state.expenses.filter(e => isWithinInterval(new Date(e.date), range)).reduce((s, e) => s + e.amount, 0);
      return {
        mes: format(d, 'MMM', { locale: es }),
        ingresos: rev,
        ganancia: rev - cost - exp,
        gastos: exp + cost,
      };
    });
  }, [state.orders, state.expenses]);

  // Expenses by category
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setForm({ description: e.description, amount: e.amount, category: e.category, date: e.date });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.description.trim() || form.amount <= 0) return;
    if (editing) {
      dispatch({ type: 'UPDATE_EXPENSE', payload: { ...editing, ...form } });
    } else {
      dispatch({ type: 'ADD_EXPENSE', payload: form });
    }
    setModalOpen(false);
  }

  // Generate month options (last 12)
  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(now, i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }) };
  });

  return (
    <div className="flex flex-col min-h-screen pb-nav">
      <Header
        title="Finanzas"
        subtitle="Ingresos, gastos y rentabilidad"
        right={tab === 'gastos' ? (
          <button className="btn-primary flex items-center gap-1 py-2 px-3 text-xs" onClick={openNew}>
            <Plus size={15} /> Gasto
          </button>
        ) : undefined}
      />

      {/* Month selector */}
      <div className="px-4 pt-4">
        <select
          className="select text-sm font-semibold bg-white"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        >
          {monthOptions.map(m => (
            <option key={m.value} value={m.value}>
              {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Tab bar */}
      <div className="flex mx-4 mt-3 bg-cream-200 rounded-xl p-1 gap-1">
        {(['resumen', 'gastos'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? 'bg-white text-dark-800 shadow-sm' : 'text-gray-400'
            }`}
          >
            {t === 'resumen' ? 'Resumen' : 'Gastos'}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {tab === 'resumen' && (
          <>
            {/* Main P&L */}
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={14} className="text-gold-500" />
                  <span className="text-xs text-gray-400">Ingresos</span>
                </div>
                <p className="text-lg font-bold text-dark-800">{formatCurrency(revenue)}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown size={14} className="text-red-400" />
                  <span className="text-xs text-gray-400">Costo de ventas</span>
                </div>
                <p className="text-lg font-bold text-red-500">{formatCurrency(cogs)}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet size={14} className="text-orange-400" />
                  <span className="text-xs text-gray-400">Gastos operativos</span>
                </div>
                <p className="text-lg font-bold text-orange-500">{formatCurrency(expenses)}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className={netProfit >= 0 ? 'text-green-500' : 'text-red-500'} />
                  <span className="text-xs text-gray-400">Ganancia neta</span>
                </div>
                <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatCurrency(netProfit)}
                </p>
              </div>
            </div>

            {/* Margin */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <p className="section-title">Margen neto del negocio</p>
                <span className={`text-2xl font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-cream-100 rounded-full overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${margin >= 20 ? 'bg-green-500' : margin >= 10 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.max(0, Math.min(100, margin))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* P&L breakdown */}
            <div className="card space-y-2">
              <p className="section-title mb-2">Estado de resultados</p>
              {[
                { label: 'Ingresos totales', value: revenue, color: 'text-dark-800', bold: true },
                { label: '− Costo de mercadería', value: -cogs, color: 'text-red-500' },
                { label: '= Ganancia bruta', value: grossProfit, color: grossProfit >= 0 ? 'text-green-600' : 'text-red-500', bold: true },
                { label: '− Gastos operativos', value: -expenses, color: 'text-orange-500' },
                { label: '= Ganancia neta', value: netProfit, color: netProfit >= 0 ? 'text-green-700' : 'text-red-600', bold: true },
              ].map(row => (
                <div key={row.label} className={`flex justify-between items-center py-1.5 ${row.bold ? 'border-t border-cream-200 pt-2 mt-1' : ''}`}>
                  <span className={`text-sm ${row.bold ? 'font-semibold text-dark-800' : 'text-gray-500'}`}>{row.label}</span>
                  <span className={`text-sm font-bold ${row.color}`}>{formatCurrency(Math.abs(row.value))}</span>
                </div>
              ))}
            </div>

            {/* Cobrado vs pendiente */}
            <div className="card">
              <p className="section-title mb-3">Cobranza</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cobrado</span>
                  <span className="font-semibold text-green-600">{formatCurrency(collected)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pendiente de cobro</span>
                  <span className="font-semibold text-red-500">{formatCurrency(pending)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-cream-100 pt-2">
                  <span>Total facturado</span>
                  <span>{formatCurrency(revenue)}</span>
                </div>
              </div>
              {revenue > 0 && (
                <div className="mt-3 h-2.5 bg-cream-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${(collected / revenue) * 100}%` }} />
                </div>
              )}
            </div>

            {/* 6-month chart */}
            <div className="card">
              <p className="section-title mb-3">Últimos 6 meses</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barSize={12}>
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: unknown) => formatCurrency(Number(v))}
                    contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#B8956A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ganancia" name="Ganancia" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" name="Costos" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {tab === 'gastos' && (
          <>
            {/* Summary */}
            <div className="card bg-red-50 border-red-200">
              <p className="text-xs text-red-600 font-semibold mb-1">Total gastos del mes</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(expenses)}</p>
              <p className="text-xs text-red-400 mt-0.5">{monthExpenses.length} registro{monthExpenses.length !== 1 ? 's' : ''}</p>
            </div>

            {/* By category */}
            {byCategory.length > 0 && (
              <div className="card">
                <p className="section-title mb-3">Por categoría</p>
                {byCategory.map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between items-center py-1.5 border-b border-cream-100 last:border-0">
                    <span className="text-sm text-dark-700">{cat}</span>
                    <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Expense list */}
            {monthExpenses.length === 0 ? (
              <EmptyState icon={Wallet} title="Sin gastos registrados" description="Registrá los gastos del mes" action={{ label: '+ Agregar gasto', onClick: openNew }} />
            ) : (
              <div className="space-y-2">
                {[...monthExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                  <div key={exp.id} className="card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-dark-800 truncate">{exp.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{formatDate(exp.date)}</span>
                        <span className="badge bg-cream-100 text-gray-500">{exp.category}</span>
                      </div>
                    </div>
                    <p className="text-base font-bold text-red-500 flex-shrink-0">{formatCurrency(exp.amount)}</p>
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 hover:bg-cream-100 rounded-lg" onClick={() => openEdit(exp)}>
                        <Pencil size={14} className="text-gray-400" />
                      </button>
                      <button className="p-1.5 hover:bg-red-50 rounded-lg" onClick={() => { setToDelete(exp); setDeleteOpen(true); }}>
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar gasto' : 'Nuevo gasto'}>
        <div className="space-y-4">
          <div>
            <label className="label">Descripción *</label>
            <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ej: Publicidad en Instagram" />
          </div>
          <div>
            <label className="label">Monto $</label>
            <input type="number" min={0} className="input" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <button
            className="btn-primary w-full"
            onClick={handleSave}
            disabled={!form.description.trim() || form.amount <= 0}
          >
            {editing ? 'Guardar cambios' : 'Agregar gasto'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (toDelete) dispatch({ type: 'DELETE_EXPENSE', payload: toDelete.id });
          setToDelete(null);
        }}
        title="Eliminar gasto"
        message={`¿Eliminar "${toDelete?.description}"?`}
      />
    </div>
  );
}
