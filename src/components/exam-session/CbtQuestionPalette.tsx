import React from 'react';
import { StudentQuestionItem } from '../../types';
import { Check, HelpCircle, AlertCircle, X } from 'lucide-react';

interface CbtQuestionPaletteProps {
  questions: StudentQuestionItem[];
  currentIndex: number;
  answers: Record<string, any>;
  doubtfulQuestionIds: string[];
  onSelectIndex: (index: number) => void;
  onCloseMobile?: () => void;
}

export const CbtQuestionPalette: React.FC<CbtQuestionPaletteProps> = ({
  questions,
  currentIndex,
  answers,
  doubtfulQuestionIds,
  onSelectIndex,
  onCloseMobile,
}) => {
  // Helper check if question has answer
  const isQuestionAnswered = (question: StudentQuestionItem): boolean => {
    const ans = answers[question.id];
    if (ans === undefined || ans === null) return false;

    if (question.question_type === 'single_choice') {
      return typeof ans === 'string' && ans.trim().length > 0;
    }
    if (question.question_type === 'complex_choice') {
      return Array.isArray(ans) && ans.length > 0;
    }
    if (question.question_type === 'essay') {
      return typeof ans === 'string' && ans.trim().length > 0;
    }
    if (question.question_type === 'matching') {
      return typeof ans === 'object' && Object.keys(ans).length > 0;
    }
    return false;
  };

  const answeredCount = questions.filter(isQuestionAnswered).length;
  const doubtfulCount = doubtfulQuestionIds.length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Palette */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">Daftar Nomor Soal</h3>
          <p className="text-xs text-slate-500">Pilih nomor untuk berpindah soal</p>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200"
            aria-label="Tutup Palet Soal"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Ringkasan Status */}
      <div className="p-3 border-b border-slate-100 grid grid-cols-3 gap-2 bg-slate-50/40 text-center text-xs">
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
          <div className="font-bold text-sm sm:text-base text-emerald-700">{answeredCount}</div>
          <div className="text-[11px] font-medium">Terjawab</div>
        </div>
        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <div className="font-bold text-sm sm:text-base text-amber-700">{doubtfulCount}</div>
          <div className="text-[11px] font-medium">Ragu-ragu</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
          <div className="font-bold text-sm sm:text-base text-slate-700">{unansweredCount}</div>
          <div className="text-[11px] font-medium">Belum</div>
        </div>
      </div>

      {/* Grid Nomor Soal */}
      <div className="flex-1 p-4 overflow-y-auto max-h-[60vh] lg:max-h-none">
        <div className="grid grid-cols-5 gap-2.5">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = isQuestionAnswered(q);
            const isDoubtful = doubtfulQuestionIds.includes(q.id);

            // Tentukan status visual tombol
            let buttonClass = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300';
            let badgeIndicator = null;

            if (isDoubtful) {
              buttonClass = 'bg-amber-500 border-amber-600 text-white font-bold shadow-sm';
              badgeIndicator = (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-200 rounded-full border-2 border-white" />
              );
            } else if (isAnswered) {
              buttonClass = 'bg-emerald-600 border-emerald-700 text-white font-bold shadow-sm';
              badgeIndicator = (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full border-2 border-white" />
              );
            }

            return (
              <button
                key={q.id}
                id={`palette-btn-${idx + 1}`}
                type="button"
                onClick={() => {
                  onSelectIndex(idx);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`relative flex items-center justify-center h-11 rounded-xl border-2 text-sm font-semibold transition-all select-none ${buttonClass} ${
                  isCurrent
                    ? 'ring-2 ring-blue-600 ring-offset-2 scale-105 z-10 !border-blue-600'
                    : ''
                }`}
                title={`Soal No. ${idx + 1} (${isDoubtful ? 'Ragu-ragu' : isAnswered ? 'Terjawab' : 'Belum Dijawab'})`}
              >
                {idx + 1}
                {badgeIndicator}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legenda Keterangan */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-500 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-emerald-600 shrink-0"></span>
          <span>Hijau: Soal sudah dijawab</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-amber-500 shrink-0"></span>
          <span>Kuning: Ditandai ragu-ragu</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300 shrink-0"></span>
          <span>Putih: Belum dijawab</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border-2 border-blue-600 ring-1 ring-blue-600 shrink-0"></span>
          <span>Garis Biru: Soal yang sedang aktif</span>
        </div>
      </div>
    </div>
  );
};
