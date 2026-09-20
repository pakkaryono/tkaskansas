import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  FolderGit2,
  FileQuestion,
  HelpCircle,
  ShieldCheck,
  Play,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  KeyRound,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useQuestionBank } from '../../contexts/QuestionBankContext';
import { ImportWizardModal } from '../../components/importExport/ImportWizardModal';
import { QuestionTemplateGuideModal } from '../../components/importExport/QuestionTemplateGuideModal';
import { ExcelImportTestSuite } from '../../components/importExport/ExcelImportTestSuite';
import {
  exportEntityToExcel,
  downloadTemplateExcel,
  getTemplateColumns,
  ImportEntityType,
} from '../../lib/excelEngine';

interface ImportExportAdminPageProps {
  onNavigate?: (path: string) => void;
}

export const ImportExportAdminPage: React.FC<ImportExportAdminPageProps> = ({ onNavigate }) => {
  const masterData = useMasterData();
  const questionBank = useQuestionBank();

  const [activeTab, setActiveTab] = useState<'hub' | 'templates' | 'test_suite'>('hub');
  const [selectedEntityForImport, setSelectedEntityForImport] = useState<ImportEntityType | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string;
  } | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSyncAllAccounts = async () => {
    setIsSyncing(true);
    setSyncStatus({
      type: 'info',
      message: 'Sedang menyinkronkan seluruh akun siswa, guru, dan admin ke Supabase Auth...',
    });

    try {
      const res = await masterData.syncAllLoginAccounts();
      if (res.success) {
        setSyncStatus({
          type: 'success',
          message: `Berhasil! Total ${res.total_fixed} akun login telah diperbarui & aktif untuk login.`,
          details: `Rincian: ${res.students_synced} Siswa, ${res.teachers_synced} Guru, dan ${res.profiles_synced} Profil Sinkron.`,
        });
        triggerToast('Sinkronisasi akun login Supabase Auth berhasil');
      } else {
        setSyncStatus({
          type: 'error',
          message: res.message,
          details: 'Jalankan file script add_admin_user_functions.sql di Supabase SQL Editor untuk mengaktifkan fungsi sinkronisasi otomatis.',
        });
      }
    } catch (e: any) {
      setSyncStatus({
        type: 'error',
        message: `Gagal sinkronisasi: ${e.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const entitiesConfig: Array<{
    type: ImportEntityType;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
    color: string;
    bgColor: string;
    borderColor: string;
    path: string;
  }> = [
    {
      type: 'siswa',
      title: 'Data Siswa',
      description: 'Import & Export data peserta didik, NIS/NISN, penempatan kelas, dan jurusan.',
      icon: GraduationCap,
      count: masterData.students.length,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      path: '/admin/siswa',
    },
    {
      type: 'guru',
      title: 'Data Guru',
      description: 'Import & Export tenaga pendidik, NIP, email dinas, dan pengampu mapel.',
      icon: Users,
      count: masterData.teachers.length,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      path: '/admin/guru',
    },
    {
      type: 'admin',
      title: 'Data Administrator',
      description: 'Import & Export akun administrator/operator sekolah, NIP, email, dan hak akses login.',
      icon: ShieldCheck,
      count: 1,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      path: '/admin',
    },
    {
      type: 'mapel',
      title: 'Mata Pelajaran',
      description: 'Import & Export kurikulum mapel umum & kejuruan SMKN 1 Songgom.',
      icon: BookOpen,
      count: masterData.subjects.length,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      path: '/admin/mapel',
    },
    {
      type: 'kelas',
      title: 'Rombongan Belajar (Kelas)',
      description: 'Import & Export rombel tingkat X, XI, dan XII per konsentrasi keahlian.',
      icon: Building2,
      count: masterData.classes.length,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      path: '/admin/kelas',
    },
    {
      type: 'jurusan',
      title: 'Konsentrasi Keahlian (Jurusan)',
      description: 'Import & Export program kejuruan TJKT, TBSM, DKV, TO, dan lainnya.',
      icon: FolderGit2,
      count: masterData.majors.length,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      path: '/admin/jurusan',
    },
    {
      type: 'bank_soal',
      title: 'Bank Soal TKA',
      description: 'Import butir soal PG Biasa, PG Kompleks, Esai, dan Menjodohkan.',
      icon: FileQuestion,
      count: questionBank.questions.length,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      path: '/admin/bank-soal',
    },
  ];

  const handleExport = (type: ImportEntityType) => {
    try {
      if (type === 'siswa') {
        exportEntityToExcel('siswa', masterData.students, {
          classes: masterData.classes,
          majors: masterData.majors,
        });
      } else if (type === 'guru') {
        exportEntityToExcel('guru', masterData.teachers);
      } else if (type === 'admin') {
        exportEntityToExcel('admin', [
          {
            nip: '197505101999031001',
            full_name: 'Administrator CBT Utama',
            email: 'admin.cbt@smkn1songgom.sch.id',
            phone_number: '081234567890',
            password: 'AdminSuper123!',
            status: 'active',
          },
        ]);
      } else if (type === 'mapel') {
        exportEntityToExcel('mapel', masterData.subjects, {
          majors: masterData.majors,
          teachers: masterData.teachers,
        });
      } else if (type === 'kelas') {
        exportEntityToExcel('kelas', masterData.classes, {
          majors: masterData.majors,
        });
      } else if (type === 'jurusan') {
        exportEntityToExcel('jurusan', masterData.majors);
      } else if (type === 'bank_soal') {
        exportEntityToExcel('bank_soal', questionBank.questions, {
          subjects: masterData.subjects,
          teachers: masterData.teachers,
        });
      }
      triggerToast(`Berhasil mengekspor data ${type} ke format Excel (.xlsx)`);
    } catch (err: any) {
      triggerToast(`Gagal mengekspor: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Fase 8: Import & Export Excel (.xlsx)
            </span>
            <span className="text-xs text-slate-400 font-medium">•</span>
            <span className="text-xs text-slate-500 font-medium">SMKN 1 Songgom CBT</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            <span>Pusat Integrasi Import & Export Excel</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Sistem pengolahan data masal berbasis Excel murni (.xlsx) dengan validasi cerdas pra-impor,
            deteksi duplikasi NIS/Email, keamanan Foreign Key, serta isolasi baris rusak (Zero Data Corruption).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>Format Bank Soal</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('hub')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'hub'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Kelola Master & Soal</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Katalog Template Resmi (.xlsx)</span>
        </button>

        <button
          onClick={() => setActiveTab('test_suite')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'test_suite'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <span>Suite Uji Validasi Mesin Excel (10 Test Cases)</span>
        </button>
      </div>

      {/* TAB 1: HUB */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          {/* Supabase Auth Auto-Fix & Synchronize Banner */}
          <div className="bg-white rounded-2xl border border-blue-200/90 shadow-xs p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Sinkronisasi Akun Login Supabase Auth</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Siswa, Guru & Admin
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Jika data hasil upload Excel atau penambahan sebelumnya sudah tersimpan di database namun belum bisa digunakan untuk login, jalankan sinkronisasi ini untuk mendaftarkan akun ke sistem autentikasi Supabase beserta kata sandi default (Siswa: <em>Siswa123!</em>, Guru: <em>Guru123!</em>, Admin: <em>Admin123!</em>).
                </p>
                {syncStatus && (
                  <div className={`mt-2.5 p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                    syncStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : syncStatus.type === 'error'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                    {syncStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : syncStatus.type === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold">{syncStatus.message}</div>
                      {syncStatus.details && <div className="text-[11px] opacity-90 mt-0.5">{syncStatus.details}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSyncAllAccounts}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Akun Login'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {entitiesConfig.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.type}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-11 h-11 rounded-xl ${item.bgColor} ${item.color} flex items-center justify-center font-bold`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        {item.count} Data
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedEntityForImport(item.type)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Import</span>
                      </button>
                      <button
                        onClick={() => handleExport(item.type)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Export</span>
                      </button>
                    </div>
                    <button
                      onClick={() => downloadTemplateExcel(item.type)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      <span>Unduh Template Excel Kosong</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Workflow Guide */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Standar Alur Kerja 6 Tahap Import Excel SMKN 1 Songgom</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-4 text-center">
              <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 block">TAHAP 1</span>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">Pilih File</p>
                <p className="text-[10px] text-slate-400 mt-1">Format .xlsx murni</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 block">TAHAP 2</span>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">Baca Excel</p>
                <p className="text-[10px] text-slate-400 mt-1">Parsing buffer xlsx</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 block">TAHAP 3</span>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">Preview</p>
                <p className="text-[10px] text-slate-400 mt-1">Periksa tabel data</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 block">TAHAP 4</span>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">Validasi</p>
                <p className="text-[10px] text-slate-400 mt-1">Deteksi baris/kolom</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 block">TAHAP 5</span>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">Konfirmasi</p>
                <p className="text-[10px] text-slate-400 mt-1">Hanya baris valid</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 block">TAHAP 6</span>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">Ringkasan</p>
                <p className="text-[10px] text-slate-400 mt-1">Hasil & log impor</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <span>Daftar Template Resmi Excel (.xlsx)</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Unduh template dengan header baku yang telah disesuaikan dengan skema tabel database CBT SMKN 1 Songgom.
            </p>

            <div className="space-y-4">
              {(['siswa', 'guru', 'admin', 'mapel', 'kelas', 'jurusan', 'bank_soal'] as ImportEntityType[]).map((type) => {
                const cols = getTemplateColumns(type);
                return (
                  <div
                    key={type}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 uppercase">{type.replace('_', ' ')}</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Template_{type}.xlsx
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {cols.map((col) => (
                          <span
                            key={col}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-white text-slate-700 border border-slate-200"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => downloadTemplateExcel(type)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold shrink-0 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Unduh File .xlsx</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEST SUITE */}
      {activeTab === 'test_suite' && (
        <div>
          <ExcelImportTestSuite />
        </div>
      )}

      {/* Import Wizard Modal */}
      {selectedEntityForImport && (
        <ImportWizardModal
          isOpen={!!selectedEntityForImport}
          onClose={() => setSelectedEntityForImport(null)}
          initialEntityType={selectedEntityForImport}
          onSuccess={(summary) => {
            triggerToast(`Proses impor selesai. Berhasil: ${summary.successCount}, Gagal: ${summary.failedCount}`);
          }}
        />
      )}

      {/* Question Template Guide Modal */}
      <QuestionTemplateGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};
