import React from 'react';
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
  CheckCircle2
} from 'lucide-react';

interface PhasePreviewPageProps {
  path: string;
  onNavigate: (path: string) => void;
  onOpenGuide: () => void;
}

export const PhasePreviewPage: React.FC<PhasePreviewPageProps> = ({ path, onNavigate, onOpenGuide }) => {
  const getPhaseDetails = () => {
    if (path.includes('/guru')) {
      return {
        title: 'Manajemen Data Guru',
        phase: 'Fase 2: Database Master',
        icon: Users,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        desc: 'Modul CRUD Guru lengkap: Tambah Guru, NIP/NUPTK, email, nomor telepon, mata pelajaran yang diampu (relasi multi-mapel), reset password, import Excel (.xlsx), dan export data.',
        checklist: [
          'Tabel teachers & relasi teacher_subjects di PostgreSQL',
          'Form Tambah/Edit Guru dengan validasi NIP & Email',
          'Status Aktif / Nonaktif',
          'Import Excel template guru & validasi baris',
        ],
      };
    }
    if (path.includes('/siswa')) {
      return {
        title: 'Manajemen Data Siswa',
        phase: 'Fase 2: Database Master',
        icon: GraduationCap,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        desc: 'Modul CRUD Siswa: Kelola NIS, NISN, nama lengkap, relasi Kelas & Jurusan, status aktif/nonaktif, reset password, dan sinkronisasi dengan tabel profiles.',
        checklist: [
          'Tabel students berelasi ke classes dan majors',
          'Filter data siswa berdasarkan kelas dan jurusan',
          'Import massal siswa per rombel melalui file Excel',
          'Pencarian instan berdasarkan NIS atau nama',
        ],
      };
    }
    if (path.includes('/mapel')) {
      return {
        title: 'Manajemen Mata Pelajaran',
        phase: 'Fase 2: Database Master',
        icon: BookOpen,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        desc: 'Modul Pengelolaan Mata Pelajaran Umum & Kejuruan: Kode mapel, nama mata pelajaran, deskripsi kurikulum, dan pengelompokan tingkat.',
        checklist: [
          'Tabel subjects di Supabase',
          'Pengelompokan Muatan Nasional, Kewilayahan & Kejuruan SMK',
          'Koneksi mata pelajaran ke bank soal dan jadwal ujian',
        ],
      };
    }
    if (path.includes('/kelas')) {
      return {
        title: 'Manajemen Rombongan Belajar (Kelas)',
        phase: 'Fase 2: Database Master',
        icon: Building2,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        desc: 'Modul Kelas: Kelola tingkat (X, XI, XII), kode kelas (misal: X TJKT 1, XI AKL 2), relasi jurusan, dan tahun ajaran 2026/2027.',
        checklist: [
          'Tabel classes dengan unique constraint tingkat + jurusan + rombel',
          'Penyaringan siswa otomatis saat penugasan jadwal ujian',
        ],
      };
    }
    if (path.includes('/jurusan')) {
      return {
        title: 'Manajemen Jurusan / Konsentrasi Keahlian',
        phase: 'Fase 2: Database Master',
        icon: FolderGit2,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        desc: 'Modul Jurusan: Kode jurusan (TJKT, TKRO, AKL, DKV, MPLB), nama lengkap keahlian, dan deskripsi.',
        checklist: [
          'Tabel majors dengan kode jurusan unik',
          'Statistik jumlah siswa per kompetensi keahlian',
        ],
      };
    }
    if (path.includes('/bank-soal')) {
      return {
        title: 'Bank Soal 4 Tipe & Jadwal Ujian',
        phase: 'Fase 3 & 4: Bank Soal & Mesin Ujian',
        icon: FileQuestion,
        color: 'text-rose-600 bg-rose-50 border-rose-200',
        desc: 'Penyusunan instrumen tes dengan 4 tipe soal: Pilihan Ganda Biasa (A-E), Pilihan Ganda Kompleks (Multi-Opsi), Esai Singkat (Keyword & Manual), dan Menjodohkan (Matching Pairs). Serta pengaturan jadwal dan durasi pengerjaan.',
        checklist: [
          'Form editor interaktif untuk masing-masing 4 tipe soal',
          'Upload gambar soal ke Supabase Storage',
          'Pengaturan jadwal ujian: tanggal/jam mulai, selesai, durasi menit',
          'Randomisasi urutan soal dan opsi yang konsisten per attempt',
        ],
      };
    }
    if (path.includes('/laporan')) {
      return {
        title: 'Laporan Nilai & Analisis Hasil TKA',
        phase: 'Fase 5: Penilaian & Analitik',
        icon: BarChart3,
        color: 'text-teal-600 bg-teal-50 border-teal-200',
        desc: 'Laporan komprehensif hasil pengerjaan siswa: skor per butir soal, nilai akhir 0-100, persentase ketuntasan kelas, ekspor Excel, dan cetak lembar hasil.',
        checklist: [
          'Kalkulasi otomatis (Obtained Score / Max Score) × 100',
          'Fitur grading manual esai untuk guru mata pelajaran',
          'Filter laporan per kelas, mata pelajaran, dan tanggal',
          'Ekspor hasil ke file Excel (.xlsx)',
        ],
      };
    }
    if (path.includes('/import-export')) {
      return {
        title: 'Pusat Import & Export Excel',
        phase: 'Fase 6: Integrasi Spreadsheet',
        icon: FileSpreadsheet,
        color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
        desc: 'Pusat unduh template format Excel resmi, upload file, preview data, validasi duplikasi NIS/Email per baris, dan ekspor data master.',
        checklist: [
          'Download template Excel terstandarisasi',
          'Preview data dengan indikator baris error jika data tidak valid',
          'Batch insert data ke Supabase dengan aman',
        ],
      };
    }

    return {
      title: 'Modul Aplikasi',
      phase: 'Pengembangan Terjadwal',
      icon: Layers,
      color: 'text-slate-600 bg-slate-50 border-slate-200',
      desc: 'Modul ini siap dikembangkan pada tahapan berikutnya.',
      checklist: [],
    };
  };

  const info = getPhaseDetails();
  const Icon = info.icon;

  const getBackPath = () => {
    if (path.startsWith('/admin')) return '/admin/dashboard';
    if (path.startsWith('/guru')) return '/guru/dashboard';
    if (path.startsWith('/siswa')) return '/siswa/dashboard';
    return '/';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back to Dashboard */}
      <div>
        <button
          onClick={() => onNavigate(getBackPath())}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard Utama</span>
        </button>
      </div>

      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${info.color}`}>
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {info.phase}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{info.title}</h2>
            </div>
          </div>

          <button
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Lihat Skrip SQL Supabase</span>
          </button>
        </div>

        <p className="text-slate-600 text-sm leading-relaxed mb-6">{info.desc}</p>

        {info.checklist.length > 0 && (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Rencana Fitur & Skema Basis Data:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {info.checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            Fase 1 (Autentikasi, Role & Layout) telah aktif dan siap digunakan.
          </span>
          <button
            onClick={() => onNavigate(getBackPath())}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors"
          >
            Ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
