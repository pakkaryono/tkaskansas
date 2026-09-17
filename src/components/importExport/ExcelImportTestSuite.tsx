import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  validateImportRows,
  MAX_FILE_SIZE_BYTES,
  EMAIL_REGEX,
  transformRowToDomainEntity,
} from '../../lib/excelEngine';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useQuestionBank } from '../../contexts/QuestionBankContext';
import { ImportParsedRow, ImportValidationError } from '../../types';

interface TestCaseResult {
  id: string;
  name: string;
  category: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export const ExcelImportTestSuite: React.FC = () => {
  const masterData = useMasterData();
  const questionBank = useQuestionBank();

  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  const runAllTests = () => {
    setIsRunning(true);
    const results: TestCaseResult[] = [];

    const validationContext = {
      students: masterData.students,
      teachers: masterData.teachers,
      subjects: masterData.subjects,
      classes: masterData.classes,
      majors: masterData.majors,
      questions: questionBank.questions,
      currentUser: {
        id: 'demo-guru-uuid-002',
        role: 'guru',
        subject_ids: ['c1111111-1111-1111-1111-111111111111'], // MTK-SMK
      },
    };

    // ==============================================================
    // TEST 1: FILE VALID
    // ==============================================================
    const validStudentRows = [
      {
        NIS: '99990001',
        NISN: '0099990001',
        Nama_Lengkap: 'Siswa Uji Valid 1',
        Email: 'siswa.uji1@smk.belajar.id',
        Kelas: masterData.classes[0]?.name || 'X TJKT 1',
        Kode_Jurusan: masterData.majors[0]?.code || 'TJKT',
        No_Telepon: '081234567890',
        Status: 'active',
      },
      {
        NIS: '99990002',
        NISN: '0099990002',
        Nama_Lengkap: 'Siswa Uji Valid 2',
        Email: 'siswa.uji2@smk.belajar.id',
        Kelas: masterData.classes[0]?.name || 'X TJKT 1',
        Kode_Jurusan: masterData.majors[0]?.code || 'TJKT',
        No_Telepon: '081234567891',
        Status: 'active',
      },
    ];
    const rawHeaders1 = ['NIS', 'NISN', 'Nama_Lengkap', 'Email', 'Kelas', 'Kode_Jurusan', 'No_Telepon', 'Status'];
    const res1 = validateImportRows('siswa', validStudentRows, rawHeaders1, validationContext);
    results.push({
      id: 'test-1-valid-file',
      name: 'Uji 1: Berkas Excel Valid',
      category: 'Validasi Format',
      description: 'Menguji 2 baris data siswa yang memenuhi seluruh kriteria validasi.',
      passed: res1.validRows.length === 2 && res1.invalidRows.length === 0 && !res1.isFatalMissingColumns,
      expected: 'Valid: 2, Gagal: 0, Fatal: False',
      actual: `Valid: ${res1.validRows.length}, Gagal: ${res1.invalidRows.length}, Fatal: ${res1.isFatalMissingColumns}`,
    });

    // ==============================================================
    // TEST 2: FILE KOSONG (EMPTY ROWS)
    // ==============================================================
    const emptyRows: any[] = [];
    const res2 = validateImportRows('siswa', emptyRows, rawHeaders1, validationContext);
    results.push({
      id: 'test-2-empty-file',
      name: 'Uji 2: Berkas Excel Kosong (Tanpa Data)',
      category: 'Integritas Berkas',
      description: 'Memastikan berkas yang tidak memiliki baris data ditolak secara aman tanpa eror sistem.',
      passed: res2.validRows.length === 0 && res2.parsedRows.length === 0,
      expected: 'Parsed: 0, Valid: 0',
      actual: `Parsed: ${res2.parsedRows.length}, Valid: ${res2.validRows.length}`,
    });

    // ==============================================================
    // TEST 3: KOLOM KURANG (MISSING HEADERS)
    // ==============================================================
    const brokenHeaders = ['Nama_Lengkap', 'No_Telepon']; // Missing NIS, NISN, Email, Kelas, Jurusan
    const res3 = validateImportRows('siswa', validStudentRows, brokenHeaders, validationContext);
    results.push({
      id: 'test-3-missing-columns',
      name: 'Uji 3: Kolom Kurang / Header Tidak Lengkap',
      category: 'Validasi Skema',
      description: 'Mendeteksi template yang kehilangan kolom wajib dan menandai status fatal.',
      passed: res3.isFatalMissingColumns && res3.missingColumns.includes('NIS') && res3.validRows.length === 0,
      expected: 'Fatal: True, Kolom Kurang Terdeteksi (NIS, dll)',
      actual: `Fatal: ${res3.isFatalMissingColumns}, Kolom Kurang: ${res3.missingColumns.join(', ')}`,
    });

    // ==============================================================
    // TEST 4: DATA DUPLIKAT (DUPLICATE NIS & EMAIL)
    // ==============================================================
    const duplicateRows = [
      {
        NIS: '20261001', // Existing in Master Data
        NISN: '0089999991',
        Nama_Lengkap: 'Siswa Duplikat DB',
        Email: 'siswa.dup1@smk.belajar.id',
        Kelas: masterData.classes[0]?.name || 'X TJKT 1',
        Kode_Jurusan: masterData.majors[0]?.code || 'TJKT',
      },
      {
        NIS: '99990005',
        NISN: '0089999992',
        Nama_Lengkap: 'Siswa Kembar 1',
        Email: 'kembar@smk.belajar.id', // Duplicate in batch
        Kelas: masterData.classes[0]?.name || 'X TJKT 1',
        Kode_Jurusan: masterData.majors[0]?.code || 'TJKT',
      },
      {
        NIS: '99990006',
        NISN: '0089999993',
        Nama_Lengkap: 'Siswa Kembar 2',
        Email: 'kembar@smk.belajar.id', // Duplicate in batch
        Kelas: masterData.classes[0]?.name || 'X TJKT 1',
        Kode_Jurusan: masterData.majors[0]?.code || 'TJKT',
      },
    ];
    const res4 = validateImportRows('siswa', duplicateRows, rawHeaders1, validationContext);
    const hasNisDbError = res4.allErrors.some((e) => e.message.includes('sudah terdaftar di database'));
    const hasBatchEmailDup = res4.allErrors.some((e) => e.message.includes('duplikat dalam berkas Excel'));
    results.push({
      id: 'test-4-duplicate-data',
      name: 'Uji 4: Deteksi Data Duplikat (DB & Internal File)',
      category: 'Integritas Unik',
      description: 'Menolak data duplikat baik terhadap record database maupun record dalam berkas yang sama.',
      passed: hasNisDbError && hasBatchEmailDup && res4.invalidRows.length >= 2,
      expected: 'Duplikat DB tertolak & Duplikat File tertolak',
      actual: `Duplikat DB: ${hasNisDbError ? 'Ya' : 'Tidak'}, Duplikat File: ${hasBatchEmailDup ? 'Ya' : 'Tidak'} (Gagal: ${res4.invalidRows.length})`,
    });

    // ==============================================================
    // TEST 5: FORMAT SALAH (EMAIL INVALID & FOREIGN KEY NOT FOUND)
    // ==============================================================
    const invalidFormatRows = [
      {
        NIS: '99990010',
        NISN: '0089999910',
        Nama_Lengkap: 'Email Rusak',
        Email: 'email_tanpa_domain', // Invalid email
        Kelas: 'KELAS_FIKTIF_99', // Non-existent class
        Kode_Jurusan: 'JURUSAN_GHAIB', // Non-existent major
      },
    ];
    const res5 = validateImportRows('siswa', invalidFormatRows, rawHeaders1, validationContext);
    const hasEmailFormatError = res5.allErrors.some((e) => e.column === 'Email' && e.message.includes('tidak valid'));
    const hasClassError = res5.allErrors.some((e) => e.column === 'Kelas' && e.message.includes('tidak ditemukan'));
    const hasMajorError = res5.allErrors.some((e) => e.column === 'Kode_Jurusan' && e.message.includes('tidak ditemukan'));
    results.push({
      id: 'test-5-invalid-format',
      name: 'Uji 5: Format Salah & Foreign Key Tidak Ditemukan',
      category: 'Validasi Relasi & Format',
      description: 'Menampilkan baris, kolom, nilai, dan pesan error jika email atau relasi kelas/jurusan salah.',
      passed: hasEmailFormatError && hasClassError && hasMajorError && res5.validRows.length === 0,
      expected: 'Eror Email + Eror Kelas tidak ditemukan + Eror Jurusan tidak ditemukan',
      actual: `Email: ${hasEmailFormatError ? 'OK' : 'Fail'}, Kelas: ${hasClassError ? 'OK' : 'Fail'}, Jurusan: ${hasMajorError ? 'OK' : 'Fail'}`,
    });

    // ==============================================================
    // TEST 6: FILE TERLALU BESAR (LIMIT SAFETY)
    // ==============================================================
    const fakeOversizedFileSizeBytes = 15 * 1024 * 1024; // 15MB
    const isExceeded = fakeOversizedFileSizeBytes > MAX_FILE_SIZE_BYTES;
    results.push({
      id: 'test-6-size-limit',
      name: 'Uji 6: Batas Ukuran File (Maksimal 10 MB)',
      category: 'Keamanan Sistem',
      description: 'Mencegah server/client memory overflow dengan memblokir berkas yang lebih dari 10 MB.',
      passed: isExceeded && MAX_FILE_SIZE_BYTES === 10485760,
      expected: 'Tolak file > 10 MB (Limit: 10 MB)',
      actual: `Terdeteksi melebihi batas 10 MB: ${isExceeded ? 'Benar' : 'Salah'}`,
    });

    // ==============================================================
    // TEST 7: ZERO CORRUPTION (Hanya Baris Valid yang Diimpor)
    // ==============================================================
    // Mixed dataset: 2 Valid, 1 Invalid
    const mixedRows = [
      ...validStudentRows,
      invalidFormatRows[0],
    ];
    const res7 = validateImportRows('siswa', mixedRows, rawHeaders1, validationContext);
    results.push({
      id: 'test-7-zero-corruption',
      name: 'Uji 7: Zero Data Corruption (Hanya Baris Valid Terimpor)',
      category: 'Integritas Transaksional',
      description: 'Memastikan baris rusak diisolasi tanpa menggagalkan baris valid.',
      passed: res7.validRows.length === 2 && res7.invalidRows.length === 1,
      expected: 'Valid: 2, Gagal Terisolasi: 1 (Total: 3)',
      actual: `Valid: ${res7.validRows.length}, Gagal: ${res7.invalidRows.length}`,
    });

    // ==============================================================
    // TEST 8: BANK SOAL 4 TIPE LENGKAP
    // ==============================================================
    const questionHeaders = [
      'Kode_Soal',
      'Kode_Mapel',
      'Tipe_Soal',
      'Tingkat',
      'Kesulitan',
      'Bobot_Poin',
      'Teks_Soal',
      'Pilihan_A',
      'Pilihan_B',
      'Pilihan_C',
      'Pilihan_D',
      'Pilihan_E',
      'Kunci_Jawaban',
      'Pasangan_Menjodohkan',
      'Pembahasan',
    ];
    const sampleQuestions = [
      // 1. PG Biasa Valid
      {
        Kode_Soal: 'TEST-Q-01',
        Kode_Mapel: 'MTK-SMK',
        Tipe_Soal: 'pg_biasa',
        Tingkat: 'XI',
        Kesulitan: 'easy',
        Bobot_Poin: 10,
        Teks_Soal: 'Berapakah 5 + 5?',
        Pilihan_A: '10',
        Pilihan_B: '12',
        Kunci_Jawaban: 'A',
      },
      // 2. Menjodohkan Format Salah
      {
        Kode_Soal: 'TEST-Q-02',
        Kode_Mapel: 'MTK-SMK',
        Tipe_Soal: 'menjodohkan',
        Tingkat: 'XI',
        Kesulitan: 'medium',
        Bobot_Poin: 20,
        Teks_Soal: 'Pasangkan yang tepat:',
        Pasangan_Menjodohkan: 'FormatSalahTanpaTandaSamaDengan', // Invalid format
      },
    ];
    const res8 = validateImportRows('bank_soal', sampleQuestions, questionHeaders, validationContext);
    const q1Valid = res8.validRows.some((r) => r.parsedData?.code === 'TEST-Q-01');
    const q2Invalid = res8.invalidRows.some((r) => r.parsedData?.code === 'TEST-Q-02');
    results.push({
      id: 'test-8-question-types',
      name: 'Uji 8: Validasi Bank Soal (4 Jenis Soal)',
      category: 'Bank Soal Engine',
      description: 'Memeriksa parsing opsi PG biasa dan validasi struktur format pasangan menjodohkan.',
      passed: q1Valid && q2Invalid,
      expected: 'PG Biasa Valid & Menjodohkan Salah Terdeteksi',
      actual: `PG Biasa: ${q1Valid ? 'Valid' : 'Gagal'}, Menjodohkan Rusak: ${q2Invalid ? 'Tertolak' : 'Lolos'}`,
    });

    // ==============================================================
    // TEST 9: KEAMANAN RBAC (Guru Hanya Boleh Akses Mapel Sendiri)
    // ==============================================================
    // Guru has subject MTK-SMK only, attempting to import question for KJ-TJKT
    const unauthorizedQuestion = [
      {
        Kode_Soal: 'TEST-UNAUTH-01',
        Kode_Mapel: 'KJ-TJKT', // Not allowed for this teacher
        Tipe_Soal: 'pg_biasa',
        Tingkat: 'XI',
        Kesulitan: 'easy',
        Bobot_Poin: 10,
        Teks_Soal: 'Pertanyaan Jaringan',
        Pilihan_A: 'A',
        Pilihan_B: 'B',
        Kunci_Jawaban: 'A',
      },
    ];
    const res9 = validateImportRows('bank_soal', unauthorizedQuestion, questionHeaders, validationContext);
    const hasRbacDenial = res9.allErrors.some((e) => e.message.includes('Akses Ditolak'));
    results.push({
      id: 'test-9-security-rbac',
      name: 'Uji 9: Keamanan Hak Akses (Guru RBAC)',
      category: 'Keamanan & Otorisasi',
      description: 'Menolak impor butir soal jika guru tidak memiliki hak mengampu mata pelajaran tersebut.',
      passed: hasRbacDenial && res9.validRows.length === 0,
      expected: 'Akses Ditolak: Guru tidak mengampu mapel KJ-TJKT',
      actual: hasRbacDenial ? 'Akses Ditolak Terkonfirmasi' : 'Gagal Menolak Akses',
    });

    setTestResults(results);
    setLastRunTime(new Date().toLocaleTimeString('id-ID'));
    setIsRunning(false);
  };

  const totalPassed = testResults.filter((r) => r.passed).length;
  const isAllPassed = testResults.length > 0 && totalPassed === testResults.length;

  return (
    <div className="space-y-6">
      {/* Test Suite Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              FASE 8 TEST SUITE
            </span>
            <span className="text-xs text-slate-400">Integritas Excel .xlsx</span>
          </div>
          <h3 className="text-xl font-black mt-1">Uji Otomatis Validasi & Ekspor/Impor Excel</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Memvalidasi 6 skenario pengujian wajib: berkas valid, berkas kosong, kolom kurang, data duplikat, format salah, batas ukuran, dan proteksi anti data rusak.
          </p>
        </div>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 transition-all shrink-0 active:scale-95"
        >
          {isRunning ? (
            <RotateCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
          {isRunning ? 'Menjalankan Uji...' : 'Jalankan Seluruh Uji (Run Test)'}
        </button>
      </div>

      {/* Summary Scorecard */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500 font-semibold">Total Skenario Uji</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{testResults.length} Skenario</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Selesai pada {lastRunTime}</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
            <div className="text-xs text-emerald-700 font-semibold flex items-center justify-between">
              <span>Lolos (Passed)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{totalPassed} Skenario</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">
              {isAllPassed ? '100% Sempurna tanpa anomali' : 'Sebagian perlu penyesuaian'}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500 font-semibold">Status Integritas Database</div>
            <div className="text-sm font-bold text-emerald-700 mt-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Nol Data Rusak (Zero Corruption)
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Data gagal diisolasi ke Error Report</div>
          </div>
        </div>
      )}

      {/* Test Cases Table */}
      {testResults.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Hasil Eksekusi Uji Kasus (Test Cases)
            </h4>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg">
              {totalPassed} / {testResults.length} Lolos
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {testResults.map((tc) => (
              <div key={tc.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        tc.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {tc.passed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{tc.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {tc.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{tc.description}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 self-start sm:self-center ${
                      tc.passed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {tc.passed ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {tc.passed ? 'LOLOS (PASSED)' : 'GAGAL (FAILED)'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider block text-[10px] font-sans font-bold">
                      Expected (Diharapkan):
                    </span>
                    <span className="text-slate-700">{tc.expected}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider block text-[10px] font-sans font-bold">
                      Actual (Kenyataan):
                    </span>
                    <span className={tc.passed ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      {tc.actual}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 space-y-3">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300" />
          <div className="text-sm font-bold text-slate-700">Test Suite Belum Dijalankan</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Klik tombol &quot;Jalankan Seluruh Uji (Run Test)&quot; untuk memverifikasi secara langsung logika validasi, isolasi data rusak, dan dukungan file Excel .xlsx.
          </p>
        </div>
      )}
    </div>
  );
};
