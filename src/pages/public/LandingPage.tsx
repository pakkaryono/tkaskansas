import React from 'react';
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ListChecks,
  FileText,
  GitCompare,
  Clock,
  Award,
  ShieldCheck,
  ChevronRight,
  Database,
  Users,
  BarChart,
  School
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  onOpenGuide: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenGuide }) => {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 bg-gradient-to-b from-blue-900 via-indigo-900 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs sm:text-sm font-medium mb-6">
              <School className="w-4 h-4" />
              <span>Standar Evaluasi Mutu Vokasi • SMKN 1 Songgom</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight sm:leading-tight mb-6">
              Tes Kemampuan Akademik{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-200">
                (TKA) SMKN 1 SONGGOM
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed font-normal">
              Platform evaluasi akademik dan kejuruan berbasis web untuk mengukur kompetensi literasi, numerasi, dan keahlian spesifik peserta didik SMKN 1 Songgom secara objektif, transparan, dan terstandarisasi.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
              <button
                onClick={() => onNavigate('/login')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Masuk ke Portal Ujian</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('/tentang')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-sm sm:text-base backdrop-blur-xs transition-all"
              >
                <span>Tentang TKA</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tujuan TKA */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Tujuan Penyelenggaraan TKA
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Mewujudkan tolok ukur kesiapan siswa SMK menghadapi dunia industri dan jenjang profesional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">1. Pemetaan Kompetensi</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Mengetahui capaian belajar siswa secara merata pada mata pelajaran umum dan dasar kejuruan sesuai kurikulum nasional.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <BarChart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">2. Standarisasi Mutu Sekolah</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Memberikan data analitik terukur bagi manajemen sekolah dan guru untuk merancang program perbaikan pengajaran secara presisi.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">3. Akurasi & Integritas Tinggi</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Pelaksanaan ujian berbasis komputer dengan keamanan Supabase Row Level Security, timer server, dan autosave otomatis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Tipe Soal */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              Format Penilaian Modern
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
              Mendukung 4 Tipe Soal TKA SMK
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Variasi soal dirancang komprehensif menguji daya analisis, logika, dan pemahaman teknis siswa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1">Tipe 1: Pilihan Ganda Biasa</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Satu jawaban benar dengan 5 opsi (A, B, C, D, E). Cocok untuk konsep dasar dan penalaran langsung.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 py-1 px-2.5 rounded-md inline-block self-start">
                Otomatis Ternilai
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                  <ListChecks className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1">Tipe 2: Pilihan Ganda Kompleks</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Siswa dapat memilih lebih dari satu jawaban benar. Menguji kedalaman analisis dan ketelitian.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-purple-700 bg-purple-50 py-1 px-2.5 rounded-md inline-block self-start">
                Multi-Opsi Configurable
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1">Tipe 3: Esai Singkat</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Pertanyaan terbuka dengan kata kunci acuan. Mendukung pemeriksaan dan scoring manual oleh guru.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 py-1 px-2.5 rounded-md inline-block self-start">
                Penilaian Guru & Keyword
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                  <GitCompare className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1">Tipe 4: Menjodohkan</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Memasangkan item premis di kolom kiri dengan jawaban yang sesuai di kolom kanan secara interaktif.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-teal-700 bg-teal-50 py-1 px-2.5 rounded-md inline-block self-start">
                Matching Interaktif
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cara Mengikuti TKA */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Cara Mengikuti Tes TKA
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Langkah mudah bagi siswa SMK untuk melaksanakan tes secara mandiri atau terjadwal di sekolah.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                1
              </div>
              <h4 className="font-bold text-slate-900 mb-1">Dapatkan Akun</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Akun siswa dibuat oleh Admin/Guru sekolah menggunakan NIS/Email resmi sekolah.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                2
              </div>
              <h4 className="font-bold text-slate-900 mb-1">Login ke Aplikasi</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Masuk melalui menu login menggunakan username/email dan password yang telah diberikan.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                3
              </div>
              <h4 className="font-bold text-slate-900 mb-1">Pilih Jadwal Ujian</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Buka menu Bank Soal/Ujian, baca instruksi pengerjaan, dan klik tombol "Mulai Ujian".
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                4
              </div>
              <h4 className="font-bold text-slate-900 mb-1">Kerjakan & Lihat Nilai</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Jawaban tersimpan otomatis. Selesai mengerjakan, skor langsung terhitung dan tersimpan di laporan.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => onNavigate('/login')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all"
            >
              <span>Mulai Sekarang / Masuk Akun</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-sm">TKA SMKN 1 SONGGOM</span>
            <span>• Sistem Tes Kemampuan Akademik Kejuruan</span>
          </div>
          <div>
            Backend & Keamanan didukung oleh <strong className="text-slate-200">Supabase (PostgreSQL & RLS)</strong>
          </div>
        </div>
      </footer>
    </div>
  );
};
