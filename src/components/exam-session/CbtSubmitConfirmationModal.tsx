import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  X,
  FileCheck,
  Send,
} from 'lucide-react';

interface CbtSubmitConfirmationModalProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  doubtfulCount: number;
  isSubmitting: boolean;
  onConfirmSubmit: () => void;
  onCancel: () => void;
}

export const CbtSubmitConfirmationModal: React.FC<CbtSubmitConfirmationModalProps> = ({
  isOpen,
  totalQuestions,
  answeredCount,
  unansweredCount,
  doubtfulCount,
  isSubmitting,
  onConfirmSubmit,
  onCancel,
}) => {
  const [agreementChecked, setAgreementChecked] = useState(false);

  if (!isOpen) return null;

  const hasIncomplete = unansweredCount > 0 || doubtfulCount > 0;

  return (
    <div
      id="submit-confirmation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="submit-confirmation-dialog"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Konfirmasi Selesai Ujian</h3>
              <p className="text-xs text-slate-500">Pengumpulan lembar jawaban TKA</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h4 className="text-base sm:text-lg font-semibold text-slate-800">
              Apakah Anda yakin ingin mengumpulkan ujian ini?
            </h4>
            <p className="text-xs sm:text-sm text-slate-600">
              Setelah dikumpulkan, sesi ujian akan ditutup dan Anda tidak dapat mengubah jawaban lagi.
            </p>
          </div>

          {/* Ringkasan Pengerjaan */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-emerald-600">{answeredCount}</div>
              <div className="text-xs font-medium text-slate-600">Terjawab</div>
            </div>
            <div className="space-y-1">
              <div
                className={`text-2xl font-bold ${
                  doubtfulCount > 0 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                {doubtfulCount}
              </div>
              <div className="text-xs font-medium text-slate-600">Ragu-ragu</div>
            </div>
            <div className="space-y-1">
              <div
                className={`text-2xl font-bold ${
                  unansweredCount > 0 ? 'text-rose-600' : 'text-slate-400'
                }`}
              >
                {unansweredCount}
              </div>
              <div className="text-xs font-medium text-slate-600">Belum Dijawab</div>
            </div>
          </div>

          {/* Peringatan jika belum lengkap */}
          {hasIncomplete && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Perhatian: </span>
                {unansweredCount > 0 && doubtfulCount > 0 ? (
                  <span>
                    Masih ada <strong>{unansweredCount} butir soal belum dijawab</strong> dan{' '}
                    <strong>{doubtfulCount} butir soal masih ditandai ragu-ragu</strong>.
                  </span>
                ) : unansweredCount > 0 ? (
                  <span>
                    Masih ada <strong>{unansweredCount} butir soal yang belum Anda jawab</strong>.
                  </span>
                ) : (
                  <span>
                    Masih ada <strong>{doubtfulCount} butir soal yang masih ditandai ragu-ragu</strong>.
                  </span>
                )}
                <div className="mt-1 text-amber-800">
                  Pastikan Anda telah memeriksa kembali sebelum mengakhiri sesi.
                </div>
              </div>
            </div>
          )}

          {/* Checkbox Konfirmasi Siswa */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer select-none">
            <input
              id="confirm-submit-checkbox"
              type="checkbox"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 mt-1 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs sm:text-sm text-slate-700 leading-snug">
              Saya telah memeriksa lembar jawaban dan menyatakan secara sadar untuk mengumpulkan ujian ini sekarang.
            </span>
          </label>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors"
          >
            Periksa Kembali
          </button>
          <button
            id="btn-confirm-submit"
            type="button"
            onClick={onConfirmSubmit}
            disabled={!agreementChecked || isSubmitting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-sm transition-all ${
              agreementChecked && !isSubmitting
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                : 'bg-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Mengumpulkan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Ya, Kumpulkan Ujian</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
