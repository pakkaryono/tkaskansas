import React, { useState } from 'react';
import { X, Copy, Check, Database, Key, Terminal, ExternalLink, ShieldCheck } from 'lucide-react';
import { SUPABASE_PHASE_1_SQL } from '../../lib/supabaseSchema';
import { isSupabaseConfigured } from '../../lib/supabase';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'panduan' | 'sql'>('panduan');

  if (!isOpen) return null;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_PHASE_1_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Panduan Supabase & Schema SQL (Fase 1)</h3>
              <p className="text-xs text-blue-100">Setup PostgreSQL, Autentikasi, dan Row Level Security (RLS)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Status Koneksi Supabase:</span>
            {isSupabaseConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Terkonfigurasi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Mode Demo / Belum Diatur
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('panduan')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                activeTab === 'panduan'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Langkah Setup
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                activeTab === 'sql'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Skrip SQL Lengkap
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700 text-sm space-y-4">
          {activeTab === 'panduan' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                  <strong className="font-semibold block mb-1">Catatan untuk Pengguna Awam:</strong>
                  Aplikasi ini sudah dilengkapi <strong>Akun Demo bawaan</strong> (Admin, Guru, Siswa). Anda bisa langsung mencoba dan melihat seluruh fitur tanpa mendaftar Supabase terlebih dahulu.
                  Jika ingin menghubungkan ke database nyata milik Anda sendiri, ikuti 4 langkah mudah di bawah ini.
                </div>
              </div>

              <ol className="space-y-3">
                <li className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>1. Buat Proyek di Supabase (Gratis)</span>
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      Buka Supabase <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Buka situs <span className="font-semibold text-slate-800">supabase.com</span>, daftar/login, klik tombol <strong>"New Project"</strong>, beri nama misalnya <em>"TKA-SMK"</em>, dan buat password database yang kuat.
                  </p>
                </li>

                <li className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-bold text-slate-800">2. Jalankan Skrip SQL Schema</div>
                  <p className="text-xs text-slate-600 mt-1">
                    Di dashboard Supabase, buka menu <strong>SQL Editor</strong> (ikon terminal di sebelah kiri), buat tab baru, lalu tempel (paste) skrip dari tab <strong>"Skrip SQL Lengkap"</strong> dan klik <strong>Run</strong>.
                  </p>
                  <button
                    onClick={handleCopySQL}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Skrip SQL Berhasil Disalin!' : 'Salin Skrip SQL Sekarang'}
                  </button>
                </li>

                <li className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-600" />
                    <span>3. Ambil URL & Anon Key</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Buka menu <strong>Project Settings → API</strong> di Supabase. Salin nilai <strong>Project URL</strong> dan <strong>anon public API Key</strong>.
                  </p>
                </li>

                <li className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-bold text-slate-800">4. Masukkan ke Variabel Lingkungan</div>
                  <p className="text-xs text-slate-600 mt-1">
                    Atur nilai <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs">VITE_SUPABASE_URL</code> dan <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> pada konfigurasi environment atau file <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs">.env</code>.
                  </p>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Skrip ini membuat tabel <code>profiles</code>, enum role, kebijakan keamanan <code>RLS</code>, dan trigger otomatis saat registrasi:
                </p>
                <button
                  onClick={handleCopySQL}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin!' : 'Salin Semua SQL'}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed select-all">
                  {SUPABASE_PHASE_1_SQL}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
