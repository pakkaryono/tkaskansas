import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  Key,
  Users,
  GraduationCap,
  BookMarked,
  Layers,
  Sparkles,
  FileQuestion,
  CalendarCheck,
  BarChart3,
  FileSpreadsheet,
  Download,
  RotateCcw,
  AlertCircle,
  Server,
  Database,
  Lock,
  Globe,
  Terminal,
  ChevronRight,
  Search,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';

export const DocumentationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'user' | 'developer'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // 14 Panduan Pengguna Awam (A - N)
  const userGuides = [
    {
      id: 'A',
      title: 'A. Cara Login Admin',
      icon: Key,
      description: 'Panduan masuk ke sistem sebagai Administrator dengan kredensial atau preset akun.',
      steps: [
        'Kunjungi halaman utama aplikasi TKA SMKN 1 Songgom, lalu klik tombol "Masuk Aplikasi" atau "Login".',
        'Masukkan alamat email admin resmi (misal: admin@smk.id) dan kata sandi Anda.',
        'Jika sedang dalam mode demo pengujian, Anda dapat langsung mengklik tombol cepat "Admin" pada kotak demo di bawah formulir login.',
        'Setelah berhasil masuk, Anda akan diarahkan ke Dashboard Administrator dengan akses penuh ke seluruh menu sistem.',
      ],
      tip: 'Pastikan selalu mengklik tombol "Keluar" (Logout) setelah selesai mengelola sistem untuk mengamankan sesi.',
    },
    {
      id: 'B',
      title: 'B. Cara Membuat / Mengelola Data Guru',
      icon: Users,
      description: 'Langkah menambahkan guru pengajar baru, nomor induk NIP, dan mata pelajaran yang diampu.',
      steps: [
        'Buka menu navigasi sidebar "Data Master" → pilih "Master Guru".',
        'Untuk menambah 1 guru: Klik tombol "+ Tambah Guru", isi Nama Lengkap, NIP (atau NUPTK), Email, Nomor Telepon/WhatsApp, dan centang Mata Pelajaran yang diampu.',
        'Klik tombol "Simpan Guru". Akun guru akan otomatis terdaftar dan siap digunakan.',
        'Untuk mengubah data guru yang sudah ada, klik ikon pensil pada tabel guru.',
        'Untuk menghapus, gunakan tombol tempat sampah dengan konfirmasi persetujuan.',
      ],
      tip: 'Anda juga dapat mengimpor puluhan data guru sekaligus melalui menu Import Excel (.xlsx).',
    },
    {
      id: 'C',
      title: 'C. Cara Membuat / Mengelola Data Siswa',
      icon: GraduationCap,
      description: 'Langkah mendaftarkan siswa baru, NIS, NISN, penetapan kelas, dan jurusan.',
      steps: [
        'Buka menu navigasi sidebar "Data Master" → pilih "Master Siswa".',
        'Klik tombol "+ Tambah Siswa".',
        'Isi Nama Siswa, NIS, NISN (10 digit), pilih Kelas (misal: XI TJKT 1), dan pilih Jurusan.',
        'Masukkan email siswa (misal: siswa@smk.id atau email belajar.id) dan password awal.',
        'Klik tombol "Simpan Siswa". Siswa kini terdaftar dan berhak mengikuti jadwal ujian yang sesuai kelasnya.',
      ],
      tip: 'Gunakan fitur pencarian dan filter kelas di bagian atas tabel untuk menemukan siswa dengan cepat.',
    },
    {
      id: 'D',
      title: 'D. Cara Membuat Mata Pelajaran',
      icon: BookMarked,
      description: 'Menambahkan kurikulum mapel umum maupun kejuruan (Produktif SMK).',
      steps: [
        'Masuk ke menu "Data Master" → pilih "Master Mata Pelajaran".',
        'Klik tombol "+ Tambah Mata Pelajaran".',
        'Tuliskan Nama Mapel (misal: "Administrasi Sistem Jaringan"), Kode Mapel (misal: "ASJ-XI"), Kategori (Umum/Kejuruan/Pilihan), dan Nilai KKM/Passing Grade (default: 75).',
        'Klik "Simpan Mata Pelajaran".',
      ],
      tip: 'Mata pelajaran yang telah dibuat akan langsung muncul pada pilihan penugasan Guru dan Bank Soal.',
    },
    {
      id: 'E',
      title: 'E. Cara Membuat Kelas',
      icon: Layers,
      description: 'Pengaturan rombongan belajar tingkat X, XI, dan XII SMKN 1 Songgom.',
      steps: [
        'Masuk ke menu "Data Master" → pilih "Master Kelas".',
        'Klik "+ Tambah Kelas", lalu tentukan Nama Rombel (misal: "XII TO 2"), Tingkat (10, 11, atau 12), dan hubungkan ke Jurusan terkait.',
        'Klik "Simpan Kelas".',
      ],
      tip: 'Pembagian kelas yang rapi mempermudah penjadwalan ujian per rombel secara akurat.',
    },
    {
      id: 'F',
      title: 'F. Cara Membuat Jurusan / Program Keahlian',
      icon: Sparkles,
      description: 'Konfigurasi kompetensi keahlian kejuruan di SMK.',
      steps: [
        'Masuk ke menu "Data Master" → pilih "Master Jurusan".',
        'Klik "+ Tambah Jurusan", masukkan Kode Jurusan (misal: "TJKT") dan Nama Lengkap ("Teknik Jaringan Komputer & Telekomunikasi").',
        'Klik "Simpan Jurusan".',
      ],
      tip: 'Jurusan menjadi induk pengelompokan kelas dan pemetaan mata pelajaran produktif.',
    },
    {
      id: 'G',
      title: 'G. Cara Membuat Bank Soal (4 Tipe Soal)',
      icon: FileQuestion,
      description: 'Menyusun paket soal berkualitas dengan 4 tipe soal asesmen modern + Essay.',
      steps: [
        'Buka menu "Bank Soal" pada akun Guru atau Admin.',
        'Klik "+ Buat Bank Soal", tentukan judul paket, mapel, dan target tingkatan kelas.',
        'Masuk ke dalam paket soal, lalu klik "+ Tambah Butir Soal".',
        'Pilih salah satu dari 4 tipe soal resmi TKA: (1) Pilihan Ganda Tunggal (1 jawaban benar), (2) Pilihan Ganda Kompleks (jawaban lebih dari satu), (3) Benar / Salah (pernyataan), (4) Menjodohkan (pasangan premis & respon), atau (5) Essay/Uraian.',
        'Gunakan editor untuk menulis pertanyaan, sematkan gambar jika diperlukan, dan tandai kunci jawaban yang benar.',
        'Klik "Simpan Butir Soal". Anda dapat meninjau simulasi tampilan soal melalui tombol "Pratinjau".',
      ],
      tip: 'Sistem CBT secara otomatis mengacak urutan opsi pilihan jawaban saat siswa mengerjakan untuk mencegah contek.',
    },
    {
      id: 'H',
      title: 'H. Cara Membuat Paket Ujian',
      icon: CalendarCheck,
      description: 'Mengonversi bank soal menjadi sesi ujian online dengan parameter kelulusan.',
      steps: [
        'Buka menu "Manajemen Ujian", lalu klik "+ Buat Ujian Baru".',
        'Isi Judul Ujian (misal: "Tes Kemampuan Akademik Semester Ganjil 2026/2027").',
        'Pilih Bank Soal yang ingin digunakan.',
        'Tentukan Durasi Ujian dalam hitungan menit (misal: 90 menit), Nilai KKM (misal: 75), dan Bobot Penilaian per tipe soal.',
        'Atur Token Ujian (opsional, kode 5 huruf unik untuk otorisasi masuk siswa).',
        'Klik "Simpan Konfigurasi Ujian".',
      ],
      tip: 'Anda dapat mengaktifkan fitur acak urutan soal (randomize) agar setiap siswa menerima urutan nomor yang berbeda.',
    },
    {
      id: 'I',
      title: 'I. Cara Mengatur Jadwal Ujian',
      icon: CalendarCheck,
      description: 'Menentukan jendela waktu mulai dan batas pengumpulan untuk kelas sasaran.',
      steps: [
        'Pada halaman Ujian, buka tab "Jadwal & Peserta".',
        'Tentukan Tanggal & Jam Mulai serta Tanggal & Jam Selesai.',
        'Pilih daftar Kelas yang berhak mengikuti ujian (misal: seluruh kelas XI).',
        'Ubah status ujian menjadi "Aktif" (Published). Siswa pada kelas bersangkutan kini dapat melihat jadwal di dashboard mereka.',
      ],
      tip: 'Sebelum jam mulai tiba, tombol "Mulai Ujian" di sisi siswa akan berstatus terkunci (countdown jam).',
    },
    {
      id: 'J',
      title: 'J. Cara Melihat Laporan & Rekap Nilai',
      icon: BarChart3,
      description: 'Menganalisis hasil pengerjaan siswa, statistik daya serap, dan unduh daftar nilai.',
      steps: [
        'Buka menu "Laporan Hasil" pada akun Admin atau Guru.',
        'Pilih Ujian yang ingin ditinjau. Anda akan disajikan ringkasan: Rata-rata Nilai, Nilai Tertinggi, Nilai Terendah, dan Persentase Kelulusan KKM.',
        'Gunakan tabel daftar peserta untuk melihat nilai masing-masing siswa beserta rincian jumlah jawaban benar/salah.',
        'Klik tombol "Lihat Lembar Jawaban" untuk mengoreksi jawaban soal Essay secara manual jika ada.',
      ],
      tip: 'Hasil penilaian untuk soal PG, PG Kompleks, Benar/Salah, dan Menjodohkan dikalkulasi secara instan 100% otomatis!',
    },
    {
      id: 'K',
      title: 'K. Cara Import Data via Excel',
      icon: FileSpreadsheet,
      description: 'Memasukkan ratusan data siswa, guru, atau soal sekaligus menggunakan berkas XLSX.',
      steps: [
        'Buka menu "Import / Export Data".',
        'Pilih kategori data yang ingin diimpor: "Siswa", "Guru", atau "Bank Soal".',
        'Klik tombol "Unduh Template Excel (.xlsx)" untuk mendapatkan format tabel resmi yang valid.',
        'Buka berkas di Microsoft Excel / Google Sheets, isi data sesuai kolom tanpa mengubah baris judul (header), lalu simpan berkas.',
        'Tarik (drag-and-drop) atau pilih berkas tersebut pada area unggah di aplikasi TKA.',
        'Sistem akan memvalidasi baris data. Klik "Proses Import Sekarang". Semua data akan masuk ke sistem dalam hitungan detik!',
      ],
      tip: 'Sistem memiliki proteksi anti-malware otomatis yang menolak ekstensi berkas berbahaya (.exe, .bat, .php).',
    },
    {
      id: 'L',
      title: 'L. Cara Export Nilai & Data ke Excel',
      icon: Download,
      description: 'Mengunduh rekapitulasi nilai resmi sekolah untuk keperluan arsip rapor dan kurikulum.',
      steps: [
        'Buka menu "Import / Export Data" atau halaman "Laporan Ujian".',
        'Pilih jenis data yang ingin diekspor (misal: "Rekap Nilai Siswa per Ujian" atau "Master Data Siswa").',
        'Pilih filter kelas atau mata pelajaran jika diperlukan.',
        'Klik tombol "Ekspor ke Excel (.xlsx)".',
        'Berkas spreadsheet rapi berformat standar Excel akan langsung terunduh ke komputer Anda.',
      ],
      tip: 'Berkas hasil ekspor sudah dilengkapi timestamp dan rumus statistik rata-rata.',
    },
    {
      id: 'M',
      title: 'M. Cara Reset Password Akun Pengguna',
      icon: RotateCcw,
      description: 'Mekanisme pemulihan kata sandi mandiri melalui tautan email.',
      steps: [
        'Pada layar Login, klik tautan "Lupa Password?".',
        'Ketik alamat email Anda yang terdaftar di sistem TKA, lalu klik tombol "Kirim Link Reset".',
        'Buka kotak masuk atau folder spam email Anda, lalu klik tautan pemulihan.',
        'Masukkan kata sandi baru yang kuat (minimal 6 karakter) dan lakukan konfirmasi kata sandi.',
      ],
      tip: 'Demi alasan keamanan, tautan pemulihan kedaluwarsa secara otomatis dalam 15 menit.',
    },
    {
      id: 'N',
      title: 'N. Cara Menangani Siswa Lupa Password / Terkendala Ujian',
      icon: AlertCircle,
      description: 'Prosedur proktor/administrator saat siswa mengalami kendala teknis di ruang lab ujian.',
      steps: [
        'Jika siswa lupa password saat di lab: Buka menu "Master Siswa" pada akun Admin/Guru.',
        'Cari nama siswa atau NIS siswa yang bersangkutan.',
        'Klik ikon gembok "Reset Password" pada baris siswa tersebut. Masukkan kata sandi sementara (misal: "smk12345") lalu klik Simpan.',
        'Minta siswa login kembali menggunakan kata sandi sementara tersebut.',
        'Jika browser siswa tertutup atau perangkat mati saat ujian berlangsung: Cukup minta siswa login kembali pada perangkat lain. Sistem Autosave kami telah menyimpan seluruh jawaban sebelumnya dan timer akan melanjutkan sisa waktu yang tersedia!',
      ],
      tip: 'Sesi ujian dilindungi mekanisme toleransi pemutusan koneksi lokal sehingga progres siswa tidak akan hilang.',
    },
  ];

  const filteredGuides = userGuides.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/20">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Pusat Informasi & Dokumentasi Resmi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Panduan Pengguna & Dokumentasi Sistem
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
              Panduan lengkap langkah demi langkah untuk Operator Sekolah, Guru Penguji, dan Proktor,
              serta dokumentasi teknis arsitektur untuk pengembang (Developer Guide).
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-white/10 p-1.5 rounded-2xl border border-white/15 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('user')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'user'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Panduan Pengguna (A - N)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('developer')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'developer'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Dokumentasi Developer</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: PANDUAN PENGGUNA AWAM */}
      {activeTab === 'user' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari panduan (misal: 'login', 'guru', 'bank soal', 'excel', 'lupa password')..."
              className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 shadow-xs"
            />
          </div>

          {/* List of Guides */}
          <div className="space-y-4">
            {filteredGuides.map((guide) => {
              const IconComponent = guide.icon;
              return (
                <div
                  key={guide.id}
                  id={`panduan-${guide.id.toLowerCase()}`}
                  className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{guide.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{guide.description}</p>
                    </div>
                  </div>

                  {/* Steps Ordered List */}
                  <div className="pl-2 space-y-2.5">
                    {guide.steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {sIdx + 1}
                        </div>
                        <p className="leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>

                  {/* Pro Tip Box */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Tips Praktis: </span>
                      <span>{guide.tip}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DOKUMENTASI DEVELOPER */}
      {activeTab === 'developer' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Quick Summary Card */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              <span>Ringkasan Stack Teknologi & Arsitektur</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Aplikasi TKA SMKN 1 Songgom dibangun dengan pendekatan <strong>Cloud-Ready Single Page Application (SPA)</strong> modern
              menggunakan React 19, TypeScript, Tailwind CSS v4, dan terhubung ke backend <strong>Supabase (PostgreSQL 15+)</strong> untuk
              Authentication, Database Relasional, Row Level Security (RLS), dan Storage.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Frontend Engine</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">React 19 + Vite 6</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Database & Auth</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">Supabase Postgres</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Styling</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">Tailwind CSS v4</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">PWA & Security</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">Anti-XSS & Anti-IDOR</div>
              </div>
            </div>
          </div>

          {/* 1. Struktur Project */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>1. Struktur Direktori Proyek</span>
            </h3>
            <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
{`/src
  ├── /components
  │   ├── /common         # UI Komponen Global (Header, Sidebar, EmptyState, LoadingSkeleton, PWAInstall)
  │   ├── /exam-session   # Engine CBT (CbtTimer, CbtPalette, QuestionItemRenderer, Modal Konfirmasi)
  │   ├── /exams          # Form pengaturan paket ujian & pembobotan skor
  │   ├── /questions      # Editor butir soal 4 tipe (PG Tunggal, Kompleks, B/S, Menjodohkan, Essay)
  │   └── /importExport   # Parser XLSX, verifikasi header, dan generator template spreadsheet
  ├── /contexts
  │   ├── AuthContext.tsx         # Otentikasi Supabase, sesi pengguna, demo presets, reset password
  │   ├── MasterDataContext.tsx   # CRUD Guru, Siswa, Mapel, Kelas, Jurusan, Kategori Nilai
  │   ├── QuestionBankContext.tsx # Manajemen Bank Soal, butir soal, kunci jawaban
  │   └── ExamContext.tsx         # Engine Ujian, sinkronisasi waktu, grading multi-tipe, anti-IDOR
  ├── /lib
  │   ├── supabase.ts             # Inisialisasi Supabase client & preset demo users
  │   ├── supabaseSchema.ts       # SQL DDL Script lengkap (Tabel, RLS, Indexes, Triggers)
  │   ├── securitySanitizer.ts    # Proteksi anti-XSS, path traversal, anti-IDOR, error masking
  │   ├── auditLogger.ts          # Sistem audit log terpusat untuk kepatuhan keamanan
  │   └── usePWAInstall.ts        # Hook instalasi Progressive Web App & deteksi iOS
  └── /pages
      ├── /public                 # Landing Page, Login, About
      ├── /admin                  # Dashboard, Master Data, Bank Soal, Ujian, Laporan, Import/Export
      ├── /guru                   # Dashboard Guru, Bank Soal Guru, Ujian, Koreksi Essay, Laporan
      ├── /siswa                  # Dashboard Siswa, Jadwal Ujian, Sesi CBT Ujian, Kartu Hasil Nilai
      └── /common                 # Profil, Panduan Supabase, Dokumentasi, Production Checklist`}
            </pre>
          </div>

          {/* 2. Database Supabase & DDL */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <span>2. Skema Database Supabase & Row Level Security (RLS)</span>
              </h3>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `-- Jalankan script lengkap dari /src/lib/supabaseSchema.ts pada SQL Editor Supabase`,
                    'sql'
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                {copiedSnippet === 'sql' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Petunjuk SQL</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              Database menggunakan 11 tabel relasional utama dengan integritas referensial dan RLS aktif:
            </p>
            <ul className="text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 list-disc">
              <li><code>profiles</code>: Data profil pengguna (Admin, Guru, Siswa)</li>
              <li><code>subjects</code>: Mata pelajaran kurikulum</li>
              <li><code>teachers</code>: Detail guru & relasi pengampu</li>
              <li><code>majors & classes</code>: Jurusan & rombel siswa</li>
              <li><code>students</code>: Data lengkap siswa, NIS, NISN</li>
              <li><code>question_banks</code>: Paket bank soal</li>
              <li><code>questions</code>: Butir soal dengan 4 tipe + kunci jawaban</li>
              <li><code>exams</code>: Konfigurasi jadwal ujian & passing grade</li>
              <li><code>exam_questions</code>: Snapshot butir soal pada ujian</li>
              <li><code>exam_attempts</code>: Lembar pengerjaan, jawaban, & skor siswa</li>
              <li><code>audit_logs</code>: Rekam jejak audit keamanan</li>
            </ul>
          </div>

          {/* 3. Environment Variables */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <span>3. Variabel Lingkungan (.env)</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Sebelum melakukan deploy ke produksi, pastikan file <code>.env</code> di root proyek telah berisi konfigurasi Supabase Anda:
            </p>
            <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto">
{`# File: .env (Produksi)
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=your_gemini_api_key_if_applicable`}
            </pre>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                <strong>Catatan Keamanan:</strong> Jangan pernah memasukkan <code>service_role</code> key Supabase ke dalam frontend React.
                Cukup gunakan <code>anon key</code> yang aman dan dilindungi oleh aturan Row Level Security (RLS).
              </p>
            </div>
          </div>

          {/* 4. Panduan Deployment (Vercel, Netlify, Cloud Run) */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span>4. Panduan Deployment Produksi (Vercel & Netlify)</span>
            </h3>

            {/* Opsi A: Vercel */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Rekomendasi Utama: Vercel</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">Sangat Mudah</span>
              </div>
              <ol className="text-xs text-slate-700 list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>Buka <strong>https://vercel.com</strong> dan login dengan akun GitHub Anda.</li>
                <li>Pilih <strong>&quot;Add New Project&quot;</strong>, lalu impor repositori proyek TKA ini.</li>
                <li>Framework Preset akan otomatis terdeteksi sebagai <strong>Vite</strong>.</li>
                <li>Buka bagian <strong>Environment Variables</strong>, tambahkan <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>.</li>
                <li>Klik tombol <strong>&quot;Deploy&quot;</strong>. Aplikasi Anda akan live dalam waktu kurang dari 1 menit!</li>
                <li>Di tab <strong>Settings → Domains</strong>, Anda dapat menautkan domain sekolah (misal: <code>tka.smkn1songgom.sch.id</code>).</li>
              </ol>
            </div>

            {/* Opsi B: Netlify */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Alternatif: Netlify</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Gratis SSL</span>
              </div>
              <ol className="text-xs text-slate-700 list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>Buka <strong>https://www.netlify.com</strong> → klik &quot;Add new site&quot; → &quot;Import an existing project&quot;.</li>
                <li>Build command: <code>npm run build</code>, Publish directory: <code>dist</code>.</li>
                <li>Tambahkan environment variables di <strong>Site configuration → Environment variables</strong>.</li>
                <li>Deploy Site dan pasang custom domain sekolah secara gratis dengan HTTPS otomatis.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
