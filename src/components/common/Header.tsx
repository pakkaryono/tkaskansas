import React from 'react';
import { Menu, Database, Shield, GraduationCap, Users, User, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import type { UserRole } from '../../types';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenGuide: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onOpenGuide,
  currentPath,
  onNavigate,
}) => {
  const { profile, role, logout, loginAsDemo, isDemoMode } = useAuth();

  const getPageTitle = () => {
    if (currentPath.includes('/dashboard')) return 'Dashboard';
    if (currentPath.includes('/profil')) return 'Profil Pengguna';
    if (currentPath.includes('/guru')) return 'Kelola Data Guru';
    if (currentPath.includes('/siswa')) return 'Kelola Data Siswa';
    if (currentPath.includes('/mapel')) return 'Mata Pelajaran';
    if (currentPath.includes('/kelas')) return 'Daftar Kelas';
    if (currentPath.includes('/jurusan')) return 'Jurusan SMK';
    if (currentPath.includes('/bank-soal')) return 'Bank Soal TKA';
    if (currentPath.includes('/laporan')) return 'Laporan Hasil Ujian';
    if (currentPath.includes('/import-export')) return 'Import & Export Excel';
    if (currentPath.includes('/checklist')) return 'Checklist Kesiapan Produksi (FASE 10)';
    if (currentPath.includes('/dokumentasi') || currentPath.includes('/panduan')) return 'Pusat Panduan & Dokumentasi';
    return 'Portal TKA SMKN 1 SONGGOM';
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    loginAsDemo(newRole);
    if (newRole === 'admin') onNavigate('/admin/dashboard');
    if (newRole === 'guru') onNavigate('/guru/dashboard');
    if (newRole === 'siswa') onNavigate('/siswa/dashboard');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 h-16 sm:h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900">{getPageTitle()}</h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            Tahun Ajaran 2026/2027 • SMKN 1 Songgom
          </p>
        </div>
      </div>

      {/* Right: Quick Switcher, SQL Guide & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* PWA Install Button */}
        <PWAInstallButton variant="compact" className="hidden sm:inline-flex" />

        {/* Role Switcher Pill (sangat berguna bagi penguji untuk beralih peran dengan 1 klik) */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200">
          <span className="px-2 py-1 text-[11px] text-slate-400">Ganti Peran:</span>
          <button
            onClick={() => handleRoleSwitch('admin')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              role === 'admin' ? 'bg-purple-600 text-white shadow-xs' : 'hover:text-purple-700'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleRoleSwitch('guru')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              role === 'guru' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-emerald-700'
            }`}
          >
            Guru
          </button>
          <button
            onClick={() => handleRoleSwitch('siswa')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              role === 'siswa' ? 'bg-blue-600 text-white shadow-xs' : 'hover:text-blue-700'
            }`}
          >
            Siswa
          </button>
        </div>

        {/* Supabase Guide Button */}
        <button
          onClick={onOpenGuide}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-xs transition-colors"
          title="Lihat Skrip SQL & Status Supabase"
        >
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">SQL Schema</span>
        </button>

        {/* User Avatar & Name */}
        <button
          onClick={() => {
            if (role === 'admin') onNavigate('/admin/profil');
            else if (role === 'guru') onNavigate('/guru/profil');
            else if (role === 'siswa') onNavigate('/siswa/profil');
          }}
          className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="text-left hidden xl:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
              {profile?.full_name?.split(' ')[0]}
            </div>
            <div className="text-[10px] text-slate-500 capitalize">{role}</div>
          </div>
        </button>
      </div>
    </header>
  );
};
