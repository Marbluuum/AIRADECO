import { type ReactNode } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export default function Header({ title, subtitle, right }: HeaderProps) {
  return (
    <header className="bg-dark-800 text-white px-4 pt-12 pb-4 flex items-end justify-between">
      <div>
        <p className="text-gold-400 text-xs font-semibold uppercase tracking-widest mb-0.5">
          AIRA DECO
        </p>
        <h1 className="text-xl font-semibold tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
