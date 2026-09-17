import React, { useState, useRef } from 'react';
import { UploadCloud, X, Image as ImageIcon, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface ImageUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  label?: string;
  helpText?: string;
  maxSizeMB?: number;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  onRemove,
  label = 'Gambar Stimulus / Ilustrasi Soal',
  helpText = 'Format: PNG, JPG, WEBP, GIF. Ukuran maksimal 2MB. Diunggah ke Supabase Storage.',
  maxSizeMB = 2,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storageSource, setStorageSource] = useState<'supabase' | 'dataurl' | 'external' | null>(() => {
    if (!value) return null;
    if (value.startsWith('data:image')) return 'dataurl';
    if (value.includes('supabase.co')) return 'supabase';
    return 'external';
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);

    // 1. Validasi tipe file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Tipe file tidak didukung. Harap gunakan format JPEG, PNG, WEBP, atau GIF.');
      return;
    }

    // 2. Validasi ukuran file
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal ${maxSizeMB} MB.`);
      return;
    }

    setIsUploading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        // Unggah ke Supabase Storage bucket 'question-images'
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `questions/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.warn('Supabase Storage error, fallback ke local dataURL:', uploadError.message);
          // Fallback jika bucket belum disiapkan di dashboard Supabase
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            onChange(dataUrl);
            setStorageSource('dataurl');
            setIsUploading(false);
          };
          reader.readAsDataURL(file);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('question-images')
          .getPublicUrl(filePath);

        onChange(urlData.publicUrl);
        setStorageSource('supabase');
      } else {
        // Mode dev preview tanpa Supabase: Simpan dataURL aman
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          onChange(dataUrl);
          setStorageSource('dataurl');
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengunggah gambar.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">
          {label}
        </label>
        {value && (
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {storageSource === 'supabase' ? 'Supabase Storage' : 'Tersimpan'}
          </span>
        )}
      </div>

      {value ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 group">
              <img
                src={value}
                alt="Preview Soal"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                title="Lihat ukuran penuh"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">
                Gambar Lampiran Soal Aktif
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {value.startsWith('data:') ? 'Disimpan sebagai URL Gambar' : value}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Pratinjau
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Ganti Gambar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRemove();
                    setStorageSource(null);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-colors ${
            isUploading
              ? 'bg-slate-50 border-slate-300'
              : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
            </div>
            <div className="text-xs font-bold text-slate-700">
              {isUploading ? 'Mengunggah gambar...' : 'Klik atau seret gambar ke sini'}
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs">{helpText}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Modal Preview Gambar Penuh */}
      {previewOpen && value && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-slate-800">Pratinjau Gambar Soal</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-900/5 max-h-[70vh] overflow-auto">
              <img
                src={value}
                alt="Gambar Soal Ukuran Penuh"
                className="max-h-[60vh] max-w-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
