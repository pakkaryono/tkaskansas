import React from 'react';
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  GraduationCap,
  Users,
  Shuffle,
  FileQuestion,
  CheckCircle,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
  Copy,
  Edit,
  Trash2,
} from 'lucide-react';
import { Exam, ExamStatus } from '../../types';
import { useExam } from '../../contexts/ExamContext';

interface ExamDetailModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (exam: Exam) => void;
  onDuplicate?: (exam: Exam) => void;
  onDelete?: (exam: Exam) => void;
  onOpenTestSimulator?: (exam: Exam) => void;
}

export const ExamDetailModal: React.FC<ExamDetailModalProps> = ({
  exam,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onOpenTestSimulator,
}) => {
  const { getExamQuestions, getDynamicStatus, currentServerTime } = useExam();

  if (!isOpen || !exam) return null;

  const questions = getExamQuestions(exam.id);
  const dynamicStatus = getDynamicStatus(exam);

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            Sedang Berlangsung (Open)
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3.5 h-3.5" />
            Terjadwal (Scheduled)
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
            <Lock className="w-3.5 h-3.5" />
            Selesai / Ditutup (Closed)
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Draf
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
            Diarsipkan
          </span>
        );
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{exam.title}</h2>
                {getStatusBadge(dynamicStatus)}
              </div>
              <p className="text-xs text-slate-500">
                {exam.subject?.name} ({exam.subject?.code}) • Kelas {exam.grade} • Diampu oleh {exam.teacher?.full_name || 'Guru'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">Durasi Pengerjaan</span>
              <span className="text-lg font-black text-slate-900">{exam.duration_minutes}</span>
              <span className="text-xs text-slate-500 ml-1">Menit</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">Jumlah Butir Soal</span>
              <span className="text-lg font-black text-purple-700">{questions.length || exam.total_questions}</span>
              <span className="text-xs text-slate-500 ml-1">Snapshot</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">Acak Soal & Opsi</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${exam.randomize_questions ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                  Soal: {exam.randomize_questions ? 'ON' : 'OFF'}
                </span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${exam.randomize_options ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                  Opsi: {exam.randomize_options ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">KKM / Batas Lulus</span>
              <span className="text-lg font-black text-emerald-700">{exam.pass_score}</span>
              <span className="text-xs text-slate-500 ml-1">/ 100</span>
            </div>
          </div>

          {/* Window Jadwal */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Window Waktu Akses Ujian</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Waktu Buka (start_at):</span>
                <span className="font-bold text-slate-900">{formatDateTime(exam.start_at)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Waktu Tutup (end_at):</span>
                <span className="font-bold text-slate-900">{formatDateTime(exam.end_at)}</span>
              </div>
            </div>
            <div className="text-[11px] text-blue-800 bg-white/70 p-2.5 rounded-lg border border-blue-100 mt-2">
              <b>Logika Deadline Dinamis:</b> Jika siswa mulai pada 08:30 dengan durasi 60 menit, deadline adalah 09:30. Namun jika siswa baru mulai pada 09:40, durasi otomatis terpotong pada 10:00 (hanya tersisa 20 menit) karena tidak boleh melebihi batas akhir window.
            </div>
          </div>

          {/* Rombel Belajar Sasaran */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Target Rombongan Belajar (Rombel) Peserta:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {exam.assigned_classes && exam.assigned_classes.length > 0 ? (
                exam.assigned_classes.map((cls) => (
                  <span
                    key={cls.id}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {cls.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">
                  Berlaku untuk seluruh siswa Tingkat Kelas {exam.grade}
                </span>
              )}
            </div>
          </div>

          {/* Instruksi Ujian */}
          {exam.instructions && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-700 block">Tata Tertib & Instruksi:</span>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                {exam.instructions}
              </p>
            </div>
          )}

          {/* Daftar Butir Soal Snapshot */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <FileQuestion className="w-4 h-4 text-purple-600" />
                <span>Daftar Butir Soal Snapshot ({questions.length} Butir)</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Data snapshot diisolasi dari perubahan bank soal
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Belum ada snapshot butir soal tersimpan.
                </div>
              ) : (
                questions.map((eq) => (
                  <div key={eq.id} className="p-3 hover:bg-slate-50 transition-colors text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px]">
                          {eq.order_num}
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {eq.snapshot?.code || 'SOAL'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600">
                          {eq.snapshot?.question_type}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {eq.points} Poin
                      </span>
                    </div>
                    <div
                      className="text-slate-600 text-[11px] line-clamp-2 pl-7"
                      dangerouslySetInnerHTML={{ __html: eq.snapshot?.question_text || '' }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onOpenTestSimulator && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTestSimulator(exam);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Uji Skenario / Test Runner</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDuplicate(exam);
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplikasi</span>
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(exam);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Ubah</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Hapus ujian "${exam.title}"?`)) {
                    onClose();
                    onDelete(exam);
                  }
                }}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Hapus Ujian"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
