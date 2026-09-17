import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Superscript,
  Subscript,
  Code,
  Eye,
  Edit3,
  Calculator,
  ChevronDown
} from 'lucide-react';
import { RichTextViewer } from './RichTextViewer';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  required?: boolean;
  helpText?: string;
  error?: string;
}

const MATH_SYMBOLS = [
  '²', '³', '⁴', 'ⁿ', '√', 'π', '±', '×', '÷', '≤', '≥', '≠', '≈',
  '∑', '∫', '∞', '°', 'α', 'β', 'θ', 'λ', 'μ', 'Ω', 'Δ', '½', '¼', '¾'
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Tuliskan teks soal di sini...',
  rows = 4,
  label,
  required = false,
  helpText,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [showMathSymbols, setShowMathSymbols] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper untuk membungkus teks terseleksi atau menyisipkan tag
  const insertTag = (openTag: string, closeTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const replacement = `${openTag}${selectedText || 'teks'}${closeTag}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + openTag.length, end + openTag.length);
      } else {
        textarea.setSelectionRange(start + openTag.length, start + openTag.length + 4);
      }
    }, 0);
  };

  const insertSymbol = (sym: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + sym);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + sym + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + sym.length, start + sym.length);
    }, 0);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('write')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                activeTab === 'write' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                activeTab === 'preview' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Pratinjau</span>
            </button>
          </div>
        </div>
      )}

      <div className={`rounded-xl border transition-all overflow-hidden bg-white ${
        error ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100'
      }`}>
        {/* Toolbar */}
        {activeTab === 'write' && (
          <div className="flex flex-wrap items-center gap-1 px-2.5 py-1.5 bg-slate-50/90 border-b border-slate-200 text-slate-600 text-xs">
            <button
              type="button"
              title="Tebal (Bold)"
              onClick={() => insertTag('<b>', '</b>')}
              className="p-1.5 rounded hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Miring (Italic)"
              onClick={() => insertTag('<i>', '</i>')}
              className="p-1.5 rounded hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Garis Bawah (Underline)"
              onClick={() => insertTag('<u>', '</u>')}
              className="p-1.5 rounded hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            <span className="h-4 w-px bg-slate-200 mx-0.5" />

            <button
              type="button"
              title="Superskrip / Pangkat (x²)"
              onClick={() => insertTag('<sup>', '</sup>')}
              className="p-1.5 rounded hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors cursor-pointer flex items-center gap-0.5 text-[11px] font-bold"
            >
              <Superscript className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Subskrip (x₂)"
              onClick={() => insertTag('<sub>', '</sub>')}
              className="p-1.5 rounded hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors cursor-pointer flex items-center gap-0.5 text-[11px] font-bold"
            >
              <Subscript className="w-3.5 h-3.5" />
            </button>

            <span className="h-4 w-px bg-slate-200 mx-0.5" />

            <button
              type="button"
              title="Daftar Poin"
              onClick={() => insertTag('<ul><li>', '</li></ul>')}
              className="p-1.5 rounded hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Daftar Angka"
              onClick={() => insertTag('<ol><li>', '</li></ol>')}
              className="p-1.5 rounded hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Kode / Monospace"
              onClick={() => insertTag('<code>', '</code>')}
              className="p-1.5 rounded hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
            </button>

            <span className="h-4 w-px bg-slate-200 mx-0.5" />

            {/* Simbol Matematika Quick Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMathSymbols(!showMathSymbols)}
                className={`px-2 py-1 rounded border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  showMathSymbols
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Calculator className="w-3 h-3 text-emerald-600" />
                <span>Simbol Matematika</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showMathSymbols && (
                <div className="absolute left-0 top-full mt-1 z-30 p-2.5 bg-white border border-slate-200 rounded-xl shadow-lg w-64">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Klik untuk menyisipkan simbol:
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {MATH_SYMBOLS.map((sym, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          insertSymbol(sym);
                          setShowMathSymbols(false);
                        }}
                        className="p-1.5 rounded hover:bg-emerald-50 hover:text-emerald-700 text-sm font-semibold text-slate-800 text-center transition-colors cursor-pointer"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 text-xs sm:text-sm text-slate-800 focus:outline-none resize-y leading-relaxed font-sans"
          />
        ) : (
          <div className="p-3 min-h-[100px] bg-slate-50/50 text-xs sm:text-sm border-t border-slate-100">
            {value.trim() ? (
              <RichTextViewer content={value} />
            ) : (
              <span className="text-slate-400 italic text-xs">Belum ada konten untuk dipratinjau.</span>
            )}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-rose-600 font-medium">{error}</p>
      ) : helpText ? (
        <p className="text-[11px] text-slate-400">{helpText}</p>
      ) : null}
    </div>
  );
};
