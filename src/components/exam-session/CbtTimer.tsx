import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, Flame } from 'lucide-react';

interface CbtTimerProps {
  deadlineTime: string; // ISO string from server
  currentServerTime: Date;
  isSimulatedTime?: boolean;
  onTimeUp: () => void;
}

export const CbtTimer: React.FC<CbtTimerProps> = ({
  deadlineTime,
  currentServerTime,
  isSimulatedTime = false,
  onTimeUp,
}) => {
  // Hitung sisa detik berdasarkan waktu server
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const deadlineMs = new Date(deadlineTime).getTime();
    const serverMs = currentServerTime.getTime();
    return Math.max(0, Math.floor((deadlineMs - serverMs) / 1000));
  });

  // Sync saat currentServerTime atau deadlineTime berubah
  useEffect(() => {
    const deadlineMs = new Date(deadlineTime).getTime();
    const serverMs = currentServerTime.getTime();
    const diff = Math.max(0, Math.floor((deadlineMs - serverMs) / 1000));
    setSecondsRemaining(diff);

    if (diff <= 0) {
      onTimeUp();
    }
  }, [deadlineTime, currentServerTime, onTimeUp]);

  // Interval lokal 1 detik untuk smooth ticking jika menggunakan live time
  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, onTimeUp]);

  // Format HH:MM:SS
  const formattedTime = useMemo(() => {
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [secondsRemaining]);

  // Status peringatan waktu:
  // <= 1 menit (60s): Kritis (merah berkedip)
  // <= 5 menit (300s): Warning tinggi (oranye terang)
  // <= 10 menit (600s): Peringatan dini (kuning amber)
  // > 10 menit: Normal (slate/biru)
  const urgencyStyle = useMemo(() => {
    if (secondsRemaining <= 60) {
      return {
        bg: 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-200 border-rose-700',
        text: 'text-white',
        icon: <Flame className="w-4 h-4 text-white animate-bounce" />,
        label: '< 1 Menit!',
      };
    }
    if (secondsRemaining <= 300) {
      return {
        bg: 'bg-amber-500 text-white shadow-sm border-amber-600',
        text: 'text-white',
        icon: <AlertTriangle className="w-4 h-4 text-white" />,
        label: '< 5 Menit',
      };
    }
    if (secondsRemaining <= 600) {
      return {
        bg: 'bg-amber-50 text-amber-900 border-amber-300',
        text: 'text-amber-900',
        icon: <Clock className="w-4 h-4 text-amber-600" />,
        label: '< 10 Menit',
      };
    }
    return {
      bg: 'bg-slate-900 text-white border-slate-800',
      text: 'text-white',
      icon: <Clock className="w-4 h-4 text-blue-400" />,
      label: 'Sisa Waktu',
    };
  }, [secondsRemaining]);

  return (
    <div
      id="cbt-timer-container"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-sm sm:text-base font-bold transition-all select-none ${urgencyStyle.bg}`}
      title={`Batas Akhir: ${new Date(deadlineTime).toLocaleTimeString('id-ID')}`}
    >
      {urgencyStyle.icon}
      <span>{formattedTime}</span>
      {secondsRemaining <= 300 && (
        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/20 hidden sm:inline-block">
          {urgencyStyle.label}
        </span>
      )}
      {isSimulatedTime && (
        <span className="text-[9px] bg-blue-500/40 text-blue-100 px-1 rounded hidden md:inline">
          Server Sync
        </span>
      )}
    </div>
  );
};
