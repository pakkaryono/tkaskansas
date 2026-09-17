import React, { useState } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useExam } from '../../contexts/ExamContext';
import { useAuth } from '../../contexts/AuthContext';
import { Exam } from '../../types';

interface RegradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  onRegradedSuccess?: (affectedCount: number) => void;
}

export const RegradeModal: React.FC<RegradeModalProps> = ({
  isOpen,
  onClose,
  exam,
  onRegradedSuccess,
}) => {
  const { examAttempts, examQuestions, regradeExam } = useExam();
  const { profile } = useAuth();

  const [reason, setReason] = useState<string>('Koreksi Kunci Jawaban Soal');
  const [notes, setNotes] = useState<string>('');
  const [canceledQuestionIds, setCanceledQuestionIds] = useState<string[]>([]);
  const [cancelAction, setCancelAction] = useState<'full_points' | 'exclude_from_max'>('full_points');
  const [complexScoringMethod, setComplexScoringMethod] = useState<'exact_match' | 'partial_credit'>('exact_match');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !exam) return null;

  const currentQuestions = examQuestions.filter((eq) => eq.exam_id === exam.id);
  const affectedAttempts = examAttempts.filter(
    (a) => a.exam_id === exam.id && (a.status === 'submitted' || a.status === 'expired')
  );

  const toggleCanceledQuestion = (qid: string) => {
    if (canceledQuestionIds.includes(qid)) {
      setCanceledQuestionIds(canceledQuestionIds.filter((id) => id !== qid));
    } else {
      setCanceledQuestionIds([...canceledQuestionIds, qid]);
    }
  };

  const handleExecuteRegrade = async () => {
    if (!reason.trim()) {
      setError('Alasan regrading wajib dipilih.');
      return;
    }
    if (affectedAttempts.length === 0) {
      setError('Tidak ada attempt siswa yang berstatus selesai/terkumpul untuk dihitung ulang.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await regradeExam(exam.id, {
        reason,
        notes: notes.trim(),
        regradedBy: profile?.full_name || 'Admin CBT SMKN 1 Songgom',
        canceledQuestionIds,
        cancelAction,
        complexScoringMethod,
      });

      setIsProcessing(false);
      if (onRegradedSuccess) {
        onRegradedSuccess(res.affectedAttempts);
      }
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Gagal menjalankan regrading ujian.');
    }
  };

  return (
    <div
      id="regrade-exam-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Regrading / Hitung Ulang Nilai Ujian
              </h2>
              <p className="text-xs text-slate-500 line-clamp-1">
                {exam.title} • {affectedAttempts.length} Peserta Terdampak
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Warning notice */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">Mekanisme Perlindungan Integritas Nilai:</p>
              <p className="text-[11px] text-amber-800">
                Sistem secara otomatis mengarsipkan nilai sebelum regrading ke dalam <em>audit trail</em> (histori
                regrade) tanpa menghapus jejak pengerjaan asli siswa. Seluruh lembar ujian peserta akan dievaluasi ulang
                menggunakan formula terpusat.
              </p>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Alasan Regrading</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="Koreksi Kunci Jawaban Soal">Koreksi Kunci Jawaban Soal (Kunci Sebelumnya Keliru)</option>
              <option value="Pembatalan / Anulir Butir Soal Bermasalah">Pembatalan / Anulir Butir Soal Bermasalah</option>
              <option value="Perubahan Bobot Poin Soal">Perubahan Bobot Poin Soal</option>
              <option value="Penyesuaian Metode Penilaian PG Kompleks">Penyesuaian Metode Penilaian PG Kompleks (Partial Credit)</option>
              <option value="Kebijakan Dewan Guru / Pengawas">Kebijakan Dewan Guru / Pengawas Satuan Pendidikan</option>
            </select>
          </div>

          {/* PG Kompleks Method */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Metode Penilaian PG Kompleks</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setComplexScoringMethod('exact_match')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  complexScoringMethod === 'exact_match'
                    ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>Exact Match (Baku)</span>
                  {complexScoringMethod === 'exact_match' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Wajib memilih semua opsi benar tanpa memilih satupun opsi salah.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setComplexScoringMethod('partial_credit')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  complexScoringMethod === 'partial_credit'
                    ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>Partial Credit (Proporsional)</span>
                  {complexScoringMethod === 'partial_credit' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Diberi poin proporsional sesuai perbandingan opsi benar yang dipilih.
                </p>
              </button>
            </div>
          </div>

          {/* Anulir Soal Checklist */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">
                Pilih Soal yang Dibatalkan / Dianulir (Opsional)
              </label>
              {canceledQuestionIds.length > 0 && (
                <span className="text-[11px] font-bold text-rose-600">
                  {canceledQuestionIds.length} Soal Dipilih
                </span>
              )}
            </div>

            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
              {currentQuestions.map((eq) => {
                const isSelected = canceledQuestionIds.includes(eq.question_id);
                return (
                  <label
                    key={eq.id}
                    className={`flex items-center gap-3 p-2 px-3 cursor-pointer hover:bg-slate-100/80 transition ${
                      isSelected ? 'bg-rose-50/70 text-rose-900' : 'text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCanceledQuestion(eq.question_id)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                    />
                    <span className="font-bold text-slate-500 w-14 shrink-0">
                      Soal #{eq.order_num}
                    </span>
                    <span className="line-clamp-1 flex-1 text-[11px]">
                      {eq.snapshot.question_text}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {eq.points || 10} pt
                    </span>
                  </label>
                );
              })}
            </div>

            {canceledQuestionIds.length > 0 && (
              <div className="flex items-center gap-4 pt-1">
                <span className="text-[11px] text-slate-600 font-semibold">Tindakan untuk Soal Batal:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="cancel_action"
                    checked={cancelAction === 'full_points'}
                    onChange={() => setCancelAction('full_points')}
                    className="text-indigo-600"
                  />
                  <span>Beri Poin Penuh ke Semua Siswa</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="cancel_action"
                    checked={cancelAction === 'exclude_from_max'}
                    onChange={() => setCancelAction('exclude_from_max')}
                    className="text-indigo-600"
                  />
                  <span>Keluarkan dari Skor Maksimal</span>
                </label>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Catatan Notulensi / Berita Acara Regrade</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Berdasarkan temuan koreksi bersama MGMP TJKT, butir soal #3 diberikan perlakuan..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/50 transition"
          >
            Batal
          </button>
          <button
            id="confirm-regrade-btn"
            disabled={isProcessing || affectedAttempts.length === 0}
            onClick={handleExecuteRegrade}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Memproses Regrading...' : `Eksekusi Regrading (${affectedAttempts.length} Peserta)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
