import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Eye,
  Calendar,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useExam } from '../../contexts/ExamContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ExamAttempt } from '../../types';
import { StudentResultDetailModal } from '../../components/grading/StudentResultDetailModal';

export const HasilNilaiSiswaPage: React.FC = () => {
  const { exams, examAttempts, getAttemptResultSummary } = useExam();
  const { subjects, students } = useMasterData();
  const { profile } = useAuth();

  // Current logged in student
  const currentStudent = useMemo(() => {
    return students.find((s) => s.email === profile?.email) || students[0];
  }, [students, profile]);

  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Student's completed attempts
  const myCompletedAttempts = useMemo(() => {
    if (!currentStudent) return [];
    return examAttempts
      .filter(
        (a) =>
          a.student_id === currentStudent.id &&
          (a.status === 'submitted' || a.status === 'expired')
      )
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [examAttempts, currentStudent]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Hasil & Nilai Ujian
            </span>
            <span className="text-xs text-slate-400 font-medium">•</span>
            <span className="text-xs text-slate-500 font-medium">SMKN 1 Songgom</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Transkrip & Lembar Hasil Ujian Saya
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lihat perolehan nilai, rincian skor benar/salah, serta catatan evaluasi dari guru penguji.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
            {currentStudent?.name?.charAt(0) || 'S'}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-xs">{currentStudent?.name}</p>
            <p className="text-[11px] text-slate-400 font-mono">NISN: {currentStudent?.nisn || '-'}</p>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
        <span className="leading-relaxed">
          <strong>Perlindungan Integritas Nilai:</strong> Nilai dihitung secara terpusat oleh server/grading engine.
          Koreksi butir esai dilakukan langsung oleh guru pengampu dan diperbarui otomatis pada lembar hasil ini.
        </span>
      </div>

      {/* List Attempts */}
      {myCompletedAttempts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <Award className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">Belum Ada Hasil Ujian</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Anda belum menyelesaikan ujian apapun atau ujian Anda masih dalam status pengerjaan (In Progress).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myCompletedAttempts.map((att) => {
            const summary = getAttemptResultSummary(att.id);
            const exam = exams.find((e) => e.id === att.exam_id);
            const subject = subjects.find((s) => s.id === exam?.subject_id);

            const isPendingEssay = (summary?.pending_essay || 0) > 0;

            return (
              <div
                key={att.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  {/* Top Subject & Exam Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {subject?.name || 'Mata Pelajaran'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {summary?.durasi_pengerjaan || '-'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1">{exam?.title || 'Ujian'}</h3>

                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-4">
                    <Calendar className="w-3.5 h-3.5" />
                    Selesai:{' '}
                    {att.end_time ? new Date(att.end_time).toLocaleString('id-ID') : '-'}
                  </p>

                  {/* Score Box */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Nilai Akhir
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span
                          className={`text-3xl font-black ${
                            (summary?.nilai || 0) >= 75 ? 'text-indigo-600' : 'text-rose-600'
                          }`}
                        >
                          {summary?.nilai ?? 0}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">/ 100</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {summary?.kategori_nilai && (
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-black uppercase border shadow-sm ${
                            summary.kategori_nilai.color || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Predikat {summary.kategori_nilai.grade_code} • {summary.kategori_nilai.label}
                        </span>
                      )}
                      <p className="text-[10.5px] text-slate-500 mt-1 font-medium">
                        Total: {summary?.skor} dari {summary?.maximum_score} Poin
                      </p>
                    </div>
                  </div>

                  {/* B/S/K Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                      <span className="font-black text-emerald-700 block">{summary?.benar}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Benar</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-2">
                      <span className="font-black text-rose-700 block">{summary?.salah}</span>
                      <span className="text-[10px] text-rose-600 font-semibold">Salah</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
                      <span className="font-black text-amber-700 block">{summary?.kosong}</span>
                      <span className="text-[10px] text-amber-600 font-semibold">Kosong</span>
                    </div>
                  </div>

                  {/* Pending Notice if any */}
                  {isPendingEssay && (
                    <div className="mt-3 p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-[11px] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-600 shrink-0 animate-pulse" />
                      <span>
                        Terdapat <strong>{summary?.pending_essay} soal esai</strong> yang sedang menunggu koreksi guru.
                        Nilai akhir dapat bertambah setelah dinilai.
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Status:{' '}
                    <strong className="text-slate-700">
                      {isPendingEssay ? 'Sebagian Dinilai' : 'Nilai Selesai'}
                    </strong>
                  </span>

                  <button
                    onClick={() => {
                      setSelectedAttempt(att);
                      setIsDetailModalOpen(true);
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Rincian Jawaban</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Result Detail Modal for Student (Read-Only, canGradeEssay = false) */}
      {isDetailModalOpen && selectedAttempt && (
        <StudentResultDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          attempt={selectedAttempt}
          studentName={currentStudent?.name || 'Siswa'}
          studentNisn={currentStudent?.nisn}
          examTitle={
            exams.find((e) => e.id === selectedAttempt.exam_id)?.title || 'Ujian'
          }
          canGradeEssay={false}
        />
      )}
    </div>
  );
};
