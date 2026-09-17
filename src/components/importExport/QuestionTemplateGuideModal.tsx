import React from 'react';
import { X, FileQuestion, HelpCircle, CheckCircle2, Download, AlertTriangle } from 'lucide-react';
import { downloadTemplateExcel } from '../../lib/excelEngine';

interface QuestionTemplateGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuestionTemplateGuideModal: React.FC<QuestionTemplateGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileQuestion className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Panduan Format Template Bank Soal (.xlsx)</h3>
              <p className="text-xs text-blue-100">
                Format resmi terstandarisasi untuk 4 jenis soal: PG Biasa, PG Kompleks, Menjodohkan, dan Esai
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-blue-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Quick Notice */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-blue-900">Kemudahan Format Tunggal Tanpa Bingung</div>
              <p className="text-xs text-blue-700 mt-1">
                Semua 4 jenis soal diinput dalam 1 sheet yang sama. Anda cukup menentukan kolom{' '}
                <code className="px-1.5 py-0.5 bg-blue-150 rounded text-blue-900 font-mono font-bold">Tipe_Soal</code>.
                Sistem akan secara otomatis mengenali dan memvalidasi struktur jawaban sesuai jenisnya.
              </p>
            </div>
          </div>

          {/* 4 Types Grid */}
          <div className="space-y-4">
            {/* 1. PG Biasa */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs">
                  1. Pilihan Ganda Tunggal (Single Choice)
                </span>
                <span className="text-xs font-mono text-emerald-700">Tipe_Soal: <b>pg_biasa</b></span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                <li><b>Kolom Opsi</b>: Isi <code className="font-mono text-slate-800">Pilihan_A</code> s/d <code className="font-mono text-slate-800">Pilihan_E</code> (minimal Opsi A dan B).</li>
                <li><b>Kunci Jawaban</b>: Tulis 1 huruf kapital, contoh: <code className="font-mono font-bold text-emerald-700">A</code> atau <code className="font-mono font-bold text-emerald-700">C</code>.</li>
                <li><b>Skor</b>: Otomatis menggunakan metode penilaian <i>Exact Match</i> (benar dapat poin penuh, salah 0).</li>
              </ul>
            </div>

            {/* 2. PG Kompleks */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-bold rounded-lg text-xs">
                  2. Pilihan Ganda Kompleks (Multi-Select)
                </span>
                <span className="text-xs font-mono text-purple-700">Tipe_Soal: <b>pg_kompleks</b></span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                <li><b>Kolom Opsi</b>: Isi <code className="font-mono text-slate-800">Pilihan_A</code> s/d <code className="font-mono text-slate-800">Pilihan_E</code>.</li>
                <li><b>Kunci Jawaban</b>: Tulis semua opsi benar dipisahkan koma, contoh: <code className="font-mono font-bold text-purple-700">A, C</code> atau <code className="font-mono font-bold text-purple-700">B, D, E</code>.</li>
                <li><b>Skor</b>: Menerapkan <i>Partial Credit Scoring</i> (proporsi jawaban tepat).</li>
              </ul>
            </div>

            {/* 3. Menjodohkan */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-xs">
                  3. Menjodohkan (Matching Pairs)
                </span>
                <span className="text-xs font-mono text-amber-700">Tipe_Soal: <b>menjodohkan</b></span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                <li><b>Kolom Pasangan</b>: Isi pada kolom <code className="font-mono text-slate-800 font-bold">Pasangan_Menjodohkan</code>.</li>
                <li><b>Format Pasangan</b>: Gunakan tanda <code className="font-mono font-bold text-amber-900">=</code> untuk memasangkan dan pemisah garis tegak <code className="font-mono font-bold text-amber-900">|</code> antar pasangan.</li>
                <li>
                  <b>Contoh Pengisian</b>:
                  <div className="mt-1 p-2 bg-white rounded border border-amber-300 font-mono text-xs text-slate-800">
                    Router = Mengarahkan paket IP | Switch = Menghubungkan LAN | Firewall = Memfilter trafik keamanan
                  </div>
                </li>
              </ul>
            </div>

            {/* 4. Esai */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg text-xs">
                  4. Esai / Uraian Terbuka (Essay)
                </span>
                <span className="text-xs font-mono text-blue-700">Tipe_Soal: <b>esai</b></span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                <li><b>Kolom Opsi</b>: Kosongkan Opsi A s/d E.</li>
                <li><b>Kunci Jawaban</b>: Isi dengan poin acuan jawaban atau kata kunci esensial untuk mempermudah koreksi guru.</li>
                <li><b>Penilaian</b>: Penilaian manual oleh guru penguji melalui antrean koreksi esai CBT.</li>
              </ul>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Aturan Validasi Otomatis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
              <div>
                • <b>Kode_Soal</b> harus unik (tidak boleh kembar).<br />
                • <b>Kode_Mapel</b> harus terdaftar di sistem master mapel.
              </div>
              <div>
                • <b>Bobot_Poin</b> berupa angka positif (contoh: 10, 20).<br />
                • <b>Tingkat</b> diisi: X, XI, atau XII.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => downloadTemplateExcel('bank_soal')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" /> Unduh Template Bank Soal (.xlsx)
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
