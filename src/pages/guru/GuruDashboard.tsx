import React from 'react';
import {
  FileQuestion,
  Calendar,
  Users,
  Award,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  PlusCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface GuruDashboardProps {
  onNavigate: (path: string) => void;
  onOpenGuide: () => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();

  const teacherStats = [
    { label: 'Soal Buatan Saya', value: '68', sub: 'Dalam 4 mata uji', icon: FileQuestion, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Jadwal Ujian Aktif', value: '3', sub: 'Semester Ganjil 2026', icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'Siswa Mengerjakan', value: '142', sub: 'Dari 144 siswa terdaftar', icon: Users, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
    { label: 'Rata-Rata Nilai', value: '84.6', sub: 'Kategori: Baik', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Nilai Tertinggi', value: '98.0', sub: 'Ahmad P. (XI TJKT 1)', icon: ArrowUpRight, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100' },
    { label: 'Nilai Terendah', value: '64.0', sub: 'Perlu remedial (3 siswa)', icon: ArrowDownRight, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
  ];

  const questionTypesBreakdown = [
    { type: 'Pilihan Ganda Biasa (A-E)', count: 35, percentage: 51, color: 'bg-blue-500' },
    { type: 'Pilihan Ganda Kompleks (Multi-Opsi)', count: 18, percentage: 26, color: 'bg-purple-500' },
    { type: 'Esai Singkat (Periksa Manual)', count: 8, percentage: 12, color: 'bg-amber-500' },
    { type: 'Menjodohkan (Matching Pairs)', count: 7, percentage: 11, color: 'bg-teal-500' },
  ];

  const activeExams = [
    {
      title: 'TKA Kejuruan: Dasar Infrastruktur Jaringan',
      subject: 'Dasar-Dasar Kejuruan TJKT',
      targetClass: 'XI TJKT 1, XI TJKT 2',
      date: '15 September 2026',
      time: '08:00 - 10:00 WIB',
      duration: '60 Menit',
      completedCount: '68 / 72 Siswa',
      status: 'Sedang Berlangsung',
    },
    {
      title: 'TKA Kejuruan: Pemrograman Dasar & Web',
      subject: 'Pemrograman Web & Bergerak',
      targetClass: 'XI TJKT 1',
      date: '18 September 2026',
      time: '09:00 - 11:00 WIB',
      duration: '75 Menit',
      completedCount: '0 / 36 Siswa',
      status: 'Terjadwal',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white shadow-md">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Portal Guru Mata Pelajaran</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {profile?.full_name || 'Bapak/Ibu Guru'}
          </h2>
          <p className="mt-2 text-emerald-100 text-xs sm:text-sm leading-relaxed">
            NIP: {profile?.nip || '198803152014022003'} • Sesuai aturan Row Level Security (RLS) Supabase, Anda hanya dapat mengelola soal dan melihat laporan hasil ujian dari mata pelajaran yang Anda ampu.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {profile?.subjects_taught?.map((s, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-white/15 text-white text-xs font-medium border border-white/20">
                {s}
              </span>
            )) || (
              <span className="px-2.5 py-1 rounded-lg bg-white/15 text-white text-xs font-medium border border-white/20">
                Dasar-Dasar Kejuruan TJKT
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Guru 6 Stat Cards */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-4">Ringkasan Hasil Evaluasi Akademik</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {teacherStats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className={`p-4 rounded-2xl bg-white border ${item.border} shadow-xs`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-7 h-7 rounded-lg ${item.bg} ${item.color} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{item.value}</div>
                <div className="text-xs font-semibold text-slate-700 truncate mt-0.5">{item.label}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bank Soal Types & Jadwal Ujian Aktif */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bank Soal Breakdown */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Komposisi Bank Soal</h4>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">68 Soal</span>
          </div>
          <p className="text-xs text-slate-500 mb-5">Distribusi jenis instrumen soal pada bank soal Anda:</p>

          <div className="space-y-4">
            {questionTypesBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{item.type}</span>
                  <span className="font-bold text-slate-600">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('/guru/bank-soal')}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Kelola Bank Soal (Fase 3)</span>
            </button>
          </div>
        </div>

        {/* Ujian Yang Sedang/Akan Berlangsung */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">Jadwal Ujian Terkait</h4>
                <p className="text-xs text-slate-500">Pelaksanaan ujian TKA untuk kelas yang Anda ampu</p>
              </div>
              <button
                onClick={() => onNavigate('/guru/laporan')}
                className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <span>Lihat Hasil Siswa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {activeExams.map((exam, index) => (
                <div key={index} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-900">{exam.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      exam.status === 'Sedang Berlangsung' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {exam.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 mb-2">
                    <div><span className="text-slate-400">Mapel:</span> {exam.subject}</div>
                    <div><span className="text-slate-400">Kelas:</span> {exam.targetClass}</div>
                    <div><span className="text-slate-400">Durasi:</span> {exam.duration}</div>
                    <div><span className="text-slate-400">Progres:</span> {exam.completedCount}</div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jadwal: {exam.date} • {exam.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>Fitur Pemeriksaan Esai Manual:</strong> Guru dapat memberikan nilai esai singkat, melakukan regrading, dan memeriksa pasangan matching yang dibuat siswa pada menu Penilaian & Esai.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
