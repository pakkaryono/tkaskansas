import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  AlertCircle,
  FileEdit,
  Check,
  Calendar,
  HelpCircle,
  Printer,
  BookOpen,
} from 'lucide-react';
import { useExam } from '../../contexts/ExamContext';
import { ExamAttempt, QuestionResultDetail } from '../../types';
import { EssayGradingModal } from './EssayGradingModal';

interface StudentResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: ExamAttempt | null;
  studentName: string;
  studentNisn?: string;
  studentClass?: string;
  examTitle: string;
  canGradeEssay?: boolean; // True for Guru & Admin
}

export const StudentResultDetailModal: React.FC<StudentResultDetailModalProps> = ({
  isOpen,
  onClose,
  attempt,
  studentName,
  studentNisn,
  studentClass,
  examTitle,
  canGradeEssay = true,
}) => {
  const { getAttemptResultSummary, exams } = useExam();

  const [selectedEssayDetail, setSelectedEssayDetail] = useState<QuestionResultDetail | null>(null);
  const [isEssayModalOpen, setIsEssayModalOpen] = useState(false);

  if (!isOpen || !attempt) return null;

  const currentExam = exams.find((e) => e.id === attempt.exam_id);
  const canSeeExplanation = canGradeEssay || currentExam?.show_explanation !== false;

  const summary = getAttemptResultSummary(attempt.id);
  if (!summary) return null;

  const openEssayGrading = (detail: QuestionResultDetail) => {
    setSelectedEssayDetail(detail);
    setIsEssayModalOpen(true);
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <>
      <div
        id="student-result-detail-modal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
          {/* Modal Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Lembar Hasil Ujian
                </span>
                <span className="text-xs text-slate-400 font-medium">•</span>
                <span className="text-xs text-slate-600 font-semibold">{examTitle}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {studentName}{' '}
                <span className="text-sm font-normal text-slate-500">
                  ({studentClass || '-'} • NISN: {studentNisn || '-'})
                </span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* Scorecard Hero */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Nilai Besar */}
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-3xl font-black tracking-tight text-white">
                      {summary.nilai}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-200 mt-0.5">
                      Nilai Akhir
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${
                          summary.kategori_nilai.color || 'bg-indigo-600 text-white border-transparent'
                        }`}
                      >
                        Predikat {summary.kategori_nilai.grade_code} • {summary.kategori_nilai.label}
                      </span>
                      {summary.pending_essay > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 animate-pulse">
                          {summary.pending_essay} Esai Belum Dinilai
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      Total Poin: <strong className="text-white font-bold">{summary.skor}</strong> dari{' '}
                      <strong className="text-white font-bold">{summary.maximum_score}</strong> Poin Maksimal
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Durasi Pengerjaan: <span className="text-slate-200 font-semibold">{summary.durasi_pengerjaan}</span>
                    </p>
                  </div>
                </div>

                {/* Ringkasan Butir Soal */}
                <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center min-w-[72px]">
                    <span className="block text-lg font-bold text-white">{summary.jumlah_soal}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Total Soal</span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-3 text-center min-w-[72px]">
                    <span className="block text-lg font-bold text-emerald-400">{summary.benar}</span>
                    <span className="text-[10px] text-emerald-300 font-semibold">Benar</span>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-400/20 rounded-xl p-3 text-center min-w-[72px]">
                    <span className="block text-lg font-bold text-rose-400">{summary.salah}</span>
                    <span className="text-[10px] text-rose-300 font-semibold">Salah</span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-3 text-center min-w-[72px]">
                    <span className="block text-lg font-bold text-amber-400">{summary.kosong}</span>
                    <span className="text-[10px] text-amber-300 font-semibold">Kosong</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timing timestamps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Waktu Mulai Pengerjaan</span>
                  <span className="text-slate-800 font-bold">{formatDateTime(summary.waktu_mulai)}</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Waktu Selesai / Disubmit</span>
                  <span className="text-slate-800 font-bold">{formatDateTime(summary.waktu_selesai)}</span>
                </div>
              </div>
            </div>

            {/* List Detail Per Butir Soal */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                <span>Rincian Hasil Evaluasi Per Butir Soal</span>
                <span className="text-xs text-slate-400 font-normal">
                  {summary.question_details.length} Butir Soal Teruji
                </span>
              </h3>

              <div className="space-y-3">
                {summary.question_details.map((qd) => {
                  return (
                    <div
                      key={qd.question_id}
                      className={`border rounded-xl p-4 transition ${
                        qd.status === 'correct'
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : qd.status === 'partial'
                          ? 'border-amber-200 bg-amber-50/20'
                          : qd.status === 'pending_grading'
                          ? 'border-purple-200 bg-purple-50/20'
                          : qd.status === 'unanswered'
                          ? 'border-slate-200 bg-slate-50/30'
                          : 'border-rose-200 bg-rose-50/20'
                      }`}
                    >
                      {/* Item Top Bar */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            #{qd.order_num}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                            {qd.question_type === 'single_choice' && 'PG Biasa'}
                            {qd.question_type === 'complex_choice' && 'PG Kompleks'}
                            {qd.question_type === 'matching' && 'Menjodohkan'}
                            {qd.question_type === 'essay' && 'Esai'}
                          </span>
                          {qd.is_canceled && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                              Dianulir
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {qd.status === 'correct' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Benar
                            </span>
                          )}
                          {qd.status === 'partial' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                              <Award className="w-3.5 h-3.5" /> Sebagian
                            </span>
                          )}
                          {qd.status === 'incorrect' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> Salah
                            </span>
                          )}
                          {qd.status === 'unanswered' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                              Kosong
                            </span>
                          )}
                          {qd.status === 'pending_grading' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full animate-pulse">
                              <Clock className="w-3.5 h-3.5" /> Menunggu Koreksi
                            </span>
                          )}

                          <span className="font-extrabold text-slate-800 text-xs ml-1">
                            {qd.earned_points} / {qd.max_points} Poin
                          </span>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-slate-800 font-medium mb-3 leading-relaxed">
                        {qd.question_text}
                      </p>

                      {/* Detail Jawaban Siswa & Kunci */}
                      <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 space-y-2 text-[11px]">
                        {/* Student Answer */}
                        <div>
                          <span className="font-bold text-slate-500 block mb-0.5">
                            Jawaban Siswa:
                          </span>
                          {qd.question_type === 'essay' ? (
                            <p className="text-slate-800 whitespace-pre-wrap font-mono text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                              {typeof qd.student_answer === 'string' && qd.student_answer.trim()
                                ? qd.student_answer
                                : '(Tidak ada jawaban)'}
                            </p>
                          ) : qd.question_type === 'matching' ? (
                            <div className="space-y-1">
                              {qd.matching_detail && (
                                <p className="text-indigo-700 font-bold mb-1">
                                  Pasangan Benar: {qd.matching_detail.correct_pairs} dari{' '}
                                  {qd.matching_detail.total_pairs} Pasangan ({qd.earned_points} Poin)
                                </p>
                              )}
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 font-mono text-[10.5px]">
                                {typeof qd.student_answer === 'object' && qd.student_answer !== null
                                  ? JSON.stringify(qd.student_answer, null, 2)
                                  : '(Belum dijodohkan)'}
                              </div>
                            </div>
                          ) : qd.question_type === 'complex_choice' ? (
                            <p className="font-semibold text-slate-800">
                              {Array.isArray(qd.student_answer)
                                ? `Pilihan: [${qd.student_answer.join(', ')}]`
                                : '(Tidak menjawab)'}
                            </p>
                          ) : (
                            <p className="font-semibold text-slate-800">
                              {qd.student_answer ? `Pilihan: ${qd.student_answer}` : '(Tidak menjawab)'}
                            </p>
                          )}
                        </div>

                        {/* Kunci Jawaban Referensi (Guru / Admin) */}
                        {canGradeEssay && qd.correct_answer_display && (
                          <div className="border-t border-slate-100 pt-2">
                            <span className="font-bold text-emerald-700 block mb-0.5">
                              Kunci Jawaban Resmi / Rubrik:
                            </span>
                            <div className="text-slate-700">
                              {Array.isArray(qd.correct_answer_display)
                                ? qd.correct_answer_display.join(', ')
                                : qd.correct_answer_display}
                            </div>
                          </div>
                        )}

                        {/* Pembahasan Soal (Berdasarkan izin ujian jika siswa) */}
                        {canSeeExplanation && qd.explanation ? (
                          <div className="border-t border-slate-100 pt-2.5 mt-2 bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs mb-1">
                              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                              <span>Pembahasan & Analisis Soal:</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed text-xs font-normal">
                              {qd.explanation}
                            </p>
                          </div>
                        ) : (
                          !canGradeEssay && (
                            <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 italic">
                              Pembahasan soal ditutup oleh penguji untuk sesi ujian ini.
                            </div>
                          )
                        )}

                        {/* Catatan Koreksi Esai Guru jika ada */}
                        {qd.essay_grading && (
                          <div className="border-t border-slate-100 pt-2 bg-purple-50/50 p-2 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-purple-900">
                                Evaluasi Guru ({qd.essay_grading.grader}):
                              </span>
                              <span className="text-purple-700 font-extrabold">
                                Skor: {qd.essay_grading.score} / {qd.max_points} Poin
                              </span>
                            </div>
                            <p className="text-slate-700 italic">
                              "{qd.essay_grading.feedback || 'Tidak ada komentar khusus.'}"
                            </p>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Dinilai pada: {formatDateTime(qd.essay_grading.graded_at)}
                            </span>
                          </div>
                        )}

                        {/* Quick action button for essay grading */}
                        {qd.question_type === 'essay' && canGradeEssay && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => openEssayGrading(qd)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                              <span>{qd.essay_grading ? 'Ubah Nilai Esai' : 'Beri Nilai Esai'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              ID Attempt: <code className="font-mono text-[10px] text-slate-600">{attempt.id}</code>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Ini</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-sm transition"
              >
                Tutup Lembar Hasil
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Essay Grading Modal */}
      {isEssayModalOpen && selectedEssayDetail && (
        <EssayGradingModal
          isOpen={isEssayModalOpen}
          onClose={() => setIsEssayModalOpen(false)}
          attempt={attempt}
          detail={selectedEssayDetail}
          studentName={studentName}
          studentNisn={studentNisn}
          studentClass={studentClass}
          examTitle={examTitle}
        />
      )}
    </>
  );
};
