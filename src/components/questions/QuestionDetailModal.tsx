import React from 'react';
import {
  X,
  FileQuestion,
  Award,
  Layers,
  CheckCircle2,
  BookOpen,
  Calendar,
  Sparkles,
  Link,
  Edit,
  Copy
} from 'lucide-react';
import { Question } from '../../types';
import { RichTextViewer } from '../common/RichTextViewer';

interface QuestionDetailModalProps {
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (question: Question) => void;
  onDuplicate?: (question: Question) => void;
  canEdit?: boolean;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  question,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  canEdit = true,
}) => {
  if (!isOpen || !question) return null;

  const getTypeBadge = () => {
    switch (question.question_type) {
      case 'single_choice':
        return { label: 'Pilihan Ganda Biasa', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'complex_choice':
        return { label: 'Pilihan Ganda Kompleks', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'essay':
        return { label: 'Esai Singkat', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'matching':
        return { label: 'Menjodohkan (Matching)', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
    }
  };

  const getDifficultyBadge = () => {
    switch (question.difficulty) {
      case 'easy':
        return { label: 'Mudah', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'medium':
        return { label: 'Sedang', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'hard':
        return { label: 'Sukar / Sulit', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
  };

  const typeBadge = getTypeBadge();
  const diffBadge = getDifficultyBadge();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">Detail Butir Soal</h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {question.code}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {question.subject?.name || 'Mata Pelajaran'} • Tingkat {question.grade}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-slate-400 block text-[11px]">Tipe Soal</span>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded border text-[11px] font-bold ${typeBadge.bg}`}>
                {typeBadge.label}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Tingkat Kesulitan</span>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded border text-[11px] font-bold ${diffBadge.bg}`}>
                {diffBadge.label}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Bobot Nilai</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                {question.points} Poin
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Status Soal</span>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                question.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : question.status === 'draft'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {question.status === 'active' ? 'Aktif Digunakan' : question.status === 'draft' ? 'Draf' : 'Nonaktif'}
              </span>
            </div>
          </div>

          {/* Konteks Kurikulum */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              {question.subject?.name || 'Mata Pelajaran'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1 font-medium">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              {question.major?.name || 'Semua Jurusan / Umum'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Tingkat {question.grade}
            </span>
          </div>

          {/* Stimulus / Teks Soal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pertanyaan / Stimulus</h4>
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-xs">
              <RichTextViewer content={question.question_text} />

              {question.image_url && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
                  <img
                    src={question.image_url}
                    alt="Ilustrasi Soal"
                    className="max-h-64 max-w-full rounded-lg border border-slate-200 object-contain shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 italic">Gambar Stimulus Soal</span>
                </div>
              )}
            </div>
          </div>

          {/* OPSI PILIHAN GANDA BIASA (A-E, 1 Kunci) */}
          {question.question_type === 'single_choice' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilihan Jawaban (A - E)</h4>
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 1 Jawaban Benar
                </span>
              </div>
              <div className="space-y-2">
                {question.options?.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      opt.is_correct
                        ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/30'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        opt.is_correct
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {opt.option_key}
                    </span>
                    <div className="flex-1 text-xs sm:text-sm pt-1">
                      <RichTextViewer content={opt.option_text} />
                    </div>
                    {opt.is_correct && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-emerald-600 text-white shrink-0 mt-1">
                        Kunci Jawaban
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPSI PILIHAN GANDA KOMPLEKS (A-E, Multi Kunci) */}
          {question.question_type === 'complex_choice' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pilihan Ganda Kompleks (Multi-Opsi)
                </h4>
                <span className="text-xs text-purple-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Metode: {question.scoring_method === 'exact_match' ? 'Exact Match (Penuh)' : 'Parsial'}
                </span>
              </div>
              <div className="space-y-2">
                {question.options?.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      opt.is_correct
                        ? 'bg-purple-50/80 border-purple-300 ring-1 ring-purple-400/30'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        opt.is_correct
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {opt.option_key}
                    </span>
                    <div className="flex-1 text-xs sm:text-sm pt-1">
                      <RichTextViewer content={opt.option_text} />
                    </div>
                    {opt.is_correct && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-purple-700 text-white shrink-0 mt-1">
                        Opsi Benar
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ESAI SINGKAT */}
          {question.question_type === 'essay' && question.essay_answer && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Acuan Penilaian Esai</h4>
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-amber-900 block mb-1">
                    Jawaban Acuan Guru / Model Kunci:
                  </span>
                  <div className="text-xs sm:text-sm text-slate-800 bg-white p-3 rounded-lg border border-amber-200 whitespace-pre-wrap leading-relaxed">
                    {question.essay_answer.reference_answer}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-amber-900 block mb-1">
                    Kata Kunci Penilaian (Keywords):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {question.essay_answer.keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 text-xs font-semibold">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>

                {question.essay_answer.sample_rubric && (
                  <div>
                    <span className="text-[11px] font-bold text-amber-900 block mb-1">
                      Rubrik Pedoman Penskoran:
                    </span>
                    <p className="text-xs text-amber-800 italic">
                      {question.essay_answer.sample_rubric}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MENJODOHKAN (MATCHING PAIRS) */}
          {question.question_type === 'matching' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pasangan Menjodohkan (Matching Pairs)
                </h4>
                <span className="text-xs text-teal-700 font-semibold flex items-center gap-1">
                  <Link className="w-3.5 h-3.5" /> {question.matching_pairs?.length || 0} Pasangan Benar
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3 w-1/2">Item Kiri (Premis / Soal)</th>
                      <th className="p-3 w-1/2 bg-teal-50/50 text-teal-900">Item Kanan (Respon Pasangan Benar)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {question.matching_pairs?.map((pair, idx) => (
                      <tr key={pair.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-medium text-slate-800">{pair.left_item}</td>
                        <td className="p-3 font-semibold text-teal-800 bg-teal-50/30 flex items-center gap-2">
                          <Link className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                          <span>{pair.right_item}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PEMBAHASAN */}
          {question.explanation && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs text-emerald-800">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pembahasan & Solusi Soal:</span>
              </div>
              <p className="text-slate-600 leading-relaxed pt-1">{question.explanation}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {canEdit && onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  onDuplicate(question);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplikasi Soal</span>
              </button>
            )}
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(question);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Soal</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
