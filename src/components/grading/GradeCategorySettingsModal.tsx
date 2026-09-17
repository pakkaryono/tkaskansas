import React, { useState } from 'react';
import { X, Plus, Trash2, RotateCcw, Check, AlertCircle, Award } from 'lucide-react';
import { useExam } from '../../contexts/ExamContext';
import { GradeCategoryConfig } from '../../types';

interface GradeCategorySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GradeCategorySettingsModal: React.FC<GradeCategorySettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { gradeCategories, setGradeCategories, resetGradeCategories } = useExam();

  const [categories, setCategories] = useState<GradeCategoryConfig[]>(() =>
    JSON.parse(JSON.stringify(gradeCategories))
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFieldChange = (
    id: string,
    field: keyof GradeCategoryConfig,
    value: any
  ) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    setError(null);
  };

  const handleAddTier = () => {
    const newTier: GradeCategoryConfig = {
      id: `cat-${Date.now()}`,
      min_score: 60,
      max_score: 69,
      label: 'Cukup',
      code: 'C',
      grade_code: 'C',
      badge_class: 'bg-amber-50 text-amber-700 border-amber-200',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      order: categories.length + 1,
    };
    setCategories([...categories, newTier]);
  };

  const handleDeleteTier = (id: string) => {
    if (categories.length <= 1) {
      setError('Minimal harus ada satu kategori nilai.');
      return;
    }
    setCategories(categories.filter((c) => c.id !== id));
  };

  const handleReset = () => {
    if (confirm('Kembalikan rentang kategori nilai ke standar baku SMKN 1 Songgom?')) {
      resetGradeCategories();
      onClose();
    }
  };

  const handleSave = () => {
    // Validasi rentang nilai
    for (const c of categories) {
      if (c.min_score < 0 || c.max_score > 100 || c.min_score > c.max_score) {
        setError(`Rentang nilai "${c.label}" (${c.min_score} - ${c.max_score}) tidak valid.`);
        return;
      }
      if (!c.label.trim()) {
        setError('Label kategori nilai tidak boleh kosong.');
        return;
      }
    }

    // Urutkan dari tertinggi ke terendah
    const sorted = [...categories].sort((a, b) => b.min_score - a.min_score);
    setGradeCategories(sorted);
    setSuccess('Konfigurasi rentang kategori nilai berhasil disimpan.');
    setTimeout(() => {
      setSuccess(null);
      onClose();
    }, 800);
  };

  return (
    <div
      id="grade-category-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Pengaturan Kategori & Predikat Nilai
              </h2>
              <p className="text-xs text-slate-500">
                Konfigurasi rentang predikat evaluasi hasil ujian SMKN 1 Songgom (Configurable)
              </p>
            </div>
          </div>
          <button
            id="close-grade-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-medium">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-800 leading-relaxed">
            <strong>Catatan Kebijakan Akademik:</strong> Kategori nilai ini digunakan untuk mengelompokkan
            skor siswa (0-100) menjadi predikat resmi (misal: <em>90-100 Sangat Baik</em>, <em>80-89 Baik</em>,{' '}
            <em>70-79 Cukup</em>, <em>&lt;70 Perlu Bimbingan</em>). Perubahan berlaku dinamis pada laporan dan rapor ujian siswa.
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 px-2 uppercase tracking-wider">
              <span className="col-span-2">Min Skor</span>
              <span className="col-span-2">Max Skor</span>
              <span className="col-span-2">Huruf (Grade)</span>
              <span className="col-span-4">Label Predikat</span>
              <span className="col-span-2 text-right">Aksi</span>
            </div>

            {categories.map((cat, idx) => (
              <div
                key={cat.id || idx}
                className="grid grid-cols-12 gap-2 items-center bg-slate-50/80 hover:bg-slate-100/60 border border-slate-200/80 rounded-xl p-2.5 transition"
              >
                {/* Min Score */}
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={cat.min_score}
                    onChange={(e) =>
                      handleFieldChange(cat.id, 'min_score', Number(e.target.value))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Max Score */}
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={cat.max_score}
                    onChange={(e) =>
                      handleFieldChange(cat.id, 'max_score', Number(e.target.value))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Grade Code */}
                <div className="col-span-2">
                  <input
                    type="text"
                    maxLength={3}
                    value={cat.code || cat.grade_code || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCategories((prev) =>
                        prev.map((c) =>
                          c.id === cat.id ? { ...c, code: val, grade_code: val } : c
                        )
                      );
                      setError(null);
                    }}
                    placeholder="A/B/C/D"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Label */}
                <div className="col-span-4">
                  <input
                    type="text"
                    value={cat.label}
                    onChange={(e) =>
                      handleFieldChange(cat.id, 'label', e.target.value)
                    }
                    placeholder="Nama Predikat (cth: Sangat Baik)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${cat.color || 'bg-slate-100 text-slate-700'}`}
                  >
                    {cat.grade_code}
                  </span>
                  <button
                    onClick={() => handleDeleteTier(cat.id)}
                    title="Hapus Kategori Ini"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            id="add-grade-tier-btn"
            onClick={handleAddTier}
            className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-600 hover:text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rentang Kategori Baru</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            id="reset-grade-btn"
            onClick={handleReset}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 rounded-lg hover:bg-slate-200/60 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default SMK</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/50 transition"
            >
              Batal
            </button>
            <button
              id="save-grade-categories-btn"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Kategori</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
