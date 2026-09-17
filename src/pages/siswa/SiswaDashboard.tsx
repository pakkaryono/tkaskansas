import React from 'react';
import {
  FileQuestion,
  Clock,
  CheckCircle2,
  Award,
  Calendar,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  PlayCircle,
  History,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SiswaDashboardProps {
  onNavigate: (path: string) => void;
  onOpenGuide: () => void;
}

export const SiswaDashboard: React.FC<SiswaDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();

  const studentExamsAvailable = [
    {
      id: 'exam-001',
      title: 'TKA Kejuruan: Dasar Infrastruktur Jaringan',
      subject: 'Dasar-Dasar Kejuruan TJKT',
      date: '15 September 2026',
      timeWindow: '08:00 - 10:00 WIB',
      durationMinutes: 60,
      totalQuestions: 40,
      questionTypes: 'Pilihan Ganda, Kompleks & Menjodohkan',
      status: 'Tersedia Sekarang',
      isReadyToStart: true,
    },
    {
      id: 'exam-002',
      title: 'TKA Akademik: Literasi & Numerasi Terapan',
      subject: 'Matematika Terapan SMK',
      date: '16 September 2026',
      timeWindow: '08:00 - 09:30 WIB',
      durationMinutes: 90,
      totalQuestions: 35,
      questionTypes: 'Pilihan Ganda & Esai Singkat',
      status: 'Akan Datang',
      isReadyToStart: false,
    },
  ];

  const examHistory = [
    {
      title: 'TKA Simulasi 1: Bahasa Indonesia Vokasi',
      date: '10 September 2026',
      score: 92.5,
      correctCount: 37,
      wrongCount: 3,
      unanswered: 0,
      status: 'Selesai & Dinilai',
      gradeLabel: 'Sangat Baik',
    },
    {
      title: 'TKA Diagnostik: K3LH & Budaya Kerja Industri',
      date: '05 September 2026',
      score: 88.0,
      correctCount: 22,
      wrongCount: 3,
      unanswered: 0,
      status: 'Selesai & Dinilai',
      gradeLabel: 'Baik',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Student Identity Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/25 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-3">
              <GraduationCap className="w-4 h-4" />
              <span>Peserta Ujian TKA SMKN 1 Songgom</span>
            </div>

            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              {profile?.full_name || 'Ahmad Pratama'}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-blue-100">
              <span>NIS: <strong>{profile?.nis || '20241088'}</strong></span>
              <span>•</span>
              <span>NISN: <strong>{profile?.nisn || '0078129931'}</strong></span>
              <span>•</span>
              <span>Kelas: <strong>{profile?.class_name || 'XI TJKT 1'}</strong></span>
              <span>•</span>
              <span>Jurusan: <strong>{profile?.major_name || 'Teknik Jaringan Komputer'}</strong></span>
            </div>
          </div>

          {/* Quick Score Snapshot */}
          <div className="bg-white/10 p-4 rounded-xl border border-white/20 backdrop-blur-xs text-center shrink-0 min-w-[160px]">
            <span className="text-[11px] text-blue-200 uppercase font-bold tracking-wider block">
              Nilai Terakhir
            </span>
            <span className="text-3xl sm:text-4xl font-black text-white block mt-0.5">
              92.5
            </span>
            <span className="text-[11px] font-semibold text-emerald-300">
              Kategori: Sangat Baik
            </span>
          </div>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-blue-100 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Ujian Tersedia</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileQuestion className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">1</div>
          <p className="text-[11px] text-slate-500 mt-1">Siap dikerjakan hari ini</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Sedang Dikerjakan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">0</div>
          <p className="text-[11px] text-slate-500 mt-1">Tidak ada attempt aktif</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Telah Selesai</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">2</div>
          <p className="text-[11px] text-slate-500 mt-1">Hasil dapat dilihat</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-indigo-100 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Rata-Rata Nilai</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">90.2</div>
          <p className="text-[11px] text-slate-500 mt-1">Status: Tuntas di atas KKM</p>
        </div>
      </div>

      {/* Ujian Tersedia (Fitur Inti Siswa) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Ujian TKA Tersedia Untuk Anda</h3>
            <p className="text-xs text-slate-500">Sesuai kelas {profile?.class_name || 'XI TJKT 1'} dan jadwal aktif sekolah</p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Terkunci oleh RLS
          </span>
        </div>

        <div className="space-y-4">
          {studentExamsAvailable.map((exam) => (
            <div
              key={exam.id}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">{exam.title}</h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      exam.isReadyToStart
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {exam.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  Mata Pelajaran: <strong>{exam.subject}</strong> • {exam.totalQuestions} Soal ({exam.questionTypes})
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {exam.date} ({exam.timeWindow})
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Durasi: {exam.durationMinutes} Menit
                  </span>
                </div>
              </div>

              <div>
                {exam.isReadyToStart ? (
                  <button
                    onClick={() => onNavigate('/siswa/ujian')}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Mulai Kerjakan Ujian</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 text-slate-500 font-semibold text-xs cursor-not-allowed"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Belum Dibuka</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Riwayat Pengerjaan */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Riwayat Ujian Selesai</h3>
            <p className="text-xs text-slate-500">Hasil pengerjaan dan skor tes sebelumnya</p>
          </div>
          <button
            onClick={() => onNavigate('/siswa/laporan')}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua Laporan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Nama Ujian</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3 text-center">Benar / Salah</th>
                <th className="py-3 px-3 text-center">Nilai Akhir</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {examHistory.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-3 font-semibold text-slate-800">
                    {item.title}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 text-xs">
                    {item.date}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="text-emerald-700 font-bold">{item.correctCount}</span>
                    <span className="text-slate-400"> / </span>
                    <span className="text-rose-600 font-medium">{item.wrongCount}</span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg font-bold text-xs bg-blue-50 text-blue-700 border border-blue-100">
                      {item.score} ({item.gradeLabel})
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => onNavigate('/siswa/laporan')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Lihat Hasil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
