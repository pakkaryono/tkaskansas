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
  ShieldCheck,
  Clock,
  HelpCircle,
  Shuffle,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const DocumentationPage: React.FC = () => {
  const { user, profile, role } = useAuth();

  // Tab state untuk Admin
  const [adminTab, setAdminTab] = useState<'admin' | 'guru' | 'siswa' | 'developer'>('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // ==========================================
  // PANDUAN SISWA
  // ==========================================
  const siswaGuides = [
    {
      id: 'S1',
      title: '1. Cara Masuk (Login) Akun Siswa',
      icon: Key,
      description: 'Petunjuk masuk ke aplikasi CBT TKA menggunakan email dan kata sandi resmi.',
      steps: [
        'Kunjungi halaman depan portal TKA SMKN 1 Songgom dan klik tombol "Masuk / Login".',
        'Masukkan alamat email resmi Anda (misalnya: siswa@smk.id atau akun belajar.id yang dibagikan proktor/wali kelas).',
        'Ketik kata sandi (password) Anda dengan teliti. Klik ikon mata untuk memastikan password sudah benar.',
        'Klik tombol "Masuk ke Sistem". Anda akan langsung diarahkan ke Dashboard Siswa.',
      ],
      tip: 'Jika lupa kata sandi atau akun belum aktif, segera hubungi wali kelas atau proktor ruang ujian.',
    },
    {
      id: 'S2',
      title: '2. Melihat Jadwal Ujian & Status Pengerjaan',
      icon: CalendarCheck,
      description: 'Menemukan daftar ujian yang tersedia untuk kelas Anda.',
      steps: [
        'Di menu navigasi samping, pilih menu "Jadwal Ujian" atau "Ujian Saya".',
        'Perhatikan kartu mata pelajaran: cek nama ujian, alokasi durasi (misal: 60 menit), tanggal aktif, dan status (Tersedia / Sedang Berlangsung / Selesai).',
        'Ujian hanya dapat dimulai pada rentang waktu yang telah dijadwalkan oleh guru.',
        'Klik tombol "Mulai Ujian" untuk membaca petunjuk teknis sebelum masuk ke lembar soal.',
      ],
      tip: 'Pastikan baterai perangkat terisi penuh dan koneksi internet stabil sebelum menekan tombol Mulai Ujian.',
    },
    {
      id: 'S3',
      title: '3. Tata Tertib & Ketentuan Ujian TKA',
      icon: ShieldCheck,
      description: 'Aturan wajib yang harus ditaati selama ujian berlangsung.',
      steps: [
        'Dilarang membuka tab baru, mencari jawaban di internet, atau bertukar jawaban dengan peserta lain.',
        'Aplikasi dilengkapi sistem anti-kecurangan yang mencatat perpindahan fokus layar.',
        'Setiap siswa mendapatkan urutan soal dan opsi yang diacak secara otomatis.',
        'Waktu ujian terus berjalan mundur dan tidak dapat dijeda (pause).',
      ],
      tip: 'Kerjakan soal yang Anda anggap paling mudah terlebih dahulu untuk mengoptimalkan durasi ujian.',
    },
    {
      id: 'S4',
      title: '4. Panduan Menjawab 4 Tipe Soal TKA',
      icon: FileQuestion,
      description: 'Cara menjawab 4 format instrumen tes kemampuan akademik kejuruan.',
      steps: [
        'Pilihan Ganda Biasa (A-E): Klik salah satu bulatan radio opsi jawaban yang paling benar.',
        'Pilihan Ganda Kompleks (Multi-Opsi): Anda dapat mencentang lebih dari satu kotak jawaban yang benar sesuai stimulus.',
        'Esai Singkat (Isian): Ketikkan jawaban ringkas atau kata kunci teknis pada kotak teks yang tersedia.',
        'Menjodohkan (Matching): Pasangkan pernyataan di kolom kiri dengan pasangan yang tepat di kolom kanan menggunakan menu dropdown.',
      ],
      tip: 'Untuk soal menjodohkan, pastikan seluruh pasangan telah terpilih sebelum beralih ke nomor berikutnya.',
    },
    {
      id: 'S5',
      title: '5. Navigasi Soal, Tombol Ragu-Ragu & Timer',
      icon: Clock,
      description: 'Menggunakan panel nomor soal untuk memantau pengerjaan.',
      steps: [
        'Nomor soal berwarna hijau menandakan jawaban sudah terisi.',
        'Gunakan centang "Ragu-ragu" (kuning) jika ingin menandai butir soal untuk ditinjau kembali nanti.',
        'Nomor abu-abu menandakan butir soal belum dijawab.',
        'Perhatikan sisa waktu pada bilah atas. Sistem akan memberi peringatan jika waktu tersisa kurang dari 5 menit.',
      ],
      tip: 'Klik langsung nomor kotak pada panel navigasi kanan untuk berpindah ke nomor soal yang diinginkan.',
    },
    {
      id: 'S6',
      title: '6. Autosave & Penanganan Kendala Jaringan',
      icon: Sparkles,
      description: 'Perlindungan jawaban otomatis dan prosedur bila koneksi terganggu.',
      steps: [
        'Setiap opsi atau jawaban yang Anda pilih langsung disimpan secara otomatis ke server (Autosave).',
        'Jika sinyal internet terputus, jangan panik atau menutup browser. Indikator offline akan muncul.',
        'Begitu koneksi pulih, jawaban otomatis tersinkronisasi kembali ke server.',
        'Jika perangkat mati mendadak, Anda dapat login kembali dari perangkat lain selama durasi waktu ujian belum habis.',
      ],
      tip: 'Segera lapor kepada pengawas ruang jika terjadi kendala teknis pada perangkat atau listrik.',
    },
    {
      id: 'S7',
      title: '7. Mengakhiri & Mengumpulkan Ujian',
      icon: CheckCircle2,
      description: 'Prosedur mengumpulkan lembar jawaban saat selesai mengerjakan.',
      steps: [
        'Pada nomor soal terakhir, klik tombol "Selesaikan Ujian".',
        'Sistem akan menampilkan dialog konfirmasi yang merangkum jumlah soal yang sudah dijawab dan yang masih ragu-ragu.',
        'Jika masih ada soal ragu-ragu, Anda dapat kembali untuk memastikan jawaban.',
        'Bila sudah yakin, klik konfirmasi "Ya, Kumpulkan Jawaban". Status ujian Anda akan berubah menjadi Selesai.',
      ],
      tip: 'Jika waktu ujian habis, sistem akan secara otomatis mengumpulkan seluruh jawaban yang telah tersimpan.',
    },
    {
      id: 'S8',
      title: '8. Melihat Hasil Nilai & Evaluasi Mandiri',
      icon: BarChart3,
      description: 'Mengecek perolehan skor dan catatan evaluasi akademik.',
      steps: [
        'Setelah ujian selesai dinilai, buka menu "Hasil & Nilai" pada sidebar.',
        'Pilih mata pelajaran yang ingin dilihat hasil evaluasinya.',
        'Anda dapat melihat skor akhir (skala 0 - 100), status ketuntasan (Tuntas / Belum Tuntas berdasarkan KKM), dan rincian jumlah jawaban benar.',
        'Gunakan hasil ini sebagai bahan refleksi untuk memperdalam kompetensi kejuruan Anda.',
      ],
      tip: 'Untuk soal esai, nilai akhir akan terbit setelah guru mata pelajaran selesai mengoreksi jawaban Anda.',
    },
    {
      id: 'S9',
      title: '9. FAQ / Tanya Jawab Umum Siswa',
      icon: HelpCircle,
      description: 'Pertanyaan yang sering ditanyakan seputar pengerjaan ujian.',
      steps: [
        'T: Apakah bisa mengubah jawaban yang sudah dipilih? J: Ya, Anda bebas mengubah opsi jawaban selama waktu ujian belum habis.',
        'T: Mengapa tombol "Mulai Ujian" tidak aktif? J: Jadwal ujian belum memasuki jam mulai atau sudah melewati batas waktu toleransi.',
        'T: Bisakah mengerjakan lewat HP / Smartphone? J: Ya, portal TKA responsif dan dapat diakses dari browser smartphone maupun laptop/PC.',
      ],
      tip: 'Disarankan menggunakan browser Google Chrome atau Microsoft Edge versi terbaru untuk performa terbaik.',
    },
  ];

  // ==========================================
  // PANDUAN GURU
  // ==========================================
  const guruGuides = [
    {
      id: 'G1',
      title: '1. Akses Dashboard Guru & Mata Pelajaran Binaan',
      icon: BookMarked,
      description: 'Memahami ruang kerja guru dan batasan akses mata pelajaran yang diampu.',
      steps: [
        'Masuk ke portal dengan kredensial Guru Anda.',
        'Di Dashboard Guru, Anda dapat melihat ringkasan mata pelajaran yang Anda ampu, total bank soal, ujian aktif, dan jumlah siswa binaan.',
        'Sesuai sistem keamanan, guru hanya berwenang mengelola bank soal dan melihat nilai siswa untuk mata pelajaran yang ditugaskan.',
      ],
      tip: 'Jika ada mata pelajaran binaan yang belum tercantum, hubungi Administrator untuk memperbarui penugasan mengajar Anda.',
    },
    {
      id: 'G2',
      title: '2. Membuat Bank Soal 4 Tipe Interaktif',
      icon: FileQuestion,
      description: 'Menyusun paket instrumen tes dengan 4 tipe soal berstandar TKA kejuruan.',
      steps: [
        'Buka menu "Bank Soal" pada sidebar → klik tombol "+ Buat Paket Soal Baru".',
        'Pilih Mata Pelajaran, tentukan Judul Paket (misal: "TKA Produktif TJKT Tingkat XI"), dan KKM.',
        'Klik tombol "+ Tambah Butir Soal" lalu pilih tipe soal:',
        '1) Pilihan Ganda (Single Choice): Tuliskan pertanyaan dan opsi A hingga E, lalu klik radio jawaban yang benar.',
        '2) Pilihan Ganda Kompleks: Masukkan beberapa pernyataan dan centang kotak opsi yang bernilai benar (multi-jawaban).',
        '3) Esai Singkat: Masukkan pertanyaan uraian serta kata kunci jawaban untuk mempermudah scoring.',
        '4) Menjodohkan: Masukkan premis sisi kiri dan pasangan yang sesuai di sisi kanan.',
      ],
      tip: 'Pastikan bobot skor setiap butir soal sudah sesuai agar total akumulasi bernilai proporsional.',
    },
    {
      id: 'G3',
      title: '3. Menambahkan Gambar & Formula pada Butir Soal',
      icon: Sparkles,
      description: 'Menyisipkan stimulus gambar rangkaian, skema kerja, atau diagram kejuruan.',
      steps: [
        'Pada form pembuatan soal, gunakan kolom "URL Gambar Stimulus" atau unggah file gambar (.jpg / .png).',
        'Gambar akan langsung tampil di panel pratinjau soal di samping form.',
        'Format teks mendukung penulisan formula, poin-poin penjelasan, dan studi kasus teknik.',
      ],
      tip: 'Gunakan gambar beresolusi jelas dengan ukuran file di bawah 2 MB agar memuat cepat di perangkat siswa.',
    },
    {
      id: 'G4',
      title: '4. Menetapkan Jadwal Ujian untuk Kelas Binaan',
      icon: CalendarCheck,
      description: 'Mengatur waktu pelaksanaan tes dan kelas peserta.',
      steps: [
        'Buka menu "Manajemen Ujian" → klik "+ Buat Jadwal Ujian".',
        'Pilih Bank Soal yang sudah rampung disusun.',
        'Tentukan Kelas sasaran (misal: XI TJKT 1, XI TJKT 2). Ujian hanya akan muncul pada akun siswa di kelas tersebut.',
        'Atur Tanggal Mulai, Jam Mulai, dan Tanggal Selesai.',
        'Tentukan Durasi Pengerjaan (misal: 60 menit atau 90 menit).',
        'Aktifkan opsi "Acak Urutan Soal" dan "Acak Urutan Opsi Jawaban" untuk mencegah siswa saling mencontek.',
      ],
      tip: 'Aktifkan status jadwal menjadi "Buka (Open)" jika ujian siap dimulai oleh para peserta.',
    },
    {
      id: 'G5',
      title: '5. Pemantauan (Live Monitoring) Ujian Berjalan',
      icon: Users,
      description: 'Memantau aktivitas pengerjaan siswa secara langsung di ruang ujian.',
      steps: [
        'Pada menu "Manajemen Ujian", klik tombol "Monitor" pada kartu ujian yang sedang berlangsung.',
        'Sistem menyajikan daftar seluruh siswa peserta beserta statusnya: Belum Mulai, Sedang Mengerjakan, atau Selesai.',
        'Anda dapat melihat persentase progres pengerjaan (misal: 35/40 soal terjawab) dan waktu tersisa setiap siswa.',
      ],
      tip: 'Fitur monitoring membantu pengawas mengetahui siswa mana yang mengalami kendala teknis atau koneksi.',
    },
    {
      id: 'G6',
      title: '6. Penilaian Manual Soal Esai & Pembobotan',
      icon: BarChart3,
      description: 'Memberikan skor pada jawaban uraian siswa.',
      steps: [
        'Buka menu "Penilaian & Hasil" → pilih paket ujian yang telah selesai.',
        'Untuk soal pilihan ganda dan menjodohkan, sistem mengoreksi dan menghitung skor secara otomatis.',
        'Untuk butir soal esai, klik tombol "Koreksi Esai".',
        'Baca jawaban siswa, bandingkan dengan kunci/rubrik acuan, lalu inputkan skor (misal: 0 - 10).',
        'Klik "Simpan Nilai Esai". Total nilai akhir siswa akan otomatis dikalkulasi ulang.',
      ],
      tip: 'Gunakan rubrik penilaian terstandar agar pemberian skor esai objektif dan konsisten.',
    },
    {
      id: 'G7',
      title: '7. Analisis Butir Soal & Laporan Ketuntasan',
      icon: Layers,
      description: 'Menelaah kualitas instrumen tes dan capaian kompetensi siswa.',
      steps: [
        'Buka menu "Laporan Hasil" → pilih mata pelajaran dan kelas.',
        'Sistem menampilkan grafik distribusi nilai: Nilai Tertinggi, Nilai Terendah, Rata-rata Kelas, dan Persentase Tuntas.',
        'Periksa daftar butir soal dengan persentase salah tertinggi untuk materi evaluasi pembelajaran.',
      ],
      tip: 'Gunakan hasil analisis untuk menyelenggarakan program remidial atau pengayaan materi kejuruan.',
    },
    {
      id: 'G8',
      title: '8. Mengekspor Rekap Nilai ke Excel (.xlsx)',
      icon: FileSpreadsheet,
      description: 'Mendownload daftar nilai resmi untuk arsip rapor sekolah.',
      steps: [
        'Di halaman Laporan Nilai, klik tombol "Export Excel (.xlsx)".',
        'File spreadsheet resmi akan terunduh otomatis, berisi NIS, NISN, Nama Siswa, Skor PG, Skor Esai, Nilai Akhir, dan Keterangan Tuntas.',
        'Format spreadsheet sudah terformat rapi dan siap dicetak atau diimpor ke aplikasi e-Rapor.',
      ],
      tip: 'Pastikan seluruh koreksi esai telah diselesaikan sebelum melakukan ekspor nilai akhir.',
    },
    {
      id: 'G9',
      title: '9. FAQ Guru Pengampu',
      icon: HelpCircle,
      description: 'Tanya jawab seputar penyusunan soal dan manajemen kelas.',
      steps: [
        'T: Apakah guru lain bisa mengubah soal buatan saya? J: Tidak, bank soal hanya dapat diubah oleh guru pembuatnya dan Administrator.',
        'T: Bisakah menduplikasi bank soal untuk tahun ajaran berikutnya? J: Ya, Anda dapat menduplikasi paket soal dengan 1 klik.',
        'T: Bagaimana jika siswa tidak sengaja keluar saat ujian? J: Jawaban siswa aman tersimpan di server. Siswa bisa login kembali melanjutkan sisa waktu.',
      ],
      tip: 'Hubungi tim kurikulum atau admin IT sekolah jika membutuhkan penyesuaian bobot kelulusan.',
    },
  ];

  // ==========================================
  // PANDUAN ADMIN LENGKAP (A - N)
  // ==========================================
  const adminGuides = [
    {
      id: 'A',
      title: 'A. Pengelolaan Hak Akses & Akun Pengguna',
      icon: Key,
      description: 'Manajemen akun Admin, Guru, dan Siswa berbasis peran (Role-Based Access Control).',
      steps: [
        'Administrator memegang hak akses tertinggi atas seluruh modul, data master, dan konfigurasi sistem.',
        'Data pengguna terintegrasi dengan tabel profiles dan auth.users.',
        'Untuk membuat atau mengedit akun pengguna, gunakan menu Master Guru atau Master Siswa.',
        'Administrator dapat melakukan reset kata sandi pengguna sewaktu-waktu jika terjadi kendala login.',
      ],
      tip: 'Pastikan kredensial admin disimpan dengan aman dan tidak dibagikan kepada pihak yang tidak berkepentingan.',
    },
    {
      id: 'B',
      title: 'B. Manajemen Master Data Guru & Penugasan Mapel',
      icon: Users,
      description: 'Menambah guru pengajar, nomor NIP/NUPTK, email, dan mata pelajaran yang diampu.',
      steps: [
        'Buka menu navigasi sidebar "Master Guru".',
        'Klik tombol "+ Tambah Guru", masukkan Nama Lengkap, NIP/NUPTK, Email, dan centang Mata Pelajaran yang diampu.',
        'Klik tombol "Simpan Guru". Akun guru akan langsung tercatat dan dapat login ke portal.',
        'Untuk mengubah data guru, klik tombol edit pada baris tabel guru terkait.',
      ],
      tip: 'Anda juga dapat melakukan import massal data guru melalui menu Import & Export Excel.',
    },
    {
      id: 'C',
      title: 'C. Manajemen Master Data Siswa & Rombel',
      icon: GraduationCap,
      description: 'Mendaftarkan siswa, NIS, NISN, penetapan kelas rombel, dan jurusan.',
      steps: [
        'Buka menu "Master Siswa" → klik "+ Tambah Siswa".',
        'Lengkapi Nama Siswa, NIS, NISN, pilih Rombel Kelas, dan Jurusan/Kompetensi Keahlian.',
        'Masukkan email siswa dan password awal pendaftaran.',
        'Siswa otomatis terhubung dengan jadwal ujian yang ditujukan untuk kelasnya.',
      ],
      tip: 'Gunakan filter kelas pada tabel siswa untuk memeriksa kelengkapan anggota rombongan belajar.',
    },
    {
      id: 'D',
      title: 'D. Manajemen Mata Pelajaran & Kurikulum',
      icon: BookMarked,
      description: 'Menata daftar mata pelajaran umum, muatan kewilayahan, dan kejuruan.',
      steps: [
        'Masuk ke menu "Master Mapel" → klik "+ Tambah Mapel".',
        'Tentukan Kode Mapel, Nama Mata Pelajaran, Kelompok (Umum / Kejuruan), dan KKM/Passing Grade.',
        'Simpan mapel untuk menghubungkannya ke bank soal dan jadwal ujian.',
      ],
      tip: 'Pastikan kode mapel unik dan mudah diidentifikasi oleh guru pengampu.',
    },
    {
      id: 'E',
      title: 'E. Manajemen Rombel Kelas & Tingkat',
      icon: Layers,
      description: 'Pengaturan pembagian rombongan belajar tingkat X, XI, dan XII SMKN 1 Songgom.',
      steps: [
        'Masuk ke menu "Master Kelas" → klik "+ Tambah Kelas".',
        'Tentukan Nama Kelas (misal: "X TJKT 1", "XI AKL 2"), Tingkat (10, 11, 12), dan Jurusan.',
        'Simpan kelas untuk mengelompokkan siswa secara otomatis.',
      ],
      tip: 'Pembaruan data kelas otomatis menyesuaikan relasi siswa pada database.',
    },
    {
      id: 'F',
      title: 'F. Manajemen Konsentrasi Keahlian / Jurusan',
      icon: Layers,
      description: 'Mengelola daftar kompetensi keahlian resmi di SMKN 1 Songgom.',
      steps: [
        'Masuk ke menu "Master Jurusan" → klik "+ Tambah Jurusan".',
        'Masukkan Kode Jurusan (TJKT, TKRO, AKL, DKV, MPLB) dan Nama Lengkap Kompetensi Keahlian.',
        'Data jurusan menjadi induk pengelompokan kelas dan mata pelajaran kejuruan.',
      ],
      tip: 'Pastikan kode jurusan konsisten dengan nomenklatur kurikulum SMK terbaru.',
    },
    {
      id: 'G',
      title: 'G. Pusat Import & Export Data Massal (Excel .xlsx)',
      icon: FileSpreadsheet,
      description: 'Mempercepat pendaftaran ratusan siswa dan guru sekaligus menggunakan template resmi.',
      steps: [
        'Masuk ke menu "Import & Export" pada sidebar admin.',
        'Unduh Template Excel resmi yang telah disediakan sistem.',
        'Isi data sesuai kolom header tanpa mengubah format template.',
        'Unggah file kembali ke sistem; sistem akan memvalidasi duplikasi NIS/Email sebelum menyimpan data.',
      ],
      tip: 'Hindari spasi tambahan pada awal atau akhir alamat email saat mengisi template Excel.',
    },
    {
      id: 'H',
      title: 'H. Checklist Kesiapan Produksi (Deployment Checklist)',
      icon: CheckCircle2,
      description: 'Verifikasi kesiapan menyeluruh sebelum ujian serentak diselenggarakan.',
      steps: [
        'Buka menu "Checklist Produksi".',
        'Periksa 12 indikator kesiapan: Verifikasi Skema Database, Pengujian RLS, Alokasi Bandwidth, Sinkronisasi Waktu Server, dan Akurasi Rekapitulasi.',
        'Pastikan seluruh indikator berstatus hijau (Siap) sebelum membuka ujian skala besar.',
      ],
      tip: 'Jalankan uji coba simulasi dengan 1 kelas percontohan sebelum pelaksanaan ujian utama.',
    },
  ];

  // Panduan Pengembang & Skrip SQL (Hanya Admin)
  const sqlSchemaSnippet = `-- SKEMA DATABASE POSTGRESQL TKA SMKN 1 SONGGOM
-- Dijalankan pada Supabase SQL Editor

-- 1. Profiles Pengguna
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'siswa')),
  nis TEXT UNIQUE,
  nisn TEXT,
  nip TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Master Jurusan & Kelas
CREATE TABLE IF NOT EXISTS public.majors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  grade_level INTEGER NOT NULL CHECK (grade_level IN (10, 11, 12)),
  major_id UUID REFERENCES public.majors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Master Siswa & Guru
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE RESTRICT,
  major_id UUID REFERENCES public.majors(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bank Soal & Butir Soal 4 Tipe
CREATE TABLE IF NOT EXISTS public.question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  kkm NUMERIC(5,2) DEFAULT 75.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES public.question_banks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('single_choice', 'multiple_choice', 'short_essay', 'matching')),
  question_text TEXT NOT NULL,
  image_url TEXT,
  options JSONB,
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  score_weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Pelaksanaan Ujian & Pengerjaan Siswa
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES public.question_banks(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  randomize_questions BOOLEAN DEFAULT TRUE,
  randomize_options BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,
  score NUMERIC(5,2) DEFAULT 0.00,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'graded')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  UNIQUE(exam_id, student_id)
);`;

  // Tentukan daftar panduan aktif berdasarkan role & tab
  let currentList = siswaGuides;
  let pageTitle = 'Panduan & Dokumentasi Portal TKA';
  let pageSubtitle = 'Petunjuk penggunaan sistem Tes Kemampuan Akademik SMKN 1 Songgom';
  let showTabs = false;

  if (role === 'siswa') {
    currentList = siswaGuides;
    pageTitle = 'Panduan & Dokumentasi Siswa (Peserta Ujian)';
    pageSubtitle = 'Petunjuk teknis pengerjaan ujian daring, tata tertib, cara menjawab 4 tipe soal, dan melihat hasil nilai.';
    showTabs = false;
  } else if (role === 'guru') {
    currentList = guruGuides;
    pageTitle = 'Panduan & Dokumentasi Guru Mata Pelajaran';
    pageSubtitle = 'Petunjuk penyusunan bank soal 4 tipe, pembuatan paket ujian, live monitoring kelas, dan penilaian hasil.';
    showTabs = false;
  } else if (role === 'admin') {
    pageTitle = 'Panduan & Dokumentasi Sistem TKA (Administrator)';
    pageSubtitle = 'Dokumentasi komplit mencakup panduan Siswa, Guru, Administrator Master Data, serta Arsitektur Database & Skrip SQL.';
    showTabs = true;
    if (adminTab === 'siswa') currentList = siswaGuides;
    else if (adminTab === 'guru') currentList = guruGuides;
    else if (adminTab === 'admin') currentList = adminGuides;
    else currentList = [];
  } else {
    // Publik / Belum Login
    currentList = [
      ...siswaGuides.slice(0, 5),
      {
        id: 'PUB1',
        title: 'Mengenal Format Tes Kemampuan Akademik (TKA)',
        icon: AwardIconWrapper,
        description: 'TKA dirancang untuk mengukur penguasaan kompetensi kejuruan dan kesiapan kerja lulusan SMK.',
        steps: [
          'Instrumen tes menggunakan 4 model soal modern: Pilihan Ganda Biasa, Pilihan Ganda Kompleks (Multi-Opsi), Esai Singkat, dan Menjodohkan.',
          'Sistem CBT berstandar industri dengan pengacakan soal dan penyimpanan autosave.',
          'Akun peserta dan pengawas dikelola secara terpusat oleh tim administrasi sekolah.',
        ],
        tip: 'Pastikan Anda telah menerima alamat email dan password resmi sebelum jadwal pelaksanaan ujian.',
      },
    ];
    pageTitle = 'Panduan & Informasi Portal TKA SMKN 1 Songgom';
    pageSubtitle = 'Pusat informasi dan petunjuk teknis pelaksanaan Tes Kemampuan Akademik berbasis komputer.';
    showTabs = false;
  }

  const filteredList = currentList.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.steps.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5 text-blue-300" />
            <span>
              {role ? `Dokumentasi Khusus: ${role.toUpperCase()}` : 'Informasi Portal TKA'}
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            {pageTitle}
          </h1>
          <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
            {pageSubtitle}
          </p>
        </div>
      </div>

      {/* Tab Navigasi Khusus Admin (Bisa Memilih Semua Kategori) */}
      {showTabs && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setAdminTab('admin')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              adminTab === 'admin'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Panduan Administrator</span>
          </button>

          <button
            onClick={() => setAdminTab('guru')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              adminTab === 'guru'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Panduan Guru ({guruGuides.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('siswa')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              adminTab === 'siswa'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Panduan Siswa ({siswaGuides.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('developer')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              adminTab === 'developer'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-blue-400" />
            <span>Database & Skrip SQL Supabase</span>
          </button>
        </div>
      )}

      {/* Bagian Pencarian (untuk tab panduan teks) */}
      {(!showTabs || adminTab !== 'developer') && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari topik atau langkah panduan..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white shadow-xs"
          />
        </div>
      )}

      {/* Render Daftar Panduan Interaktif */}
      {(!showTabs || adminTab !== 'developer') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredList.map((guide) => {
            const Icon = guide.icon;
            return (
              <div
                key={guide.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900">
                        {guide.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {guide.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Langkah Pelaksanaan:
                    </h4>
                    <ol className="text-xs text-slate-700 space-y-2 list-decimal pl-4 leading-relaxed">
                      {guide.steps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                {guide.tip && (
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Tips:</strong> {guide.tip}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Render Khusus Admin Tab: Database & Skrip SQL Supabase */}
      {showTabs && adminTab === 'developer' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span>Skrip SQL Schema Supabase (PostgreSQL)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Skema DDL lengkap mencakup tabel profil, master kelas, bank soal 4 tipe, dan lembar ujian.
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(sqlSchemaSnippet, 'sql')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                {copiedSnippet === 'sql' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Seluruh SQL</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-blue-300 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
              {sqlSchemaSnippet}
            </pre>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <span>Variabel Lingkungan Supabase (.env)</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Konfigurasi kredensial koneksi Supabase Anda pada file <code>.env</code> di root proyek:
            </p>
            <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper icon wrapper for public guide
function AwardIconWrapper(props: React.SVGProps<SVGSVGElement>) {
  return <Sparkles className="w-5 h-5 text-blue-600" />;
}
