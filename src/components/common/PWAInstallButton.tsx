import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../lib/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Jika sudah diinstal dan berjalan sebagai standalone PWA, sembunyikan
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        type="button"
        onClick={handleInstallClick}
        disabled={installing}
        title="Instal aplikasi TKA ke layar utama HP / Komputer"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-500/20 ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{variant === 'full' ? 'Instal Aplikasi PWA' : 'Instal Aplikasi'}</span>
      </button>
    );
  }

  // iOS Safari flow (WebKit manual add-to-home-screen)
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Petunjuk instalasi TKA di iPhone / iPad"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>Instal di iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Pasang di iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5 p-2.5 bg-blue-50/70 rounded-xl border border-blue-100">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <p>
                    Tekan tombol <strong>Bagikan / Share</strong> (ikon kotak berpanah ke atas) pada bilah alat peramban Safari.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-blue-50/70 rounded-xl border border-blue-100">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <p>
                    Gulir ke bawah pada menu opsi, lalu pilih <strong>&quot;Tambah ke Layar Utama&quot; (Add to Home Screen)</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    Aplikasi TKA SMKN 1 Songgom akan muncul sebagai ikon aplikasi mandiri di layar ponsel Anda!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
