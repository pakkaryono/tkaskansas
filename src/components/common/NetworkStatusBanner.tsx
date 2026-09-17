import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';

export const NetworkStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnected) {
    return (
      <div
        id="banner-reconnected"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-full text-xs font-semibold shadow-lg shadow-emerald-600/30 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <Wifi className="w-4 h-4 text-emerald-200" />
        <span>Koneksi internet kembali normal. Sinkronisasi data aktif.</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        id="banner-offline"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 bg-amber-600 text-white rounded-full text-xs font-semibold shadow-xl shadow-amber-600/30 animate-bounce"
        role="alert"
      >
        <WifiOff className="w-4 h-4 text-amber-200 shrink-0" />
        <span>Koneksi terputus! Jawaban tersimpan di buffer peramban. Harap tidak me-refresh laman.</span>
      </div>
    );
  }

  return null;
};
