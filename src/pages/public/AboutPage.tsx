import React from 'react';
import {
  HelpCircle,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';

interface AboutPageProps {
  onNavigate: (path: string) => void;
  onOpenGuide: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate, onOpenGuide }) => {
  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb / Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>

          <button
            onClick={() => onNavigate('/login')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            <span>Login Siswa / Guru</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Header Title */}
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-xs mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-4">
            <GraduationCap className="w-4 h-4" />
            <span>Informasi & Panduan Lengkap</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
            Tentang Tes Kemampuan Akademik (TKA) SMKN 1 Songgom
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
            Panduan komprehensif mengenai latar belakang, sasaran penilaian, format soal, dan mekanisme pengerjaan tes TKA bagi seluruh civitas akademika SMKN 1 Songgom.
          </p>
        </div>

        {/* Section 1: Apa itu TKA & Tujuan */}
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                1
              </span>
              <span>Apa itu TKA SMKN 1 Songgom?</span>
            </h2>
            <div className="text-slate-600 text-sm leading-relaxed space-y-3">
              <p>
                <strong>Tes Kemampuan Akademik (TKA) SMKN 1 Songgom</strong> adalah instrumen asesmen terstandarisasi yang dirancang untuk mengevaluasi pemahaman konsep dasar akademik (Matematika, Bahasa Indonesia, Bahasa Inggris) dan kompetensi kejuruan inti pada jenjang SMK Negeri 1 Songgom.
              </p>
              <p>
                TKA dirancang untuk melengkapi ujian praktik kejuruan sehingga lulusan SMK memiliki keseimbangan antara keterampilan teknis (<em>hard skills</em>) dan ketajaman logika berpikir analitis (<em>cognitive mastery</em>).
              </p>
            </div>
          </div>

          {/* Section 2: Sistem Penilaian */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                2
              </span>
              <span>Sistem Penilaian & Kalkulasi Skor</span>
            </h2>
            <div className="text-slate-600 text-sm leading-relaxed space-y-3">
              <p>
                Sistem penilaian TKA menggunakan bobot adaptif berbasis relasi database PostgreSQL:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>
                  <strong>Pilihan Ganda Biasa:</strong> Jawaban tepat otomatis mendapatkan bobot penuh (100%), salah bernilai 0.
                </li>
                <li>
                  <strong>Pilihan Ganda Kompleks:</strong> Menggunakan validasi <em>exact match</em> atau partial scoring terkonfigurasi.
                </li>
                <li>
                  <strong>Esai Singkat:</strong> Sistem menyediakan kata kunci referensi dan fitur grading manual untuk Guru Mata Pelajaran.
                </li>
                <li>
                  <strong>Menjodohkan:</strong> Skor dihitung secara proporsional sesuai jumlah pasangan premis-jawaban yang tepat.
                </li>
              </ul>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 mt-3">
                Rumus Nilai Akhir: (Total Skor Diperoleh / Total Skor Maksimal Soal) × 100
              </div>
            </div>
          </div>

          {/* Section 3: Ketentuan Pengerjaan & Waktu */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
                3
              </span>
              <span>Ketentuan & Keamanan Ujian</span>
            </h2>
            <div className="text-slate-600 text-sm leading-relaxed space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm mb-1">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>Timer Server-Side</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Waktu ujian dihitung dari server. Me-refresh halaman atau menutup tab tidak menambah waktu pengerjaan.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Penyimpanan Otomatis (Autosave)</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Setiap opsi yang dipilih siswa otomatis tersimpan di latar belakang tanpa risiko kehilangan data.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Laporan Hasil */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                4
              </span>
              <span>Transparansi Laporan Hasil</span>
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Setelah waktu ujian selesai atau siswa mengumpulkan jawaban, hasil ujian langsung tersimpan. Admin dan Guru dapat memantau rekapan nilai, distribusi hasil per kelas, dan melakukan ekspor laporan ke format Excel (.xlsx).
            </p>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div>
            <h3 className="text-lg sm:text-xl font-bold">Siap Mengikuti Tes TKA?</h3>
            <p className="text-xs sm:text-sm text-blue-100 mt-1">
              Gunakan akun yang telah terdaftar untuk masuk ke dashboard siswa atau guru.
            </p>
          </div>
          <button
            onClick={() => onNavigate('/login')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 font-bold text-xs sm:text-sm shadow hover:bg-blue-50 transition-colors shrink-0"
          >
            <span>Masuk ke Halaman Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
