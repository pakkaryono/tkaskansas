import React, { useState } from 'react';
import { GraduationCap, Menu, X, LogIn, ArrowRight, HelpCircle, Database, Shield, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate, onOpenGuide }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, role } = useAuth();

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  const getDashboardPath = () => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'guru') return '/guru/dashboard';
    if (role === 'siswa') return '/siswa/dashboard';
    return '/login';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Branding */}
          <div
            onClick={() => handleNav('/')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">TKA</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 tracking-wide uppercase">
                  SMKN 1 SONGGOM
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Tes Kemampuan Akademik • SMKN 1 Songgom</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => handleNav('/')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPath === '/'
                  ? 'text-blue-700 bg-blue-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Beranda
            </button>
            <button
              onClick={() => handleNav('/tentang')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPath === '/tentang'
                  ? 'text-blue-700 bg-blue-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Tentang TKA
            </button>
            <button
              onClick={() => handleNav('/panduan')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPath === '/panduan'
                  ? 'text-blue-700 bg-blue-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Panduan & Docs</span>
              </span>
            </button>
            {user && profile?.role === 'admin' && (
              <button
                onClick={onOpenGuide}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              >
                <Database className="w-4 h-4 text-blue-600" />
                <span>SQL Schema</span>
              </button>
            )}
          </nav>

          {/* CTA Button, PWA Install & Auth State */}
          <div className="hidden md:flex items-center gap-3">
            <PWAInstallButton />

            {user && profile ? (
              <button
                onClick={() => handleNav(getDashboardPath())}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all hover:shadow"
              >
                <span>Dashboard ({profile.role.toUpperCase()})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleNav('/login')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk / Login</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <PWAInstallButton variant="compact" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-lg">
          <button
            onClick={() => handleNav('/')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
              currentPath === '/' ? 'text-blue-700 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Beranda
          </button>
          <button
            onClick={() => handleNav('/tentang')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
              currentPath === '/tentang' ? 'text-blue-700 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Tentang TKA
          </button>
          <button
            onClick={() => handleNav('/panduan')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
              currentPath === '/panduan' ? 'text-blue-700 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Panduan & Dokumentasi
          </button>
          {user && profile?.role === 'admin' && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenGuide();
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <Database className="w-4 h-4 text-blue-600" />
              <span>Panduan & Schema SQL Supabase</span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-100">
            {user && profile ? (
              <button
                onClick={() => handleNav(getDashboardPath())}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white"
              >
                <span>Ke Dashboard ({profile.role.toUpperCase()})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleNav('/login')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk / Login</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

