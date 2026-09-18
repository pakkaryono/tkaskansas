import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  FolderGit2,
  FileQuestion,
  BarChart3,
  FileSpreadsheet,
  ArrowLeft,
  Calendar,
  Layers,
  Database,
  Search,
  Filter,
  Plus,
  Inbox,
  Info,
  RefreshCw,
  Clock,
  Award
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface PhasePreviewPageProps {
  path: string;
  onNavigate: (path: string) => void;
  onOpenGuide?: () => void;
}

interface ModuleInfo {
  title: string;
  category: string;
  icon: React.ElementType;
  color: string;
  tableHeaders: string[];
  sampleDefaultColumns: string;
}

export const PhasePreviewPage: React.FC<PhasePreviewPageProps> = ({ path, onNavigate, onOpenGuide }) => {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const getModuleInfo = (): ModuleInfo => {
    if (path.includes('/guru')) {
      return {
        title: 'Data Guru & Tenaga Pendidik',
        category: 'Master Data Akademik',
        icon: Users,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        tableHeaders: ['No', 'Nama Lengkap Guru', 'NIP / NUPTK', 'Email Resmi', 'Mata Pelajaran Diampu', 'Status'],
        sampleDefaultColumns: 'Struktur: ID (UUID), Full Name, NIP, Email, Subjects (Array), Status (Aktif/Nonaktif)',
      };
    }
    if (path.includes('/siswa')) {
      return {
        title: 'Data Siswa & Rombel',
        category: 'Master Data Akademik',
        icon: GraduationCap,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        tableHeaders: ['No', 'Nama Siswa', 'NIS', 'NISN', 'Kelas / Rombel', 'Jurusan', 'Status'],
        sampleDefaultColumns: 'Struktur: ID (UUID), Full Name, NIS, NISN, Class ID, Major ID, Status',
      };
    }
    if (path.includes('/mapel')) {
      return {
        title: 'Mata Pelajaran Kurikulum',
        category: 'Kurikulum & Pembelajaran',
        icon: BookOpen,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        tableHeaders: ['No', 'Kode Mapel', 'Nama Mata Pelajaran', 'Kelompok Kurikulum', 'KKM Standar', 'Aksi'],
        sampleDefaultColumns: 'Struktur: ID, Code, Name, Category (Umum/Produktif), Passing Grade (KKM)',
      };
    }
    if (path.includes('/kelas')) {
      return {
        title: 'Rombongan Belajar (Kelas)',
        category: 'Master Data Akademik',
        icon: Building2,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        tableHeaders: ['No', 'Nama Kelas', 'Tingkat', 'Jurusan Induk', 'Wali Kelas', 'Jumlah Siswa'],
        sampleDefaultColumns: 'Struktur: ID, Class Name, Grade Level (10, 11, 12), Major ID, Homeroom Teacher',
      };
    }
    if (path.includes('/jurusan')) {
      return {
        title: 'Konsentrasi Keahlian (Jurusan)',
        category: 'Master Data Akademik',
        icon: FolderGit2,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        tableHeaders: ['No', 'Kode Jurusan', 'Nama Lengkap Keahlian', 'Singkatan', 'Jumlah Rombel', 'Status'],
        sampleDefaultColumns: 'Struktur: ID, Code (TJKT, TKRO, AKL, DKV, MPLB), Name, Created At',
      };
    }
    if (path.includes('/bank-soal')) {
      return {
        title: 'Paket Bank Soal 4 Tipe',
        category: 'Instrumen Asesmen TKA',
        icon: FileQuestion,
        color: 'text-rose-600 bg-rose-50 border-rose-200',
        tableHeaders: ['No', 'Judul Paket Soal', 'Mata Pelajaran', 'Penyusun', 'Tipe Soal', 'Total Butir', 'KKM'],
        sampleDefaultColumns: 'Struktur: Bank ID, Title, Subject, Author, 4 Types (PG, Kompleks, Esai, Menjodohkan)',
      };
    }
    if (path.includes('/ujian')) {
      return {
        title: 'Jadwal & Pelaksanaan Ujian',
        category: 'Manajemen CBT',
        icon: Calendar,
        color: 'text-sky-600 bg-sky-50 border-sky-200',
        tableHeaders: ['No', 'Nama Jadwal Ujian', 'Mata Pelajaran', 'Kelas Sasaran', 'Mulai', 'Durasi', 'Status'],
        sampleDefaultColumns: 'Struktur: Exam ID, Bank ID, Start Time, End Time, Duration, Randomize Flags, Status',
      };
    }
    if (path.includes('/laporan')) {
      return {
        title: 'Laporan Rekapitulasi & Analisis Nilai',
        category: 'Statistik & Analisis Hasil',
        icon: BarChart3,
        color: 'text-teal-600 bg-teal-50 border-teal-200',
        tableHeaders: ['No', 'Nama Peserta', 'Kelas', 'Skor PG', 'Skor Esai', 'Nilai Akhir', 'Ketuntasan'],
        sampleDefaultColumns: 'Struktur: Attempt ID, Student ID, Exam ID, Raw Scores, Final Scaled Score, Pass/Fail',
      };
    }
    if (path.includes('/penilaian')) {
      return {
        title: 'Penilaian & Koreksi Hasil Siswa',
        category: 'Evaluasi Pembelajaran',
        icon: Award,
        color: 'text-violet-600 bg-violet-50 border-violet-200',
        tableHeaders: ['No', 'Peserta Didik', 'Mata Pelajaran', 'Waktu Pengumpulan', 'Status Koreksi', 'Nilai'],
        sampleDefaultColumns: 'Struktur: Attempt ID, Answers JSONB, Essay Review Status, Score Output',
      };
    }
    if (path.includes('/import-export')) {
      return {
        title: 'Pusat Import & Export Spreadsheet',
        category: 'Integrasi Data Excel',
        icon: FileSpreadsheet,
        color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
        tableHeaders: ['No', 'Tipe Entitas', 'Format File', 'Terakhir Diunduh', 'Riwayat Sinkronisasi', 'Aksi'],
        sampleDefaultColumns: 'Struktur: Import Batch Log, Row Counter, Validation Errors, Timestamp',
      };
    }

    return {
      title: 'Data Modul Sistem',
      category: 'Portal Akademik',
      icon: Layers,
      color: 'text-slate-600 bg-slate-50 border-slate-200',
      tableHeaders: ['No', 'Nama Atribut', 'Tipe Data', 'Status Integrasi', 'Keterangan'],
      sampleDefaultColumns: 'Struktur data default untuk modul aplikasi',
    };
  };

  const moduleInfo = getModuleInfo();
  const Icon = moduleInfo.icon;

  const getBackPath = () => {
    if (path.startsWith('/admin')) return '/admin/dashboard';
    if (path.startsWith('/guru')) return '/guru/dashboard';
    if (path.startsWith('/siswa')) return '/siswa/dashboard';
    return '/';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(getBackPath())}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </button>

        {role === 'admin' && onOpenGuide && (
          <button
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Skema Basis Data</span>
          </button>
        )}
      </div>

      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${moduleInfo.color} shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider mb-1">
              <span>{moduleInfo.category}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {moduleInfo.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs sm:text-sm shadow-xs hover:bg-blue-700 transition-colors w-full sm:w-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data Baru</span>
          </button>
        </div>
      </div>

      {/* Keterangan: Data belum ada Notice Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-3.5 shadow-xs">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 text-xs sm:text-sm">
          <strong className="font-bold block text-amber-950 text-sm mb-0.5">
            Keterangan: Data belum ada
          </strong>
          <p className="text-amber-800 leading-relaxed">
            Belum ada entri rekaman data yang tersimpan pada sistem untuk menu ini. Tabel di bawah tetap menampilkan struktur tabel dan skema kolom default agar Anda dapat meninjau format data yang dipersiapkan.
          </p>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari data..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filter</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* Default Data Table with Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {moduleInfo.tableHeaders.map((header, idx) => (
                  <th key={idx} className="py-3.5 px-4 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Empty Data Placeholder Row */}
              <tr>
                <td colSpan={moduleInfo.tableHeaders.length} className="py-14 px-4 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                      Data belum ada
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-4 leading-relaxed">
                      Belum ada data yang tercatat dalam sistem untuk halaman ini. Data baru dapat ditambahkan melalui tombol di atas atau melalui impor berkas.
                    </p>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      {moduleInfo.sampleDefaultColumns}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>Menampilkan 0 dari 0 entri (Status: Data belum ada)</span>
          <div className="flex items-center gap-1">
            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-400 font-semibold cursor-not-allowed">
              Halaman 1 dari 1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
