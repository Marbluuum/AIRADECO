import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl max-h-[92svh] flex flex-col slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-cream-300 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-cream-200">
          <h2 className="font-semibold text-dark-800 text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-cream-100 transition-colors">
            <X size={18} className="text-dark-600" />
          </button>
        </div>
        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
