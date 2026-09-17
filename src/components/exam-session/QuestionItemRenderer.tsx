import React, { useState } from 'react';
import {
  StudentQuestionItem,
  StudentQuestionOption,
  StudentMatchingPair,
} from '../../types';
import {
  Check,
  Circle,
  Square,
  CheckSquare,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface QuestionItemRendererProps {
  question: StudentQuestionItem;
  questionNumber: number;
  currentAnswer: any;
  onAnswerChange: (answer: any) => void;
  disabled?: boolean;
}

export const QuestionItemRenderer: React.FC<QuestionItemRendererProps> = ({
  question,
  questionNumber,
  currentAnswer,
  onAnswerChange,
  disabled = false,
}) => {
  // 1. Pilihan Ganda Biasa
  const handleSingleChoice = (optionKey: string) => {
    if (disabled) return;
    onAnswerChange(optionKey);
  };

  // 2. Pilihan Ganda Kompleks
  const handleComplexChoice = (optionKey: string) => {
    if (disabled) return;
    const prevList: string[] = Array.isArray(currentAnswer) ? [...currentAnswer] : [];
    if (prevList.includes(optionKey)) {
      onAnswerChange(prevList.filter((k) => k !== optionKey));
    } else {
      onAnswerChange([...prevList, optionKey]);
    }
  };

  // 3. Esai Textarea
  const handleEssayChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    onAnswerChange(e.target.value);
  };

  // 4. Menjodohkan (Matching)
  // Format jawaban matching: Record<pair_id, selected_match_key_or_text>
  const matchingAnswers: Record<string, string> =
    typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer : {};

  const handleMatchingChange = (pairId: string, matchedValue: string) => {
    if (disabled) return;
    const updated = {
      ...matchingAnswers,
      [pairId]: matchedValue,
    };
    onAnswerChange(updated);
  };

  const handleResetMatch = (pairId: string) => {
    if (disabled) return;
    const updated = { ...matchingAnswers };
    delete updated[pairId];
    onAnswerChange(updated);
  };

  // Ambil daftar unik respons kanan untuk pilihan matching
  const rightOptions = (question.matching_pairs || []).map((p) => ({
    id: p.id,
    label: p.right_item,
  }));

  // Hitung jumlah kata dan karakter esai
  const essayText = typeof currentAnswer === 'string' ? currentAnswer : '';
  const charCount = essayText.length;
  const wordCount = essayText.trim() === '' ? 0 : essayText.trim().split(/\s+/).length;

  return (
    <div id={`question-item-${question.id}`} className="space-y-6">
      {/* Header Nomor Soal & Tipe */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm shadow-sm">
            {questionNumber}
          </span>
          <span className="text-sm font-semibold text-slate-700">
            {question.question_type === 'single_choice' && 'Pilihan Ganda Biasa'}
            {question.question_type === 'complex_choice' && 'Pilihan Ganda Kompleks (Bisa Lebih dari 1 Jawaban)'}
            {question.question_type === 'essay' && 'Esai / Uraian Singkat'}
            {question.question_type === 'matching' && 'Soal Menjodohkan (Pasangkan Pernyataan)'}
          </span>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          Bobot: {question.points} Poin
        </div>
      </div>

      {/* Pertanyaan Teks & Gambar */}
      <div className="space-y-4">
        {question.image_url && (
          <div className="max-w-xl mx-auto rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-1">
            <img
              src={question.image_url}
              alt={`Ilustrasi Soal ${questionNumber}`}
              className="w-full h-auto max-h-72 object-contain mx-auto rounded-lg"
              loading="lazy"
            />
          </div>
        )}

        <div className="prose prose-slate max-w-none text-slate-800 text-base sm:text-lg leading-relaxed whitespace-pre-line font-normal select-none">
          {question.question_text}
        </div>
      </div>

      {/* Area Jawaban Berdasarkan Tipe Soal */}
      <div className="pt-2">
        {/* TIPE 1: PILIHAN GANDA BIASA (A-E Radio) */}
        {question.question_type === 'single_choice' && (
          <div className="space-y-3" role="radiogroup" aria-label={`Pilihan Soal ${questionNumber}`}>
            {question.options?.map((opt) => {
              const isSelected = currentAnswer === opt.option_key;
              return (
                <button
                  key={opt.id}
                  id={`option-${question.id}-${opt.option_key}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSingleChoice(opt.option_key)}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all select-none min-h-[52px] ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-sm ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                  } ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer active:scale-[0.99]'}`}
                >
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm shrink-0 mt-0.5 border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    {opt.option_key}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="text-base sm:text-lg leading-snug">{opt.option_text}</div>
                    {opt.image_url && (
                      <div className="max-w-xs mt-2 rounded border border-slate-200 overflow-hidden bg-slate-50 p-1">
                        <img
                          src={opt.image_url}
                          alt={`Opsi ${opt.option_key}`}
                          className="max-h-40 object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 mt-1">
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* TIPE 2: PILIHAN GANDA KOMPLEKS (A-E Checkbox) */}
        {question.question_type === 'complex_choice' && (
          <div className="space-y-3">
            <p className="text-xs sm:text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg inline-block mb-1">
              Petunjuk: Anda dapat mencentang lebih dari satu opsi jawaban yang menurut Anda benar.
            </p>
            {question.options?.map((opt) => {
              const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(opt.option_key);
              return (
                <button
                  key={opt.id}
                  id={`option-${question.id}-${opt.option_key}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleComplexChoice(opt.option_key)}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all select-none min-h-[52px] ${
                    isChecked
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-sm ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                  } ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer active:scale-[0.99]'}`}
                >
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm shrink-0 mt-0.5 border transition-colors ${
                      isChecked
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    {opt.option_key}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="text-base sm:text-lg leading-snug">{opt.option_text}</div>
                    {opt.image_url && (
                      <div className="max-w-xs mt-2 rounded border border-slate-200 overflow-hidden bg-slate-50 p-1">
                        <img
                          src={opt.image_url}
                          alt={`Opsi ${opt.option_key}`}
                          className="max-h-40 object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 mt-1">
                    {isChecked ? (
                      <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <Square className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* TIPE 3: ESAI (Textarea) */}
        {question.question_type === 'essay' && (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                id={`essay-input-${question.id}`}
                rows={6}
                disabled={disabled}
                value={essayText}
                onChange={handleEssayChange}
                placeholder="Ketik jawaban esai Anda secara jelas, terstruktur, dan lengkap di sini..."
                className={`w-full p-4 rounded-xl border-2 text-base sm:text-lg leading-relaxed focus:outline-none transition-colors ${
                  disabled
                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                    : 'bg-white border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 px-1">
              <span>Jawaban akan disimpan otomatis saat Anda mengetik.</span>
              <div className="flex items-center gap-3 font-medium">
                <span>{wordCount} Kata</span>
                <span>•</span>
                <span>{charCount} Karakter</span>
              </div>
            </div>
          </div>
        )}

        {/* TIPE 4: MENJODOHKAN (Mobile-friendly Matcher) */}
        {question.question_type === 'matching' && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
              Petunjuk: Pasangkan setiap item pernyataan di sisi kiri dengan pasangan jawaban yang tepat di sisi kanan.
            </p>

            <div className="space-y-3">
              {question.matching_pairs?.map((pair, idx) => {
                const currentMatched = matchingAnswers[pair.id];
                return (
                  <div
                    key={pair.id}
                    id={`match-row-${pair.id}`}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    {/* Item Kiri (Premis) */}
                    <div className="flex items-start gap-3 md:w-1/2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-base font-medium text-slate-900 leading-snug">
                        {pair.left_item}
                      </span>
                    </div>

                    {/* Penghubung Arrow di Desktop */}
                    <div className="hidden md:flex items-center justify-center text-slate-400">
                      <ArrowRight className="w-5 h-5" />
                    </div>

                    {/* Selector Pasangan Kanan (Ramah Sentuhan HP) */}
                    <div className="md:w-1/2 flex items-center gap-2">
                      <select
                        id={`select-match-${pair.id}`}
                        disabled={disabled}
                        value={currentMatched || ''}
                        onChange={(e) => handleMatchingChange(pair.id, e.target.value)}
                        className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg border text-sm sm:text-base font-medium transition-all ${
                          currentMatched
                            ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-semibold ring-1 ring-emerald-400'
                            : 'bg-white border-slate-300 text-slate-600'
                        } ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                      >
                        <option value="">-- Pilih Pasangan Jawaban --</option>
                        {rightOptions.map((opt) => (
                          <option key={opt.id} value={opt.label}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {currentMatched && !disabled && (
                        <button
                          type="button"
                          onClick={() => handleResetMatch(pair.id)}
                          title="Lepas Pasangan"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
