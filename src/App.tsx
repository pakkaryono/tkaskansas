import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MasterDataProvider } from './contexts/MasterDataContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { SupabaseStatusBanner } from './components/common/SupabaseStatusBanner';
import { SupabaseGuideModal } from './pages/common/SupabaseGuideModal';
import { LandingPage } from './pages/public/LandingPage';
import { AboutPage } from './pages/public/AboutPage';
import { LoginPage } from './pages/public/LoginPage';
import { NetworkStatusBanner } from './components/common/NetworkStatusBanner';
import { PageFallbackSkeleton } from './components/common/LoadingSkeleton';
import { QuestionBankProvider } from './contexts/QuestionBankContext';
import { ExamProvider } from './contexts/ExamContext';
import { ShieldAlert } from 'lucide-react';

// Lazy Loaded Modules (Code Splitting & Performance Optimization)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const GuruDashboard = lazy(() => import('./pages/guru/GuruDashboard').then((m) => ({ default: m.GuruDashboard })));
const SiswaDashboard = lazy(() => import('./pages/siswa/SiswaDashboard').then((m) => ({ default: m.SiswaDashboard })));
const ProfilePage = lazy(() => import('./pages/common/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const PhasePreviewPage = lazy(() => import('./pages/common/PhasePreviewPage').then((m) => ({ default: m.PhasePreviewPage })));
const DocumentationPage = lazy(() => import('./pages/common/DocumentationPage').then((m) => ({ default: m.DocumentationPage })));
const ProductionChecklistPage = lazy(() => import('./pages/common/ProductionChecklistPage').then((m) => ({ default: m.ProductionChecklistPage })));

const MasterGuruPage = lazy(() => import('./pages/admin/MasterGuruPage').then((m) => ({ default: m.MasterGuruPage })));
const MasterSiswaPage = lazy(() => import('./pages/admin/MasterSiswaPage').then((m) => ({ default: m.MasterSiswaPage })));
const MasterMapelPage = lazy(() => import('./pages/admin/MasterMapelPage').then((m) => ({ default: m.MasterMapelPage })));
const MasterKelasPage = lazy(() => import('./pages/admin/MasterKelasPage').then((m) => ({ default: m.MasterKelasPage })));
const MasterJurusanPage = lazy(() => import('./pages/admin/MasterJurusanPage').then((m) => ({ default: m.MasterJurusanPage })));

const BankSoalAdminPage = lazy(() => import('./pages/admin/BankSoalAdminPage').then((m) => ({ default: m.BankSoalAdminPage })));
const BankSoalGuruPage = lazy(() => import('./pages/guru/BankSoalGuruPage').then((m) => ({ default: m.BankSoalGuruPage })));
const ManajemenUjianAdminPage = lazy(() => import('./pages/admin/ManajemenUjianAdminPage').then((m) => ({ default: m.ManajemenUjianAdminPage })));
const ManajemenUjianGuruPage = lazy(() => import('./pages/guru/ManajemenUjianGuruPage').then((m) => ({ default: m.ManajemenUjianGuruPage })));
const JadwalUjianSiswaPage = lazy(() => import('./pages/siswa/JadwalUjianSiswaPage').then((m) => ({ default: m.JadwalUjianSiswaPage })));
const UjianSiswaPage = lazy(() => import('./pages/siswa/UjianSiswaPage').then((m) => ({ default: m.UjianSiswaPage })));

const PenilaianHasilAdminPage = lazy(() => import('./pages/admin/PenilaianHasilAdminPage').then((m) => ({ default: m.PenilaianHasilAdminPage })));
const PenilaianHasilGuruPage = lazy(() => import('./pages/guru/PenilaianHasilGuruPage').then((m) => ({ default: m.PenilaianHasilGuruPage })));
const HasilNilaiSiswaPage = lazy(() => import('./pages/siswa/HasilNilaiSiswaPage').then((m) => ({ default: m.HasilNilaiSiswaPage })));

const LaporanAdminPage = lazy(() => import('./pages/admin/LaporanAdminPage').then((m) => ({ default: m.LaporanAdminPage })));
const LaporanGuruPage = lazy(() => import('./pages/guru/LaporanGuruPage').then((m) => ({ default: m.LaporanGuruPage })));
const LaporanSiswaPage = lazy(() => import('./pages/siswa/LaporanSiswaPage').then((m) => ({ default: m.LaporanSiswaPage })));
const ImportExportAdminPage = lazy(() => import('./pages/admin/ImportExportAdminPage').then((m) => ({ default: m.ImportExportAdminPage })));

function AppContent() {
  const { user, profile, role, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);
  const [authErrorNotice, setAuthErrorNotice] = useState<string | null>(null);

  // Sync dengan browser history (popstate)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      setAuthErrorNotice(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Route Guard & Role Access Control (RBAC)
  useEffect(() => {
    if (loading) return;

    const isPublicPath = currentPath === '/' || currentPath === '/tentang' || currentPath === '/login' || currentPath === '/panduan';

    // 1. Jika rute private tapi user belum login -> arahkan ke /login
    if (!isPublicPath && !user) {
      navigate('/login');
      return;
    }

    // 2. Jika user sudah login tapi berada di halaman /login, redirect ke dashboard sesuai role
    if (currentPath === '/login' && user && role) {
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'guru') navigate('/guru/dashboard');
      else if (role === 'siswa') navigate('/siswa/dashboard');
      return;
    }

    // 3. Validasi Hak Akses Role (Supabase RLS Enforcer)
    if (user && role) {
      // Siswa tidak boleh akses /admin/* atau /guru/*
      if (role === 'siswa' && (currentPath.startsWith('/admin') || currentPath.startsWith('/guru'))) {
        setAuthErrorNotice('Akses Ditolak: Anda tidak memiliki izin untuk membuka halaman tersebut.');
        navigate('/siswa/dashboard');
        return;
      }

      // Guru tidak boleh akses /admin/*
      if (role === 'guru' && currentPath.startsWith('/admin')) {
        setAuthErrorNotice('Akses Ditolak: Halaman ini hanya diperuntukkan bagi Administrator Sekolah.');
        navigate('/guru/dashboard');
        return;
      }
    }
  }, [currentPath, user, role, loading]);

  // Loading state awal
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-300">Memuat Sesi TKA SMKN 1 Songgom...</p>
      </div>
    );
  }

  const isPublicRoute = currentPath === '/' || currentPath === '/tentang' || currentPath === '/login' || currentPath === '/panduan';

  // Render halaman publik
  if (isPublicRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <NetworkStatusBanner />
        <SupabaseStatusBanner onOpenGuide={() => setGuideModalOpen(true)} />
        <Navbar
          currentPath={currentPath}
          onNavigate={navigate}
          onOpenGuide={() => setGuideModalOpen(true)}
        />
        <main className="flex-1">
          {currentPath === '/' && (
            <LandingPage onNavigate={navigate} onOpenGuide={() => setGuideModalOpen(true)} />
          )}
          {currentPath === '/tentang' && (
            <AboutPage onNavigate={navigate} onOpenGuide={() => setGuideModalOpen(true)} />
          )}
          {currentPath === '/login' && (
            <LoginPage onNavigate={navigate} onOpenGuide={() => setGuideModalOpen(true)} />
          )}
          {currentPath === '/panduan' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <Suspense fallback={<PageFallbackSkeleton />}>
                <DocumentationPage />
              </Suspense>
            </div>
          )}
        </main>
        <SupabaseGuideModal
          isOpen={guideModalOpen}
          onClose={() => setGuideModalOpen(false)}
        />
      </div>
    );
  }

  // Render ruang ujian CBT siswa (Distraction-Free Secure CBT Room)
  if (currentPath.startsWith('/ujian/')) {
    const examId = currentPath.replace('/ujian/', '').split('?')[0];
    return (
      <div className="min-h-screen flex flex-col bg-slate-100">
        <NetworkStatusBanner />
        <Suspense fallback={<PageFallbackSkeleton />}>
          <UjianSiswaPage examId={examId} onNavigate={navigate} />
        </Suspense>
      </div>
    );
  }

  // Render halaman terautentikasi (Dashboard Admin, Guru, Siswa)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NetworkStatusBanner />
      <SupabaseStatusBanner onOpenGuide={() => setGuideModalOpen(true)} />

      <div className="flex-1 flex flex-row">
        {/* Sidebar Navigasi */}
        <Sidebar
          currentPath={currentPath}
          onNavigate={navigate}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onOpenGuide={() => setGuideModalOpen(true)}
        />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
          <Header
            onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            onOpenGuide={() => setGuideModalOpen(true)}
            currentPath={currentPath}
            onNavigate={navigate}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {authErrorNotice && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-3 animate-shake">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="font-medium">{authErrorNotice}</span>
              </div>
            )}

            {/* Router Halaman Authenticated dengan Suspense Code Splitting */}
            <Suspense fallback={<PageFallbackSkeleton />}>
              {currentPath === '/admin/dashboard' && (
                <AdminDashboard onNavigate={navigate} onOpenGuide={() => setGuideModalOpen(true)} />
              )}
              {currentPath === '/guru/dashboard' && (
                <GuruDashboard onNavigate={navigate} onOpenGuide={() => setGuideModalOpen(true)} />
              )}
              {currentPath === '/siswa/dashboard' && (
                <SiswaDashboard onNavigate={navigate} onOpenGuide={() => setGuideModalOpen(true)} />
              )}
              {(currentPath === '/admin/profil' || currentPath === '/guru/profil' || currentPath === '/siswa/profil') && (
                <ProfilePage />
              )}

              {/* Fase 2: Master Data Management Routes */}
              {currentPath === '/admin/guru' && (
                <MasterGuruPage onNavigate={navigate} />
              )}
              {currentPath === '/admin/siswa' && (
                <MasterSiswaPage onNavigate={navigate} />
              )}
              {currentPath === '/admin/mapel' && (
                <MasterMapelPage onNavigate={navigate} />
              )}
              {currentPath === '/admin/kelas' && (
                <MasterKelasPage onNavigate={navigate} />
              )}
              {currentPath === '/admin/jurusan' && (
                <MasterJurusanPage onNavigate={navigate} />
              )}

              {/* Fase 3: Bank Soal Routes */}
              {currentPath === '/admin/bank-soal' && (
                <BankSoalAdminPage />
              )}
              {currentPath === '/guru/bank-soal' && (
                <BankSoalGuruPage />
              )}

              {/* Fase 4: Manajemen Ujian & Jadwal (CBT) Routes */}
              {currentPath === '/admin/ujian' && (
                <ManajemenUjianAdminPage />
              )}
              {currentPath === '/guru/ujian' && (
                <ManajemenUjianGuruPage />
              )}
              {(currentPath === '/siswa/ujian' || currentPath === '/siswa/bank-soal') && (
                <JadwalUjianSiswaPage onNavigate={navigate} />
              )}

              {/* Fase 6: Sistem Penilaian & Regrading */}
              {currentPath === '/admin/penilaian' && (
                <PenilaianHasilAdminPage />
              )}
              {currentPath === '/guru/penilaian' && (
                <PenilaianHasilGuruPage />
              )}
              {currentPath === '/siswa/nilai' && (
                <HasilNilaiSiswaPage />
              )}

              {/* Fase 7: Sistem Laporan & Statistik */}
              {currentPath === '/admin/laporan' && (
                <LaporanAdminPage />
              )}
              {currentPath === '/guru/laporan' && (
                <LaporanGuruPage />
              )}
              {currentPath === '/siswa/laporan' && (
                <LaporanSiswaPage />
              )}

              {/* Fase 8: Sistem Import & Export Excel */}
              {currentPath === '/admin/import-export' && (
                <ImportExportAdminPage onNavigate={navigate} />
              )}

              {/* Fase 10: Production Readiness Checklist & Dokumentasi */}
              {currentPath === '/admin/checklist' && (
                <ProductionChecklistPage onNavigate={navigate} />
              )}
              {(currentPath === '/admin/dokumentasi' ||
                currentPath === '/guru/dokumentasi' ||
                currentPath === '/siswa/dokumentasi') && (
                <DocumentationPage />
              )}

              {/* Menu Navigasi Sub-Modul (Fase Roadmap) */}
              {currentPath !== '/admin/dashboard' &&
                currentPath !== '/guru/dashboard' &&
                currentPath !== '/siswa/dashboard' &&
                currentPath !== '/admin/guru' &&
                currentPath !== '/admin/siswa' &&
                currentPath !== '/admin/mapel' &&
                currentPath !== '/admin/kelas' &&
                currentPath !== '/admin/jurusan' &&
                currentPath !== '/admin/bank-soal' &&
                currentPath !== '/guru/bank-soal' &&
                currentPath !== '/admin/ujian' &&
                currentPath !== '/guru/ujian' &&
                currentPath !== '/siswa/ujian' &&
                currentPath !== '/siswa/bank-soal' &&
                currentPath !== '/admin/penilaian' &&
                currentPath !== '/admin/laporan' &&
                currentPath !== '/admin/import-export' &&
                currentPath !== '/admin/checklist' &&
                !currentPath.endsWith('/dokumentasi') &&
                currentPath !== '/guru/penilaian' &&
                currentPath !== '/guru/laporan' &&
                currentPath !== '/siswa/nilai' &&
                currentPath !== '/siswa/laporan' &&
                !currentPath.endsWith('/profil') && (
                  <PhasePreviewPage
                    path={currentPath}
                    onNavigate={navigate}
                    onOpenGuide={() => setGuideModalOpen(true)}
                  />
                )}
            </Suspense>
          </main>
        </div>
      </div>

      <SupabaseGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MasterDataProvider>
        <QuestionBankProvider>
          <ExamProvider>
            <AppContent />
          </ExamProvider>
        </QuestionBankProvider>
      </MasterDataProvider>
    </AuthProvider>
  );
}

