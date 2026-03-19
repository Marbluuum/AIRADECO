import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingBag, Package,
  Truck, Wallet
} from 'lucide-react';

const items = [
  { to: '/',         icon: LayoutDashboard, label: 'Inicio'    },
  { to: '/pedidos',  icon: ShoppingBag,     label: 'Pedidos'   },
  { to: '/clientes', icon: Users,           label: 'Clientes'  },
  { to: '/productos',icon: Package,         label: 'Precios'   },
  { to: '/envios',   icon: Truck,           label: 'Envíos'    },
  { to: '/finanzas', icon: Wallet,          label: 'Finanzas'  },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50 max-w-lg mx-auto">
      <div className="flex items-stretch justify-around">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 px-1 flex-1 transition-colors ${
                isActive
                  ? 'text-gold-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
