import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-cream-200 rounded-full flex items-center justify-center mb-4">
        <Icon size={28} className="text-gold-500" strokeWidth={1.5} />
      </div>
      <p className="font-semibold text-dark-700 text-base mb-1">{title}</p>
      {description && <p className="text-sm text-gray-400 mb-5">{description}</p>}
      {action && (
        <button className="btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
