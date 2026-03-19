import { type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export default function Header({ title, subtitle, right }: HeaderProps) {
  const { profile, signOut } = useAuth();

  return (
    <header className="bg-dark-800 text-white px-4 pt-12 pb-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-gold-400 text-xs font-semibold uppercase tracking-widest mb-0.5">
            AIRA DECO
          </p>
          <h1 className="text-xl font-semibold tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {right && <div>{right}</div>}
          <button
            onClick={signOut}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
      {profile && (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-gray-300">{profile.name}</span>
        </div>
      )}
    </header>
  );
}
