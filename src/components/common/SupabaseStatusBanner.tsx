import React, { useState } from 'react';
import { X } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

interface SupabaseStatusBannerProps {
  onOpenGuide?: () => void;
}

export const SupabaseStatusBanner: React.FC<SupabaseStatusBannerProps> = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-slate-900 text-white text-xs px-4 py-2 flex items-center justify-between border-b border-slate-800 transition-all">
      <div className="flex items-center gap-2.5 overflow-hidden">
        {isSupabaseConfigured ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="truncate">
              <strong className="text-emerald-300 font-medium">Supabase Terhubung:</strong> Menggunakan database PostgreSQL & Supabase Auth aktif.
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse"></span>
            <span className="truncate">
              <strong className="text-amber-300 font-medium">Status Database:</strong> Menunggu koneksi Supabase.
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          title="Sembunyikan pesan"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
