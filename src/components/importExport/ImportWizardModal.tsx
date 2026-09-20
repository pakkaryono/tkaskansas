import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FileText,
  AlertCircle,
  HelpCircle,
  FolderDown,
  Database,
  ShieldAlert,
} from 'lucide-react';
import {
  ImportEntityType,
  ImportParsedRow,
  ImportResultSummary,
  ImportValidationError,
} from '../../types';
import {
  parseExcelFile,
  validateImportRows,
  transformRowToDomainEntity,
  downloadTemplateExcel,
  downloadErrorReportExcel,
  ENTITY_COLUMNS,
} from '../../lib/excelEngine';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useQuestionBank } from '../../contexts/QuestionBankContext';
import { useAuth } from '../../contexts/AuthContext';
import { QuestionTemplateGuideModal } from './QuestionTemplateGuideModal';

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEntityType?: ImportEntityType;
  onSuccess?: (summary: ImportResultSummary) => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export const ImportWizardModal: React.FC<ImportWizardModalProps> = ({
  isOpen,
  onClose,
  initialEntityType = 'siswa',
  onSuccess,
}) => {
  const { user } = useAuth();
  const masterData = useMasterData();
  const questionBank = useQuestionBank();

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);
  const [entityType, setEntityType] = useState<ImportEntityType>(initialEntityType);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  // Parsed and validated states
  const [sheetName, setSheetName] = useState('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ImportParsedRow[]>([]);
  const [validRows, setValidRows] = useState<ImportParsedRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<ImportParsedRow[]>([]);
  const [allErrors, setAllErrors] = useState<ImportValidationError[]>([]);
  const [isFatalMissingColumns, setIsFatalMissingColumns] = useState(false);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);

  // Confirmation & Execution state
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [summary, setSummary] = useState<ImportResultSummary | null>(null);

  // Guide modal state
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Reset wizard
  const resetWizard = () => {
    setStep(1);
    setSelectedFile(null);
    setReadError(null);
    setRawRows([]);
    setRawHeaders([]);
    setParsedRows([]);
    setValidRows([]);
    setInvalidRows([]);
    setAllErrors([]);
    setIsFatalMissingColumns(false);
    setMissingColumns([]);
    setIsConfirmed(false);
    setIsImporting(false);
    setImportProgress(0);
    setSummary(null);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  // Step 1: File Selection & Reading
  const handleFileProcess = async (file: File) => {
    setSelectedFile(file);
    setIsReading(true);
    setReadError(null);

    try {
      const parsed = await parseExcelFile(file);
      if (parsed.rows.length === 0) {
        throw new Error('Berkas Excel kosong atau tidak memiliki baris data setelah header.');
      }
      setSheetName(parsed.sheetName);
      setRawRows(parsed.rows);
      setRawHeaders(parsed.rawHeaders);

      // Perform initial validation
      const validationContext = {
        students: masterData.students,
        teachers: masterData.teachers,
        subjects: masterData.subjects,
        classes: masterData.classes,
        majors: masterData.majors,
        questions: questionBank.questions,
        currentUser: user
          ? {
              id: user.id,
              role: user.role,
              subject_ids: (user as any).subject_ids,
            }
          : undefined,
      };

      const result = validateImportRows(entityType, parsed.rows, parsed.rawHeaders, validationContext);
      setParsedRows(result.parsedRows);
      setValidRows(result.validRows);
      setInvalidRows(result.invalidRows);
      setAllErrors(result.allErrors);
      setIsFatalMissingColumns(result.isFatalMissingColumns);
      setMissingColumns(result.missingColumns);

      // Advance to Preview (Step 2)
      setStep(2);
    } catch (err: any) {
      setReadError(err.message || 'Gagal membaca berkas Excel. Pastikan berkas .xlsx valid.');
    } finally {
      setIsReading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Step 5: Execute Import
  const handleExecuteImport = async () => {
    if (validRows.length === 0) return;

    setIsImporting(true);
    setStep(5);
    setImportProgress(10);

    const validationContext = {
      students: masterData.students,
      teachers: masterData.teachers,
      subjects: masterData.subjects,
      classes: masterData.classes,
      majors: masterData.majors,
      questions: questionBank.questions,
      currentUser: user
        ? {
            id: user.id,
            role: user.role,
            subject_ids: (user as any).subject_ids,
          }
        : undefined,
    };

    // Transform valid rows to domain objects
    const domainEntities = validRows.map((row) =>
      transformRowToDomainEntity(entityType, row, validationContext)
    );

    setImportProgress(40);

    try {
      let importedCount = 0;
      let failedCount = invalidRows.length;

      if (entityType === 'siswa') {
        const res = await masterData.importStudentsBatch(domainEntities);
        importedCount = res.imported;
      } else if (entityType === 'guru') {
        const res = await masterData.importTeachersBatch(domainEntities);
        importedCount = res.imported;
      } else if (entityType === 'admin') {
        const res = await masterData.importAdminsBatch(domainEntities);
        importedCount = res.imported;
      } else if (entityType === 'mapel') {
        const res = await masterData.importSubjectsBatch(domainEntities);
        importedCount = res.imported;
      } else if (entityType === 'kelas') {
        const res = await masterData.importClassesBatch(domainEntities);
        importedCount = res.imported;
      } else if (entityType === 'jurusan') {
        const res = await masterData.importMajorsBatch(domainEntities);
        importedCount = res.imported;
      } else if (entityType === 'bank_soal') {
        const res = await questionBank.importQuestionsBatch(domainEntities);
        importedCount = res.imported;
      }

      setImportProgress(90);

      const finalSummary: ImportResultSummary = {
        entityType,
        totalRows: rawRows.length,
        successCount: importedCount,
        failedCount: failedCount,
        importedItems: domainEntities,
        invalidRows: invalidRows,
        timestamp: new Date().toISOString(),
      };

      setSummary(finalSummary);
      setImportProgress(100);
      setStep(6);

      if (onSuccess) {
        onSuccess(finalSummary);
      }
    } catch (err: any) {
      setReadError(`Terjadi kesalahan saat menyimpan data: ${err.message}`);
      setStep(3);
    } finally {
      setIsImporting(false);
    }
  };

  const getEntityLabel = (type: ImportEntityType): string => {
    switch (type) {
      case 'siswa':
        return 'Siswa';
      case 'guru':
        return 'Guru / Pendidik';
      case 'admin':
        return 'Admin / Operator';
      case 'mapel':
        return 'Mata Pelajaran';
      case 'kelas':
        return 'Kelas / Rombel';
      case 'jurusan':
        return 'Program Keahlian (Jurusan)';
      case 'bank_soal':
        return 'Bank Soal (4 Jenis)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[95vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Import Data Excel (.xlsx)</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {getEntityLabel(entityType)}
                </span>
              </div>
              <p className="text-xs text-slate-400">SMKN 1 Songgom • Sistem Penjamin Mutu Validasi Data</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[500px]">
            {[
              { num: 1, label: 'Pilih File' },
              { num: 2, label: 'Preview' },
              { num: 3, label: 'Validasi' },
              { num: 4, label: 'Konfirmasi' },
              { num: 5, label: 'Import' },
              { num: 6, label: 'Selesai' },
            ].map((st, idx) => {
              const isActive = step === st.num;
              const isCompleted = step > st.num;
              return (
                <React.Fragment key={st.num}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : st.num}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isActive ? 'text-blue-700 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                  {idx < 5 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        step > idx + 1 ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Wizard Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700">
          {/* ============================================================ */}
          {/* STEP 1: PILIH FILE */}
          {/* ============================================================ */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Entity Selector (Only if not locked or admin wants to switch) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Pilih Modul / Entitas Master Data yang Akan Diimpor:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {(
                    [
                      { key: 'siswa', label: 'Siswa' },
                      { key: 'guru', label: 'Guru' },
                      { key: 'admin', label: 'Admin' },
                      { key: 'mapel', label: 'Mapel' },
                      { key: 'kelas', label: 'Kelas' },
                      { key: 'jurusan', label: 'Jurusan' },
                      { key: 'bank_soal', label: 'Bank Soal' },
                    ] as const
                  ).map((ent) => (
                    <button
                      key={ent.key}
                      type="button"
                      onClick={() => setEntityType(ent.key)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        entityType === ent.key
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ent.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Download Banner */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <FolderDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">
                      Unduh Berkas Template Excel (.xlsx)
                    </h4>
                    <p className="text-xs text-blue-700">
                      Gunakan template resmi terstandarisasi untuk menghindari penolakan baris data.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {entityType === 'bank_soal' && (
                    <button
                      type="button"
                      onClick={() => setIsGuideOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-blue-700 border border-blue-300 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors shrink-0"
                    >
                      <HelpCircle className="w-4 h-4" /> Petunjuk Soal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadTemplateExcel(entityType)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4" /> Unduh Template (.xlsx)
                  </button>
                </div>
              </div>

              {/* Dropzone Upload */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  {isReading ? (
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>

                <div className="text-sm font-bold text-slate-800">
                  {isReading ? 'Membaca dan Menganalisis Berkas Excel...' : 'Tarik dan Letakkan Berkas Excel di Sini'}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Atau klik untuk memilih berkas dari komputer (Format resmi <span className="font-semibold text-slate-700">.xlsx</span>, Maksimal 10 MB)
                </p>
              </div>

              {readError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Gagal Memproses Berkas:</span> {readError}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: PREVIEW DATA */}
          {/* ============================================================ */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">{selectedFile?.name}</span>
                    <span className="text-xs text-slate-500 ml-2">Sheet: &quot;{sheetName}&quot;</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg">
                    Total Baris Data: {rawRows.length} Baris
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Menampilkan pratinjau 10 baris pertama dari berkas Excel sebelum dilakukan pemeriksaan aturan validasi integritas data:
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 w-12 text-center">No</th>
                        {rawHeaders.map((header, hIdx) => (
                          <th key={hIdx} className="px-3 py-2.5 whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                      {rawRows.slice(0, 10).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-center text-slate-400 font-sans">{rIdx + 1}</td>
                          {rawHeaders.map((header, hIdx) => (
                            <td key={hIdx} className="px-3 py-2 whitespace-nowrap max-w-xs truncate text-slate-700">
                              {row[header] !== undefined ? String(row[header]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {rawRows.length > 10 && (
                <div className="text-center text-xs text-slate-400 italic">
                  ... dan {rawRows.length - 10} baris data lainnya telah siap untuk divalidasi.
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: VALIDASI & ERROR REPORT */}
          {/* ============================================================ */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Fatal Missing Header Error */}
              {isFatalMissingColumns ? (
                <div className="p-5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">Kolom Wajib Template Tidak Ditemukan!</h4>
                      <p className="text-xs text-rose-700">
                        Berkas Excel yang Anda unggah tidak memiliki kolom wajib: <br />
                        <span className="font-mono font-bold text-rose-900 bg-rose-200/60 px-2 py-0.5 rounded mt-1 inline-block">
                          {missingColumns.join(', ')}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-rose-700">
                    Sistem menolak impor untuk menjaga integritas database. Silakan unduh template resmi dan masukkan data sesuai judul kolom yang telah disediakan.
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadTemplateExcel(entityType)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4" /> Unduh Template Resmi (.xlsx)
                  </button>
                </div>
              ) : (
                <>
                  {/* Validation Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60">
                      <div className="text-xs text-blue-700 font-semibold">Total Data Terbaca</div>
                      <div className="text-2xl font-black text-blue-900 mt-1">{parsedRows.length}</div>
                      <div className="text-[11px] text-blue-600 mt-0.5">Baris Excel terisi</div>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
                      <div className="text-xs text-emerald-700 font-semibold flex items-center justify-between">
                        <span>Data Valid (Siap Impor)</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-black text-emerald-900 mt-1">{validRows.length}</div>
                      <div className="text-[11px] text-emerald-600 mt-0.5">Memenuhi seluruh validasi</div>
                    </div>

                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60">
                      <div className="text-xs text-rose-700 font-semibold flex items-center justify-between">
                        <span>Data Bermasalah (Ditolak)</span>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      </div>
                      <div className="text-2xl font-black text-rose-900 mt-1">{invalidRows.length}</div>
                      <div className="text-[11px] text-rose-600 mt-0.5">Akan dilewati secara aman</div>
                    </div>
                  </div>

                  {/* If Errors Exist: Show Table & Download Error Report */}
                  {invalidRows.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Tabel Rincian Kesalahan Validasi ({allErrors.length} Temuan):
                          </h4>
                          <p className="text-xs text-slate-500">
                            Hanya baris valid ({validRows.length}) yang akan diimpor. Baris di bawah tidak akan diimpor.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadErrorReportExcel(entityType, invalidRows)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Excel Baris Gagal (.xlsx)
                        </button>
                      </div>

                      {/* Error Table */}
                      <div className="border border-rose-200 rounded-xl overflow-hidden shadow-xs">
                        <div className="max-h-60 overflow-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-rose-100/70 text-rose-900 font-bold sticky top-0 border-b border-rose-200">
                              <tr>
                                <th className="px-3 py-2 w-24">Baris Excel</th>
                                <th className="px-3 py-2 w-36">Kolom</th>
                                <th className="px-3 py-2 w-44">Nilai Terbaca</th>
                                <th className="px-3 py-2">Pesan Kesalahan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-100 font-sans text-xs">
                              {allErrors.map((err, errIdx) => (
                                <tr key={errIdx} className="hover:bg-rose-50/50 bg-white">
                                  <td className="px-3 py-2 font-mono font-bold text-rose-700">
                                    Baris #{err.row}
                                  </td>
                                  <td className="px-3 py-2 font-semibold text-slate-800">
                                    {err.column}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-slate-600 truncate max-w-xs">
                                    {err.value !== undefined && err.value !== '' ? String(err.value) : '<kosong>'}
                                  </td>
                                  <td className="px-3 py-2 text-rose-700 font-medium">
                                    {err.message}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-sm">Semua Baris Data Sempurna & Valid!</div>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Seluruh {validRows.length} baris data memenuhi kriteria validasi unik, format email, dan referensi foreign key.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 4: KONFIRMASI */}
          {/* ============================================================ */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Konfirmasi Penyimpanan Impor ke Database
                    </h4>
                    <p className="text-xs text-slate-500">
                      Periksa ringkasan sebelum data dicatat secara permanen ke sistem CBT SMKN 1 Songgom
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Modul Entitas:</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {getEntityLabel(entityType)}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Total Baris:</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {parsedRows.length} Baris
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 block font-medium">Akan Diimpor:</span>
                    <span className="font-bold text-emerald-800 text-sm mt-0.5 block">
                      {validRows.length} Data
                    </span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-rose-700 block font-medium">Dilewati (Gagal):</span>
                    <span className="font-bold text-rose-800 text-sm mt-0.5 block">
                      {invalidRows.length} Data
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <b>Kebijakan Integritas:</b> Sistem menjamin tidak ada data rusak yang diimpor. Baris data yang tidak lolos validasi otomatis dilewati tanpa mengganggu baris yang valid.
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Saya mengonfirmasi bahwa data di atas telah diverifikasi dan siap diimpor ke sistem CBT SMKN 1 Songgom.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 5: PROSES IMPORT */}
          {/* ============================================================ */}
          {step === 5 && (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Sedang Memproses Impor Data ({validRows.length} entitas)...
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Memasukkan data ke dalam database terpusat, mengaitkan relasi foreign key, dan mengenkripsi akun pengguna jika ada.
              </p>
              <div className="max-w-md mx-auto w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 6: SELESAI (RINGKASAN HASIL) */}
          {/* ============================================================ */}
          {step === 6 && summary && (
            <div className="space-y-5">
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-emerald-950">
                  Proses Impor Berhasil Selesai!
                </h4>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  Data yang memenuhi syarat validasi telah berhasil disimpan ke database CBT SMKN 1 Songgom.
                </p>

                {/* Big Result Counters as requested in Prompt */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="px-6 py-3 bg-white rounded-xl border border-emerald-300 shadow-xs">
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Berhasil</div>
                    <div className="text-3xl font-black text-emerald-700">{summary.successCount}</div>
                  </div>
                  <div className="px-6 py-3 bg-white rounded-xl border border-rose-300 shadow-xs">
                    <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">Gagal</div>
                    <div className="text-3xl font-black text-rose-700">{summary.failedCount}</div>
                  </div>
                </div>

                {/* Login Credentials Notice */}
                {(entityType === 'siswa' || entityType === 'guru' || entityType === 'admin') && summary.successCount > 0 && (
                  <div className="mt-3 p-3 bg-white/80 rounded-xl border border-emerald-200 text-left">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Status Kredensial Login Supabase Auth:
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Akun login telah dibuat dan terkonfirmasi secara instan. Pengguna dapat langsung login ke aplikasi menggunakan <strong>Email</strong> ataupun <strong>{entityType === 'siswa' ? 'NIS' : 'NIP / ID'}</strong> dengan kata sandi yang tertera pada Excel (atau default: <em>{entityType === 'siswa' ? 'Siswa123!' : entityType === 'guru' ? 'Guru123!' : 'Admin123!'}</em>).
                    </p>
                  </div>
                )}
              </div>

              {/* Action if there are failed rows */}
              {summary.failedCount > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">
                      Terdapat {summary.failedCount} Baris yang Tidak Terimpor
                    </h5>
                    <p className="text-xs text-slate-500">
                      Unduh berkas Excel berisi baris gagal beserta alasan kegagalan untuk diperbaiki dan diimpor ulang.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadErrorReportExcel(entityType, summary.invalidRows)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
                  >
                    <Download className="w-4 h-4" /> Download Excel Baris Gagal (.xlsx)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {step > 1 && step < 5 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as WizardStep)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Batal
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Lanjutkan ke Validasi <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && !isFatalMissingColumns && (
              <button
                type="button"
                disabled={validRows.length === 0}
                onClick={() => setStep(4)}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
                  validRows.length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                Lanjut ke Konfirmasi ({validRows.length} Valid) <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                disabled={!isConfirmed || isImporting || validRows.length === 0}
                onClick={handleExecuteImport}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all ${
                  isConfirmed && validRows.length > 0 && !isImporting
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Database className="w-4 h-4" /> Mulai Import Data ({validRows.length} Item)
              </button>
            )}

            {step === 6 && (
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Selesai dan Tutup
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guide Modal for Questions */}
      <QuestionTemplateGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};
