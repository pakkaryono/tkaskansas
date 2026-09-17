import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate?: (path: string) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, onNavigate }) => {
  return (
    <nav className="flex items-center text-xs font-medium text-slate-500 mb-4 overflow-x-auto whitespace-nowrap pb-1">
      <button
        onClick={() => onNavigate && onNavigate('/admin/dashboard')}
        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Dashboard</span>
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400 shrink-0" />
            {item.path && !isLast ? (
              <button
                onClick={() => onNavigate && onNavigate(item.path!)}
                className="hover:text-blue-600 transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className={`font-semibold ${isLast ? 'text-slate-800' : ''}`}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
