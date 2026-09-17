import React, { useState } from 'react';
import { X, Check, FileText, User, HelpCircle, MessageSquare, Award, AlertCircle } from 'lucide-react';
import { useExam } from '../../contexts/ExamContext';
import { useAuth } from '../../contexts/AuthContext';
import { ExamAttempt, QuestionResultDetail } from '../../types';

interface EssayGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: ExamAttempt | null;
  detail: QuestionResultDetail | null;
  studentName: string;
  studentNisn?: string;
  studentClass?: string;
  examTitle: string;
  onGradedSuccess?: () => void;
}

export const EssayGradingModal: React.FC<EssayGradingModalProps> = ({
  isOpen,
  onClose,
  attempt,
  detail,
  studentName,
  studentNisn,
  studentClass,
  examTitle,
  onGradedSuccess,
}) => {
  const { gradeEssayAnswer } = useExam();
  const { profile } = useAuth();

  const maxPoints = detail?.max_points || 20;
  const initialScore = detail?.essay_grading?.score ?? (detail?.earned_points || 0);
  const initialFeedback = detail?.essay_grading?.feedback ?? '';
  const initialGrader =
    detail?.essay_grading?.grader ||
    profile?.full_name ||
    'Guru Penguji SMKN 1 Songgom';

  const [score, setScore] = useState<number>(initialScore);
  const [feedback, setFeedback] = useState<string>(initialFeedback);
  const [grader, setGrader] = useState<string>(initialGrader);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !attempt || !detail) return null;

  const handleQuickPercent = (pct: number) => {
    const val = Math.round((pct / 100) * maxPoints * 10) / 10;
    setScore(val);
    setError(null);
  };

  const handleSaveGrading = async () => {
    if (score < 0 || score > maxPoints) {
      setError(`Nilai harus berada dalam rentang 0 sampai ${maxPoints} poin.`);
      return;
    }
    if (!grader.trim()) {
      setError('Nama penilai (grader) wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      await gradeEssayAnswer(attempt.id, detail.question_id, {
        score: Number(score),
        feedback: feedback.trim(),
        grader: grader.trim(),
      });
      setIsSubmitting(false);
      if (onGradedSuccess) onGradedSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Gagal menyimpan penilaian esai.');
    }
  };

  return (
    <div
      id="essay-grading-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Koreksi & Penilaian Jawaban Esai
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                  Bobot Max: {maxPoints} Poin
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">
                {examTitle} • Soal #{detail.order_num}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Info Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{studentName}</p>
                <p className="text-[11px] text-slate-500">
                  NISN: {studentNisn || '-'} • Kelas: {studentClass || '-'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400 block">Status Esai</span>
              {detail.essay_grading ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <Check className="w-3 h-3" /> Dinilai ({detail.essay_grading.score}/{maxPoints})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                  Menunggu Koreksi
                </span>
              )}
            </div>
          </div>

          {/* Pertanyaan Soal */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span>Pertanyaan Soal</span>
            </label>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-slate-800 leading-relaxed font-normal">
              {detail.question_text}
            </div>
          </div>

          {/* Jawaban Siswa */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
              <span>Jawaban Tertulis Siswa</span>
            </label>
            <div className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-200/60 text-slate-900 leading-relaxed whitespace-pre-wrap font-mono text-[11.5px] min-h-[70px]">
              {typeof detail.student_answer === 'string' && detail.student_answer.trim()
                ? detail.student_answer
                : <span className="text-slate-400 italic">Siswa tidak memberikan jawaban tertulis pada soal ini.</span>}
            </div>
          </div>

          {/* Rubrik / Kunci Jawaban Referensi jika ada */}
          {detail.explanation && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <span className="font-bold block mb-0.5">Rubrik & Kata Kunci Jawaban Guru:</span>
              {detail.explanation}
            </div>
          )}

          {/* Input Nilai & Cepat */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="essay-score-input" className="font-bold text-slate-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Skor Nilai Esai (0 - {maxPoints})</span>
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-500 mr-1">Preset:</span>
                {[0, 25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className="px-2 py-0.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded text-slate-700 font-semibold transition"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="essay-score-input"
                type="number"
                min="0"
                max={maxPoints}
                step="0.5"
                value={score}
                onChange={(e) => {
                  setScore(Number(e.target.value));
                  setError(null);
                }}
                className="w-28 px-3 py-2 bg-white border-2 border-indigo-200 focus:border-indigo-600 rounded-xl text-lg font-black text-indigo-700 text-center focus:outline-none"
              />
              <span className="text-slate-500 font-bold text-sm">/ {maxPoints} Poin Maksimal</span>
            </div>
          </div>

          {/* Feedback / Catatan Koreksi Guru */}
          <div className="space-y-1.5">
            <label htmlFor="essay-feedback-input" className="font-bold text-slate-700">
              Komentar & Catatan Evaluasi Guru
            </label>
            <textarea
              id="essay-feedback-input"
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Berikan catatan perbaikan, apresiasi argumen yang tepat, atau saran belajar..."
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Grader Name */}
          <div className="space-y-1.5">
            <label htmlFor="essay-grader-input" className="font-bold text-slate-700">
              Nama Guru Penguji / Grader
            </label>
            <input
              id="essay-grader-input"
              type="text"
              value={grader}
              onChange={(e) => setGrader(e.target.value)}
              placeholder="Contoh: Siti Aminah, S.Kom, Gr."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/50 transition"
          >
            Tutup
          </button>
          <button
            id="submit-essay-grade-btn"
            disabled={isSubmitting}
            onClick={handleSaveGrading}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Nilai & Perbarui Rapor'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
