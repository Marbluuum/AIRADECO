import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/layout/Header';
import { formatCurrency } from '../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, ShoppingBag, Users, DollarSign, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const CHANNEL_COLORS = ['#B8956A','#C4A882','#D4BC9A','#E0D9CE','#8A6340','#A07850','#6b7280'];
const SELLER_COLORS  = ['#B8956A','#1A1A1A'];

export default function Dashboard() {
  const { state } = useApp();
  const { orders, clients, products, expenses } = state;

  const now = new Date();
  const currentMonth = { start: startOfMonth(now), end: endOfMonth(now) };
  const lastMonth    = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };

  const ordersThisMonth = useMemo(() =>
    orders.filter(o => isWithinInterval(new Date(o.createdAt), currentMonth) && o.status !== 'cancelado'),
    [orders]
  );
  const ordersLastMonth = useMemo(() =>
    orders.filter(o => isWithinInterval(new Date(o.createdAt), lastMonth) && o.status !== 'cancelado'),
    [orders]
  );

  const revenueThisMonth = ordersThisMonth.reduce((s, o) => s + o.total, 0);
  const revenueLastMonth = ordersLastMonth.reduce((s, o) => s + o.total, 0);

  const costThisMonth    = ordersThisMonth.reduce((s, o) => s + o.totalCost, 0);
  const expensesThisMonth = expenses
    .filter(e => isWithinInterval(new Date(e.date), currentMonth))
    .reduce((s, e) => s + e.amount, 0);
  const grossProfit      = revenueThisMonth - costThisMonth - expensesThisMonth;
  const margin           = revenueThisMonth > 0 ? (grossProfit / revenueThisMonth) * 100 : 0;

  const revenueChange    = revenueLastMonth > 0
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(0)
    : null;

  // Sales by channel
  const byChannel = useMemo(() => {
    const map: Record<string, number> = {};
    ordersThisMonth.forEach(o => {
      map[o.channel] = (map[o.channel] || 0) + o.total;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [ordersThisMonth]);

  // Sales by seller
  const bySeller = useMemo(() => {
    const map: Record<string, number> = {};
    ordersThisMonth.forEach(o => {
      map[o.seller] = (map[o.seller] || 0) + o.total;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [ordersThisMonth]);

  // Last 6 months revenue
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d     = subMonths(now, 5 - i);
      const range = { start: startOfMonth(d), end: endOfMonth(d) };
      const rev   = orders
        .filter(o => o.status !== 'cancelado' && isWithinInterval(new Date(o.createdAt), range))
        .reduce((s, o) => s + o.total, 0);
      return { mes: format(d, 'MMM', { locale: es }), ingresos: rev };
    });
  }, [orders]);

  // Pending orders
  const pending = orders.filter(o => ['pendiente', 'en_proceso', 'listo_para_envio'].includes(o.status));
  // Unpaid
  const unpaid  = orders.filter(o => o.paymentStatus !== 'pagado' && o.status !== 'cancelado');

  const statCards = [
    {
      icon: DollarSign,
      label: 'Ingresos del mes',
      value: formatCurrency(revenueThisMonth),
      sub: revenueChange !== null
        ? `${Number(revenueChange) >= 0 ? '+' : ''}${revenueChange}% vs mes anterior`
        : 'Primer mes',
      positive: Number(revenueChange) >= 0,
    },
    {
      icon: TrendingUp,
      label: 'Ganancia neta',
      value: formatCurrency(grossProfit),
      sub: `Margen ${margin.toFixed(0)}%`,
      positive: grossProfit >= 0,
    },
    {
      icon: ShoppingBag,
      label: 'Pedidos del mes',
      value: String(ordersThisMonth.length),
      sub: `${pending.length} en curso`,
      positive: true,
    },
    {
      icon: Users,
      label: 'Clientes',
      value: String(clients.length),
      sub: `${unpaid.length} con saldo pendiente`,
      positive: unpaid.length === 0,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-cream-100 pb-nav">
      <Header
        title={`${format(now, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())}`}
        subtitle="Resumen del negocio"
      />

      <div className="px-4 py-4 space-y-4">
        {/* Stat cards 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(({ icon: Icon, label, value, sub, positive }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium">{label}</span>
                <div className="w-7 h-7 bg-cream-100 rounded-full flex items-center justify-center">
                  <Icon size={14} className="text-gold-500" />
                </div>
              </div>
              <p className="text-lg font-bold text-dark-800 leading-tight">{value}</p>
              <p className={`text-xs mt-0.5 ${positive ? 'text-green-600' : 'text-red-500'}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {pending.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 flex items-start gap-3">
            <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">
              Hay <strong>{pending.length}</strong> pedido{pending.length > 1 ? 's' : ''} sin entregar.
            </p>
          </div>
        )}

        {/* Revenue chart */}
        <div className="card">
          <p className="section-title mb-3">Ingresos últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} barSize={28}>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: unknown) => [formatCurrency(Number(v)), 'Ingresos']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Bar dataKey="ingresos" fill="#B8956A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By channel */}
        {byChannel.length > 0 && (
          <div className="card">
            <p className="section-title mb-3">Ventas por canal</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={byChannel}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={70}
                  label={false}
                  labelLine={false}
                  fontSize={10}
                >
                  {byChannel.map((_, i) => (
                    <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {byChannel.map((ch, i) => (
                <div key={ch.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
                    <span className="text-dark-700">{ch.name}</span>
                  </div>
                  <span className="font-semibold text-dark-800">{formatCurrency(ch.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By seller */}
        {bySeller.length > 0 && (
          <div className="card">
            <p className="section-title mb-3">Ventas por vendedora</p>
            <div className="space-y-3">
              {bySeller.map(({ name, value }, i) => {
                const pct = revenueThisMonth > 0 ? (value / revenueThisMonth) * 100 : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-dark-700 font-medium">{name}</span>
                      <span className="font-semibold">{formatCurrency(value)}</span>
                    </div>
                    <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: SELLER_COLORS[i % SELLER_COLORS.length] }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(0)}% del total</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick stats bottom */}
        <div className="card flex items-center justify-around text-center">
          <div>
            <p className="text-lg font-bold text-dark-800">{products.length}</p>
            <p className="text-xs text-gray-400">Productos</p>
          </div>
          <div className="w-px h-8 bg-cream-200" />
          <div>
            <p className="text-lg font-bold text-dark-800">{orders.filter(o => o.status === 'entregado').length}</p>
            <p className="text-xs text-gray-400">Entregados</p>
          </div>
          <div className="w-px h-8 bg-cream-200" />
          <div>
            <p className="text-lg font-bold text-dark-800">{formatCurrency(expensesThisMonth)}</p>
            <p className="text-xs text-gray-400">Gastos mes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
