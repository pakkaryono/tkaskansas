import React from 'react';
import {
  LayoutDashboard,
  User,
  GraduationCap,
  Users,
  BookOpen,
  Building2,
  FolderGit2,
  FileQuestion,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  LogOut,
  X,
  ShieldAlert,
  ChevronRight,
  Database,
  Award,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import type { UserRole } from '../../types';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenGuide: () => void;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  phaseNote?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  mobileOpen,
  onCloseMobile,
  onOpenGuide,
}) => {
  const { profile, role, logout } = useAuth();

  const handleItemClick = (path: string) => {
    onNavigate(path);
    onCloseMobile();
  };

  const getMenuItems = (userRole: UserRole | null): MenuItem[] => {
    if (userRole === 'admin') {
      return [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Profil', path: '/admin/profil', icon: User },
        { name: 'Guru', path: '/admin/guru', icon: Users },
        { name: 'Siswa', path: '/admin/siswa', icon: GraduationCap },
        { name: 'Mata Pelajaran', path: '/admin/mapel', icon: BookOpen },
        { name: 'Kelas', path: '/admin/kelas', icon: Building2 },
        { name: 'Jurusan', path: '/admin/jurusan', icon: FolderGit2 },
        { name: 'Bank Soal', path: '/admin/bank-soal', icon: FileQuestion },
        { name: 'Jadwal & Ujian', path: '/admin/ujian', icon: Calendar },
        { name: 'Laporan Seluruh Siswa', path: '/admin/laporan', icon: BarChart3 },
        { name: 'Penilaian & Regrading', path: '/admin/penilaian', icon: Award },
        { name: 'Import / Export Excel', path: '/admin/import-export', icon: FileSpreadsheet },
        { name: 'Checklist Kesiapan', path: '/admin/checklist', icon: Shield },
        { name: 'Panduan & Docs', path: '/admin/dokumentasi', icon: BookOpen },
      ];
    } else if (userRole === 'guru') {
      return [
        { name: 'Dashboard', path: '/guru/dashboard', icon: LayoutDashboard },
        { name: 'Profil', path: '/guru/profil', icon: User },
        { name: 'Bank Soal', path: '/guru/bank-soal', icon: FileQuestion },
        { name: 'Jadwal & Ujian', path: '/guru/ujian', icon: Calendar },
        { name: 'Laporan Hasil Mapel', path: '/guru/laporan', icon: BarChart3 },
        { name: 'Penilaian & Esai', path: '/guru/penilaian', icon: Award },
        { name: 'Panduan Pengguna', path: '/guru/dokumentasi', icon: BookOpen },
      ];
    } else if (userRole === 'siswa') {
      return [
        { name: 'Dashboard', path: '/siswa/dashboard', icon: LayoutDashboard },
        { name: 'Profil', path: '/siswa/profil', icon: User },
        { name: 'Jadwal & Ujian', path: '/siswa/ujian', icon: Calendar },
        { name: 'Laporan Nilai Siswa', path: '/siswa/laporan', icon: BarChart3 },
        { name: 'Hasil & Lembar Ujian', path: '/siswa/nilai', icon: Award },
        { name: 'Panduan Ujian', path: '/siswa/dokumentasi', icon: BookOpen },
      ];
    }
    return [];
  };

  const menuItems = getMenuItems(role);

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'guru':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'siswa':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Branding */}
        <div className="h-16 sm:h-20 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight">SMKN 1 SONGGOM</span>
              <span className="block text-[11px] font-medium text-slate-400">Portal TKA Akademik</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Card */}
        <div className="p-4 mx-4 mt-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Peran Akun</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wider ${getRoleBadgeColor()}`}
            >
              {role || 'Tamu'}
            </span>
          </div>
          <div className="font-semibold text-slate-800 text-sm truncate" title={profile?.full_name}>
            {profile?.full_name || 'Pengguna'}
          </div>
          <div className="text-xs text-slate-500 truncate" title={profile?.email}>
            {profile?.email}
          </div>
          {role === 'siswa' && profile?.class_name && (
            <div className="mt-2 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium truncate">
              {profile.class_name} • {profile.major_name || 'SMK'}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-4 py-4 overflow-y-auto space-y-1">
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Utama
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            return (
              <button
                key={item.path}
                onClick={() => handleItemClick(item.path)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.phaseNote && !isActive && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                    {item.phaseNote}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Guide Trigger & PWA Install */}
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
            <div className="px-2 pt-1">
              <PWAInstallButton variant="full" className="w-full justify-center" />
            </div>
          </div>
        </div>

        {/* Logout Footer */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
