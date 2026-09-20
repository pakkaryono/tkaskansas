import * as XLSX from 'xlsx';
import {
  ImportEntityType,
  ImportValidationError,
  ImportParsedRow,
  Student,
  Teacher,
  Subject,
  SchoolClass,
  Major,
  Question,
  QuestionType,
  ScoringMethod,
  DifficultyLevel,
} from '../types';

// Maximum file size: 10MB
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Expected header definitions per entity
export const ENTITY_COLUMNS: Record<
  ImportEntityType,
  { key: string; label: string; required: boolean; description: string }[]
> = {
  siswa: [
    { key: 'nis', label: 'NIS', required: true, description: 'Nomor Induk Siswa (unik, angka/teks, contoh: 20261001)' },
    { key: 'nisn', label: 'NISN', required: true, description: 'Nomor Induk Siswa Nasional (10 digit, contoh: 0081234567)' },
    { key: 'full_name', label: 'Nama_Lengkap', required: true, description: 'Nama lengkap siswa' },
    { key: 'email', label: 'Email', required: true, description: 'Email unik dan valid untuk login' },
    { key: 'class_name', label: 'Kelas', required: true, description: 'Nama kelas yang sudah terdaftar (contoh: X TJKT 1)' },
    { key: 'major_code', label: 'Kode_Jurusan', required: true, description: 'Kode jurusan terdaftar (contoh: TJKT, TKRO, AKL, DKV, MPLB)' },
    { key: 'phone_number', label: 'No_Telepon', required: false, description: 'Nomor WhatsApp / telepon siswa' },
    { key: 'status', label: 'Status', required: false, description: 'active / inactive (default: active)' },
    { key: 'initial_password', label: 'Password_Awal', required: false, description: 'Password login awal (opsional, min 6 karakter)' },
  ],
  guru: [
    { key: 'nip', label: 'NIP', required: true, description: 'NIP / NUPTK guru (unik, contoh: 198205122010011005)' },
    { key: 'full_name', label: 'Nama_Lengkap', required: true, description: 'Nama lengkap beserta gelar (contoh: Ahmad Suhendro, M.Kom)' },
    { key: 'email', label: 'Email', required: true, description: 'Email resmi guru untuk login CBT' },
    { key: 'phone_number', label: 'No_Telepon', required: false, description: 'Nomor HP aktif' },
    { key: 'subject_codes', label: 'Kode_Mata_Pelajaran', required: true, description: 'Kode mapel yang diampu, dipisahkan koma jika lebih dari 1 (contoh: MTK-SMK, KJ-TJKT)' },
    { key: 'status', label: 'Status', required: false, description: 'active / inactive (default: active)' },
    { key: 'initial_password', label: 'Password_Awal', required: false, description: 'Password login guru (opsional, min 6 karakter)' },
  ],
  admin: [
    { key: 'full_name', label: 'Nama_Lengkap', required: true, description: 'Nama lengkap Administrator / Operator' },
    { key: 'email', label: 'Email', required: true, description: 'Email unik admin untuk login CBT (contoh: admin2@smkn1songgom.sch.id)' },
    { key: 'phone_number', label: 'No_Telepon', required: false, description: 'Nomor WhatsApp / telepon aktif' },
    { key: 'nip', label: 'NIP_ID', required: false, description: 'NIP atau NIK/ID Admin (opsional)' },
    { key: 'status', label: 'Status', required: false, description: 'active / inactive (default: active)' },
    { key: 'initial_password', label: 'Password_Awal', required: false, description: 'Password login admin (opsional, min 6 karakter, default: Admin123!)' },
  ],
  mapel: [
    { key: 'code', label: 'Kode_Mapel', required: true, description: 'Kode unik mapel (contoh: MTK-SMK, KJ-TJKT)' },
    { key: 'name', label: 'Nama_Mapel', required: true, description: 'Nama lengkap mata pelajaran' },
    { key: 'grade', label: 'Tingkat_Kelas', required: true, description: 'X / XI / XII / Semua' },
    { key: 'major_code', label: 'Kode_Jurusan', required: false, description: 'Kode jurusan pengampu (kosongkan jika Mapel Umum)' },
    { key: 'pass_score', label: 'KKM', required: true, description: 'Nilai Kriteria Ketuntasan Minimal (skala 0-100, contoh: 75)' },
    { key: 'subject_group', label: 'Kelompok', required: false, description: 'Umum / Kejuruan / Pilihan (default: Kejuruan)' },
    { key: 'description', label: 'Deskripsi', required: false, description: 'Deskripsi silabus mapel' },
    { key: 'status', label: 'Status', required: false, description: 'active / inactive (default: active)' },
  ],
  kelas: [
    { key: 'name', label: 'Nama_Kelas', required: true, description: 'Nama rombongan belajar (contoh: X TJKT 1, XI TKRO 2)' },
    { key: 'grade', label: 'Tingkat', required: true, description: 'Tingkat rombel: X / XI / XII' },
    { key: 'major_code', label: 'Kode_Jurusan', required: true, description: 'Kode jurusan (harus terdaftar, contoh: TJKT)' },
    { key: 'academic_year', label: 'Tahun_Ajaran', required: true, description: 'Format tahun ajaran: 2026/2027' },
    { key: 'status', label: 'Status', required: false, description: 'active / inactive (default: active)' },
  ],
  jurusan: [
    { key: 'code', label: 'Kode_Jurusan', required: true, description: 'Kode singkatan unik jurusan (contoh: TJKT, TKRO, AKL)' },
    { key: 'name', label: 'Nama_Jurusan', required: true, description: 'Nama program keahlian lengkap' },
    { key: 'description', label: 'Deskripsi', required: false, description: 'Fokus dan kompetensi keahlian' },
    { key: 'status', label: 'Status', required: false, description: 'active / inactive (default: active)' },
  ],
  bank_soal: [
    { key: 'code', label: 'Kode_Soal', required: true, description: 'Kode unik butir soal (contoh: SOAL-MTK-101)' },
    { key: 'subject_code', label: 'Kode_Mapel', required: true, description: 'Kode mapel yang terdaftar (contoh: MTK-SMK)' },
    { key: 'question_type', label: 'Tipe_Soal', required: true, description: 'Pilihan: pg_biasa | pg_kompleks | esai | menjodohkan' },
    { key: 'grade', label: 'Tingkat', required: true, description: 'Tingkat kelas: X | XI | XII' },
    { key: 'difficulty', label: 'Kesulitan', required: true, description: 'Tingkat kesulitan: easy | medium | hard' },
    { key: 'points', label: 'Bobot_Poin', required: true, description: 'Bobot nilai soal (contoh: 10, 20)' },
    { key: 'question_text', label: 'Teks_Soal', required: true, description: 'Teks pertanyaan/soal (bisa teks biasa atau tag html)' },
    { key: 'option_a', label: 'Pilihan_A', required: false, description: 'Teks Opsi A (Wajib untuk PG dan PG Kompleks)' },
    { key: 'option_b', label: 'Pilihan_B', required: false, description: 'Teks Opsi B (Wajib untuk PG dan PG Kompleks)' },
    { key: 'option_c', label: 'Pilihan_C', required: false, description: 'Teks Opsi C (Wajib untuk PG dan PG Kompleks)' },
    { key: 'option_d', label: 'Pilihan_D', required: false, description: 'Teks Opsi D (Wajib untuk PG dan PG Kompleks)' },
    { key: 'option_e', label: 'Pilihan_E', required: false, description: 'Teks Opsi E (Opsional jika hanya 4 opsi)' },
    { key: 'answer_key', label: 'Kunci_Jawaban', required: false, description: 'Untuk PG: A. Untuk PG Kompleks: A, C. Untuk Esai: Kunci referensi / kata kunci' },
    { key: 'matching_pairs', label: 'Pasangan_Menjodohkan', required: false, description: 'Format: Kiri 1 = Kanan A | Kiri 2 = Kanan B | Kiri 3 = Kanan C (Khusus Menjodohkan)' },
    { key: 'explanation', label: 'Pembahasan', required: false, description: 'Penjelasan/pembahasan kunci jawaban untuk guru & siswa' },
  ],
};

export type { ImportEntityType };

export function getTemplateColumns(entityType: ImportEntityType): string[] {
  return (ENTITY_COLUMNS[entityType] || []).map((col) => col.label);
}

// Helper: normalize header string to key
export function normalizeHeader(header: string): string {
  if (!header) return '';
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, '_');
}

// Regex for validating email
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Parse Excel file (.xlsx) into sheet name, raw rows, and headers
export async function parseExcelFile(
  file: File
): Promise<{ sheetName: string; rows: any[]; rawHeaders: string[] }> {
  // Check file type
  const isXlsx =
    file.name.toLowerCase().endsWith('.xlsx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.name.toLowerCase().endsWith('.xls');

  if (!isXlsx) {
    throw new Error('Format file tidak didukung. Mohon unggah berkas berekstensi .xlsx');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 10 MB`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Berkas Excel kosong atau tidak memiliki lembar kerja (worksheet).');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON array of objects (using first row as header)
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Extract raw headers from the worksheet range
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const rawHeaders: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c });
    const cell = worksheet[cellAddress];
    if (cell && cell.v !== undefined && cell.v !== null) {
      rawHeaders.push(String(cell.v).trim());
    }
  }

  return { sheetName, rows, rawHeaders };
}

// Map raw row object using normalized header matches
export function mapRowToEntityKeys(
  rawRow: Record<string, any>,
  entityType: ImportEntityType
): Record<string, any> {
  const schema = ENTITY_COLUMNS[entityType];
  const mapped: Record<string, any> = {};

  // Build a lookup map of normalized raw keys
  const rawKeyMap: Record<string, string> = {};
  for (const k of Object.keys(rawRow)) {
    rawKeyMap[normalizeHeader(k)] = k;
  }

  for (const col of schema) {
    const normKey = normalizeHeader(col.key);
    const normLabel = normalizeHeader(col.label);

    const actualKey = rawKeyMap[normLabel] || rawKeyMap[normKey];
    if (actualKey !== undefined) {
      const val = rawRow[actualKey];
      mapped[col.key] = val !== undefined && val !== null ? String(val).trim() : '';
    } else {
      mapped[col.key] = '';
    }
  }

  return mapped;
}

// Validation Context Interfaces
export interface ValidationContextData {
  students: Student[];
  teachers: Teacher[];
  subjects: Subject[];
  classes: SchoolClass[];
  majors: Major[];
  questions: Question[];
  currentUser?: {
    id: string;
    role: string;
    subject_ids?: string[];
  };
}

// Main Validation Engine
export function validateImportRows(
  entityType: ImportEntityType,
  rawRows: any[],
  rawHeaders: string[],
  context: ValidationContextData
): {
  parsedRows: ImportParsedRow[];
  validRows: ImportParsedRow[];
  invalidRows: ImportParsedRow[];
  allErrors: ImportValidationError[];
  missingColumns: string[];
  isFatalMissingColumns: boolean;
} {
  const schema = ENTITY_COLUMNS[entityType];
  const normalizedRawHeaders = rawHeaders.map(normalizeHeader);

  // Check required columns in raw headers
  const missingColumns: string[] = [];
  for (const col of schema) {
    if (col.required) {
      const normKey = normalizeHeader(col.key);
      const normLabel = normalizeHeader(col.label);
      const found = normalizedRawHeaders.some((h) => h === normKey || h === normLabel);
      if (!found) {
        missingColumns.push(col.label);
      }
    }
  }

  if (missingColumns.length > 0) {
    return {
      parsedRows: [],
      validRows: [],
      invalidRows: [],
      allErrors: [
        {
          row: 1,
          column: 'Header Template',
          value: rawHeaders.join(', '),
          message: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}. Silakan gunakan Template Excel resmi.`,
        },
      ],
      missingColumns,
      isFatalMissingColumns: true,
    };
  }

  // Tracking for internal duplicate detection within the current batch
  const seenNis = new Set<string>();
  const seenNisn = new Set<string>();
  const seenNip = new Set<string>();
  const seenEmails = new Set<string>();
  const seenSubjectCodes = new Set<string>();
  const seenClassNames = new Set<string>();
  const seenMajorCodes = new Set<string>();
  const seenQuestionCodes = new Set<string>();

  const parsedRows: ImportParsedRow[] = [];
  const allErrors: ImportValidationError[] = [];

  rawRows.forEach((rawRow, idx) => {
    // Excel row is 1-indexed, with header on row 1, so data starts at row 2
    const excelRowNum = idx + 2;
    const errors: ImportValidationError[] = [];
    const mapped = mapRowToEntityKeys(rawRow, entityType);

    // Skip row if it is completely empty
    const isRowCompletelyEmpty = Object.values(mapped).every((v) => !v || v === '');
    if (isRowCompletelyEmpty) {
      return;
    }

    // -------------------------------------------------------------
    // VALIDASI: SISWA
    // -------------------------------------------------------------
    if (entityType === 'siswa') {
      const nis = mapped.nis;
      const nisn = mapped.nisn;
      const fullName = mapped.full_name;
      const email = mapped.email;
      const className = mapped.class_name;
      const majorCode = mapped.major_code;

      // NIS
      if (!nis) {
        errors.push({ row: excelRowNum, column: 'NIS', value: nis, message: 'NIS tidak boleh kosong.' });
      } else {
        if (seenNis.has(nis)) {
          errors.push({ row: excelRowNum, column: 'NIS', value: nis, message: `NIS '${nis}' duplikat dalam berkas Excel.` });
        } else if (context.students.some((s) => s.nis.toLowerCase() === nis.toLowerCase())) {
          errors.push({ row: excelRowNum, column: 'NIS', value: nis, message: `NIS '${nis}' sudah terdaftar di database.` });
        } else {
          seenNis.add(nis);
        }
      }

      // NISN
      if (!nisn) {
        errors.push({ row: excelRowNum, column: 'NISN', value: nisn, message: 'NISN tidak boleh kosong.' });
      } else {
        if (seenNisn.has(nisn)) {
          errors.push({ row: excelRowNum, column: 'NISN', value: nisn, message: `NISN '${nisn}' duplikat dalam berkas Excel.` });
        } else if (context.students.some((s) => s.nisn.toLowerCase() === nisn.toLowerCase())) {
          errors.push({ row: excelRowNum, column: 'NISN', value: nisn, message: `NISN '${nisn}' sudah terdaftar di database.` });
        } else {
          seenNisn.add(nisn);
        }
      }

      // Nama Lengkap
      if (!fullName) {
        errors.push({ row: excelRowNum, column: 'Nama_Lengkap', value: fullName, message: 'Nama lengkap wajib diisi.' });
      }

      // Email
      if (!email) {
        errors.push({ row: excelRowNum, column: 'Email', value: email, message: 'Email tidak boleh kosong.' });
      } else if (!EMAIL_REGEX.test(email)) {
        errors.push({ row: excelRowNum, column: 'Email', value: email, message: `Format email '${email}' tidak valid.` });
      } else {
        if (seenEmails.has(email.toLowerCase())) {
          errors.push({ row: excelRowNum, column: 'Email', value: email, message: `Email '${email}' duplikat dalam berkas Excel.` });
        } else if (
          context.students.some((s) => s.email.toLowerCase() === email.toLowerCase()) ||
          context.teachers.some((t) => t.email.toLowerCase() === email.toLowerCase())
        ) {
          errors.push({ row: excelRowNum, column: 'Email', value: email, message: `Email '${email}' sudah digunakan oleh pengguna lain.` });
        } else {
          seenEmails.add(email.toLowerCase());
        }
      }

      // Kelas
      const matchedClass = context.classes.find(
        (c) => c.name.toLowerCase() === className.toLowerCase() || c.id === className
      );
      if (!className) {
        errors.push({ row: excelRowNum, column: 'Kelas', value: className, message: 'Kelas tidak boleh kosong.' });
      } else if (!matchedClass) {
        errors.push({
          row: excelRowNum,
          column: 'Kelas',
          value: className,
          message: `Kelas '${className}' tidak ditemukan dalam master data kelas.`,
        });
      }

      // Jurusan
      const matchedMajor = context.majors.find(
        (m) =>
          m.code.toLowerCase() === majorCode.toLowerCase() ||
          m.name.toLowerCase() === majorCode.toLowerCase() ||
          m.id === majorCode
      );
      if (!majorCode) {
        errors.push({ row: excelRowNum, column: 'Kode_Jurusan', value: majorCode, message: 'Kode Jurusan tidak boleh kosong.' });
      } else if (!matchedMajor) {
        errors.push({
          row: excelRowNum,
          column: 'Kode_Jurusan',
          value: majorCode,
          message: `Jurusan '${majorCode}' tidak ditemukan dalam master data jurusan.`,
        });
      }
    }

    // -------------------------------------------------------------
    // VALIDASI: GURU
    // -------------------------------------------------------------
    else if (entityType === 'guru') {
      const nip = mapped.nip;
      const fullName = mapped.full_name;
      const email = mapped.email;
      const subjectCodesRaw = mapped.subject_codes;

      // NIP
      if (!nip) {
        errors.push({ row: excelRowNum, column: 'NIP', value: nip, message: 'NIP / NUPTK tidak boleh kosong.' });
      } else {
        if (seenNip.has(nip)) {
          errors.push({ row: excelRowNum, column: 'NIP', value: nip, message: `NIP '${nip}' duplikat dalam berkas Excel.` });
        } else if (context.teachers.some((t) => t.nip.toLowerCase() === nip.toLowerCase())) {
          errors.push({ row: excelRowNum, column: 'NIP', value: nip, message: `NIP '${nip}' sudah terdaftar di database.` });
        } else {
          seenNip.add(nip);
        }
      }

      // Nama Lengkap
      if (!fullName) {
        errors.push({ row: excelRowNum, column: 'Nama_Lengkap', value: fullName, message: 'Nama lengkap guru wajib diisi.' });
      }

      // Email
      if (!email) {
        errors.push({ row: excelRowNum, column: 'Email', value: email, message: 'Email guru tidak boleh kosong.' });
      } else if (!EMAIL_REGEX.test(email)) {
        errors.push({ row: excelRowNum, column: 'Email', value: email, message: `Format email '${email}' tidak valid.` });
      } else {
        if (seenEmails.has(email.toLowerCase())) {
          errors.push({ row: excelRowNum, column: 'Email', value: email, message: `Email '${email}' duplikat dalam berkas Excel.` });
        } else if (
          context.teachers.some((t) => t.email.toLowerCase() === email.toLowerCase()) ||
          context.students.some((s) => s.email.toLowerCase() === email.toLowerCase())
        ) {
          errors.push({ row: excelRowNum, column: 'Email', value: email, message: `Email '${email}' sudah digunakan di database.` });
        } else {
          seenEmails.add(email.toLowerCase());
        }
      }

      // Kode Mata Pelajaran
      if (!subjectCodesRaw) {
        errors.push({ row: excelRowNum, column: 'Kode_Mata_Pelajaran', value: subjectCodesRaw, message: 'Kode mata pelajaran wajib diisi.' });
      } else {
        const codes = subjectCodesRaw
          .split(',')
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);

        if (codes.length === 0) {
          errors.push({ row: excelRowNum, column: 'Kode_Mata_Pelajaran', value: subjectCodesRaw, message: 'Mata pelajaran tidak boleh kosong.' });
        } else {
          for (const code of codes) {
            const foundSubject = context.subjects.find(
              (s) => s.code.toLowerCase() === code.toLowerCase() || s.name.toLowerCase() === code.toLowerCase()
            );
            if (!foundSubject) {
              errors.push({
                row: excelRowNum,
                column: 'Kode_Mata_Pelajaran',
                value: code,
                message: `Kode mapel '${code}' tidak ditemukan di sistem.`,
              });
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // VALIDASI: ADMIN / OPERATOR
    // -------------------------------------------------------------
    else if (entityType === 'admin') {
      const fullName = mapped.full_name;
      const email = mapped.email;
      const initialPassword = mapped.initial_password;

      // Nama Lengkap
      if (!fullName) {
        errors.push({ row: excelRowNum, column: 'Nama_Lengkap', value: fullName, message: 'Nama lengkap admin wajib diisi.' });
      }

      // Email
      if (!email) {
        errors.push({ row: excelRowNum, column: 'Email', value: email, message: 'Email admin tidak boleh kosong.' });
      } else if (!EMAIL_REGEX.test(email)) {
        errors.push({ row: excelRowNum, column: 'Email', value: email, message: `Format email '${email}' tidak valid.` });
      } else {
        if (seenEmails.has(email.toLowerCase())) {
          errors.push({ row: excelRowNum, column: 'Email', value: email, message: `Email '${email}' duplikat dalam berkas Excel.` });
        } else {
          seenEmails.add(email.toLowerCase());
        }
      }

      // Password awal jika diisi
      if (initialPassword && initialPassword.length < 6) {
        errors.push({ row: excelRowNum, column: 'Password_Awal', value: initialPassword, message: 'Kata sandi minimal 6 karakter.' });
      }
    }

    // -------------------------------------------------------------
    // VALIDASI: MATA PELAJARAN
    // -------------------------------------------------------------
    else if (entityType === 'mapel') {
      const code = mapped.code;
      const name = mapped.name;
      const grade = mapped.grade;
      const majorCode = mapped.major_code;
      const passScore = parseFloat(mapped.pass_score);

      // Kode Mapel
      if (!code) {
        errors.push({ row: excelRowNum, column: 'Kode_Mapel', value: code, message: 'Kode mapel wajib diisi.' });
      } else {
        if (seenSubjectCodes.has(code.toUpperCase())) {
          errors.push({ row: excelRowNum, column: 'Kode_Mapel', value: code, message: `Kode mapel '${code}' duplikat dalam file Excel.` });
        } else if (context.subjects.some((s) => s.code.toUpperCase() === code.toUpperCase())) {
          errors.push({ row: excelRowNum, column: 'Kode_Mapel', value: code, message: `Kode mapel '${code}' sudah terdaftar di database.` });
        } else {
          seenSubjectCodes.add(code.toUpperCase());
        }
      }

      // Nama Mapel
      if (!name) {
        errors.push({ row: excelRowNum, column: 'Nama_Mapel', value: name, message: 'Nama mapel wajib diisi.' });
      }

      // Grade
      if (!grade) {
        errors.push({ row: excelRowNum, column: 'Tingkat_Kelas', value: grade, message: 'Tingkat kelas wajib diisi (X, XI, XII, Semua).' });
      } else if (!['X', 'XI', 'XII', 'Semua'].includes(grade)) {
        errors.push({ row: excelRowNum, column: 'Tingkat_Kelas', value: grade, message: `Tingkat '${grade}' tidak valid. Harus X, XI, XII, atau Semua.` });
      }

      // KKM
      if (isNaN(passScore) || passScore < 0 || passScore > 100) {
        errors.push({ row: excelRowNum, column: 'KKM', value: mapped.pass_score, message: 'KKM harus berupa angka rentang 0 s/d 100.' });
      }

      // Jurusan (jika diisi)
      if (majorCode && majorCode !== '-' && majorCode.toLowerCase() !== 'semua') {
        const foundMajor = context.majors.find(
          (m) => m.code.toLowerCase() === majorCode.toLowerCase()
        );
        if (!foundMajor) {
          errors.push({ row: excelRowNum, column: 'Kode_Jurusan', value: majorCode, message: `Jurusan '${majorCode}' tidak ditemukan.` });
        }
      }
    }

    // -------------------------------------------------------------
    // VALIDASI: KELAS
    // -------------------------------------------------------------
    else if (entityType === 'kelas') {
      const name = mapped.name;
      const grade = mapped.grade;
      const majorCode = mapped.major_code;
      const academicYear = mapped.academic_year;

      // Nama Kelas
      if (!name) {
        errors.push({ row: excelRowNum, column: 'Nama_Kelas', value: name, message: 'Nama kelas wajib diisi.' });
      } else {
        if (seenClassNames.has(name.toLowerCase())) {
          errors.push({ row: excelRowNum, column: 'Nama_Kelas', value: name, message: `Nama kelas '${name}' duplikat dalam file Excel.` });
        } else if (context.classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
          errors.push({ row: excelRowNum, column: 'Nama_Kelas', value: name, message: `Nama kelas '${name}' sudah terdaftar di database.` });
        } else {
          seenClassNames.add(name.toLowerCase());
        }
      }

      // Tingkat
      if (!grade || !['X', 'XI', 'XII'].includes(grade)) {
        errors.push({ row: excelRowNum, column: 'Tingkat', value: grade, message: "Tingkat kelas harus 'X', 'XI', atau 'XII'." });
      }

      // Jurusan
      const matchedMajor = context.majors.find(
        (m) => m.code.toLowerCase() === majorCode.toLowerCase()
      );
      if (!majorCode) {
        errors.push({ row: excelRowNum, column: 'Kode_Jurusan', value: majorCode, message: 'Kode jurusan wajib diisi.' });
      } else if (!matchedMajor) {
        errors.push({ row: excelRowNum, column: 'Kode_Jurusan', value: majorCode, message: `Jurusan '${majorCode}' tidak ditemukan.` });
      }

      // Tahun Ajaran
      if (!academicYear) {
        errors.push({ row: excelRowNum, column: 'Tahun_Ajaran', value: academicYear, message: 'Tahun ajaran wajib diisi (contoh: 2026/2027).' });
      }
    }

    // -------------------------------------------------------------
    // VALIDASI: JURUSAN
    // -------------------------------------------------------------
    else if (entityType === 'jurusan') {
      const code = mapped.code;
      const name = mapped.name;

      if (!code) {
        errors.push({ row: excelRowNum, column: 'Kode_Jurusan', value: code, message: 'Kode jurusan wajib diisi.' });
      } else {
        if (seenMajorCodes.has(code.toUpperCase())) {
          errors.push({ row: excelRowNum, column: 'Kode_Jurusan', value: code, message: `Kode jurusan '${code}' duplikat dalam file Excel.` });
        } else if (context.majors.some((m) => m.code.toUpperCase() === code.toUpperCase())) {
          errors.push({ row: excelRowNum, column: 'Kode_Jurusan', value: code, message: `Kode jurusan '${code}' sudah terdaftar.` });
        } else {
          seenMajorCodes.add(code.toUpperCase());
        }
      }

      if (!name) {
        errors.push({ row: excelRowNum, column: 'Nama_Jurusan', value: name, message: 'Nama program keahlian wajib diisi.' });
      }
    }

    // -------------------------------------------------------------
    // VALIDASI: BANK SOAL (4 TIPE)
    // -------------------------------------------------------------
    else if (entityType === 'bank_soal') {
      const code = mapped.code;
      const subjectCode = mapped.subject_code;
      const qTypeRaw = mapped.question_type.toLowerCase();
      const grade = mapped.grade;
      const points = parseFloat(mapped.points);
      const questionText = mapped.question_text;
      const answerKey = mapped.answer_key;
      const matchingPairsRaw = mapped.matching_pairs;

      // Kode Soal
      if (!code) {
        errors.push({ row: excelRowNum, column: 'Kode_Soal', value: code, message: 'Kode butir soal wajib diisi.' });
      } else {
        if (seenQuestionCodes.has(code.toUpperCase())) {
          errors.push({ row: excelRowNum, column: 'Kode_Soal', value: code, message: `Kode soal '${code}' duplikat dalam file Excel.` });
        } else if (context.questions.some((q) => q.code?.toUpperCase() === code.toUpperCase())) {
          errors.push({ row: excelRowNum, column: 'Kode_Soal', value: code, message: `Kode soal '${code}' sudah terdaftar di bank soal.` });
        } else {
          seenQuestionCodes.add(code.toUpperCase());
        }
      }

      // Kode Mapel
      const matchedSubject = context.subjects.find(
        (s) => s.code.toLowerCase() === subjectCode.toLowerCase() || s.name.toLowerCase() === subjectCode.toLowerCase()
      );
      if (!subjectCode) {
        errors.push({ row: excelRowNum, column: 'Kode_Mapel', value: subjectCode, message: 'Kode mata pelajaran wajib diisi.' });
      } else if (!matchedSubject) {
        errors.push({ row: excelRowNum, column: 'Kode_Mapel', value: subjectCode, message: `Kode mapel '${subjectCode}' tidak ditemukan.` });
      } else {
        // SECURITY CHECK: Jika role adalah Guru, guru HANYA boleh import soal mapel yang diampunya!
        if (context.currentUser?.role === 'guru') {
          const allowedSubjectIds = context.currentUser.subject_ids || [];
          if (!allowedSubjectIds.includes(matchedSubject.id)) {
            errors.push({
              row: excelRowNum,
              column: 'Kode_Mapel',
              value: subjectCode,
              message: `Akses Ditolak: Anda tidak memiliki hak mengampu mata pelajaran '${matchedSubject.name}' (${matchedSubject.code}).`,
            });
          }
        }
      }

      // Tipe Soal
      const validTypes = ['pg_biasa', 'single_choice', 'pg_kompleks', 'complex_choice', 'esai', 'essay', 'menjodohkan', 'matching'];
      if (!qTypeRaw || !validTypes.includes(qTypeRaw)) {
        errors.push({
          row: excelRowNum,
          column: 'Tipe_Soal',
          value: mapped.question_type,
          message: `Tipe soal '${mapped.question_type}' tidak valid. Pilih: pg_biasa, pg_kompleks, esai, atau menjodohkan.`,
        });
      }

      // Tingkat
      if (!grade || !['X', 'XI', 'XII'].includes(grade)) {
        errors.push({ row: excelRowNum, column: 'Tingkat', value: grade, message: "Tingkat kelas harus 'X', 'XI', atau 'XII'." });
      }

      // Bobot Poin
      if (isNaN(points) || points <= 0) {
        errors.push({ row: excelRowNum, column: 'Bobot_Poin', value: mapped.points, message: 'Bobot poin harus berupa angka lebih dari 0.' });
      }

      // Teks Soal
      if (!questionText) {
        errors.push({ row: excelRowNum, column: 'Teks_Soal', value: questionText, message: 'Teks soal pertanyaan wajib diisi.' });
      }

      // Spesifik per tipe soal
      const isPG = qTypeRaw === 'pg_biasa' || qTypeRaw === 'single_choice';
      const isPGKompleks = qTypeRaw === 'pg_kompleks' || qTypeRaw === 'complex_choice';
      const isEssay = qTypeRaw === 'esai' || qTypeRaw === 'essay';
      const isMatching = qTypeRaw === 'menjodohkan' || qTypeRaw === 'matching';

      if (isPG) {
        if (!mapped.option_a || !mapped.option_b) {
          errors.push({ row: excelRowNum, column: 'Pilihan_A / B', value: '', message: 'Soal PG minimal harus memiliki Opsi A dan Opsi B.' });
        }
        const validKeys = ['A', 'B', 'C', 'D', 'E'];
        const cleanKey = answerKey ? answerKey.toUpperCase().trim() : '';
        if (!cleanKey || !validKeys.includes(cleanKey)) {
          errors.push({
            row: excelRowNum,
            column: 'Kunci_Jawaban',
            value: answerKey,
            message: `Kunci jawaban PG biasa harus berupa 1 huruf opsi (A, B, C, D, atau E).`,
          });
        }
      } else if (isPGKompleks) {
        if (!mapped.option_a || !mapped.option_b) {
          errors.push({ row: excelRowNum, column: 'Pilihan_A / B', value: '', message: 'Soal PG Kompleks minimal harus memiliki Opsi A dan Opsi B.' });
        }
        const selectedKeys = answerKey
          ? answerKey
              .toUpperCase()
              .split(/[,;\s]+/)
              .filter(Boolean)
          : [];
        if (selectedKeys.length === 0) {
          errors.push({
            row: excelRowNum,
            column: 'Kunci_Jawaban',
            value: answerKey,
            message: `Kunci jawaban PG Kompleks wajib diisi minimal 1 kunci (contoh: A, C).`,
          });
        }
      } else if (isMatching) {
        if (!matchingPairsRaw) {
          errors.push({
            row: excelRowNum,
            column: 'Pasangan_Menjodohkan',
            value: '',
            message: 'Soal menjodohkan wajib mengisi kolom Pasangan_Menjodohkan dengan format: Kiri 1 = Kanan A | Kiri 2 = Kanan B',
          });
        } else {
          // Parse format: A = B | C = D
          const pairs = matchingPairsRaw
            .split('|')
            .map((p: string) => p.trim())
            .filter(Boolean);
          if (pairs.length < 2) {
            errors.push({
              row: excelRowNum,
              column: 'Pasangan_Menjodohkan',
              value: matchingPairsRaw,
              message: 'Soal menjodohkan harus memiliki minimal 2 pasang pernyataan (gunakan pemisah | ).',
            });
          } else {
            const hasInvalidFormat = pairs.some((p: string) => !p.includes('=') || p.split('=')[0].trim() === '' || p.split('=')[1].trim() === '');
            if (hasInvalidFormat) {
              errors.push({
                row: excelRowNum,
                column: 'Pasangan_Menjodohkan',
                value: matchingPairsRaw,
                message: "Format pasangan salah. Gunakan tanda '=' untuk memasangkan, contoh: RAM = Memori Utama | SSD = Penyimpanan Cepat",
              });
            }
          }
        }
      }
    }

    allErrors.push(...errors);
    parsedRows.push({
      rowIndex: excelRowNum,
      rawData: rawRow,
      parsedData: mapped,
      errors,
      isValid: errors.length === 0,
    });
  });

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  return {
    parsedRows,
    validRows,
    invalidRows,
    allErrors,
    missingColumns: [],
    isFatalMissingColumns: false,
  };
}

// Convert parsed valid row to actual domain model for batch saving
export function transformRowToDomainEntity(
  entityType: ImportEntityType,
  row: ImportParsedRow,
  context: ValidationContextData
): any {
  const data = row.parsedData;

  if (entityType === 'siswa') {
    const matchedClass = context.classes.find(
      (c) => c.name.toLowerCase() === data.class_name.toLowerCase() || c.id === data.class_name
    );
    const matchedMajor = context.majors.find(
      (m) =>
        m.code.toLowerCase() === data.major_code.toLowerCase() ||
        m.name.toLowerCase() === data.major_code.toLowerCase() ||
        m.id === data.major_code
    );

    return {
      nis: data.nis,
      nisn: data.nisn,
      full_name: data.full_name,
      email: data.email,
      phone_number: data.phone_number || '',
      class_id: matchedClass?.id || '',
      major_id: matchedMajor?.id || '',
      status: (data.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      initialPassword: data.initial_password || undefined,
    };
  }

  if (entityType === 'guru') {
    const rawCodes = (data.subject_codes || '')
      .split(',')
      .map((c: string) => c.trim().toLowerCase());
    const subjectIds = context.subjects
      .filter((s) => rawCodes.includes(s.code.toLowerCase()) || rawCodes.includes(s.name.toLowerCase()))
      .map((s) => s.id);

    return {
      nip: data.nip,
      full_name: data.full_name,
      email: data.email,
      phone_number: data.phone_number || '',
      subject_ids: subjectIds,
      status: (data.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      initialPassword: data.initial_password || undefined,
    };
  }

  if (entityType === 'admin') {
    return {
      nip: data.nip || '',
      full_name: data.full_name,
      email: data.email,
      phone_number: data.phone_number || '',
      role: 'admin',
      status: (data.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      initialPassword: data.initial_password || undefined,
    };
  }

  if (entityType === 'mapel') {
    const major = context.majors.find((m) => m.code.toLowerCase() === data.major_code?.toLowerCase());
    return {
      code: data.code.toUpperCase(),
      name: data.name,
      grade: data.grade,
      major_id: major ? major.id : undefined,
      pass_score: parseFloat(data.pass_score) || 75,
      subject_group: data.subject_group || 'Kejuruan',
      description: data.description || '',
      status: (data.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
    };
  }

  if (entityType === 'kelas') {
    const major = context.majors.find((m) => m.code.toLowerCase() === data.major_code?.toLowerCase());
    return {
      name: data.name,
      grade: data.grade as 'X' | 'XI' | 'XII',
      major_id: major?.id || '',
      academic_year: data.academic_year || '2026/2027',
      status: (data.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
    };
  }

  if (entityType === 'jurusan') {
    return {
      code: data.code.toUpperCase(),
      name: data.name,
      description: data.description || '',
      status: (data.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
    };
  }

  if (entityType === 'bank_soal') {
    const subject = context.subjects.find(
      (s) => s.code.toLowerCase() === data.subject_code.toLowerCase() || s.name.toLowerCase() === data.subject_code.toLowerCase()
    );
    const qTypeRaw = data.question_type.toLowerCase();
    let qType: QuestionType = 'single_choice';
    let scoringMethod: ScoringMethod = 'exact_match';

    if (qTypeRaw === 'pg_kompleks' || qTypeRaw === 'complex_choice') {
      qType = 'complex_choice';
      scoringMethod = 'partial_credit';
    } else if (qTypeRaw === 'esai' || qTypeRaw === 'essay') {
      qType = 'essay';
      scoringMethod = 'manual';
    } else if (qTypeRaw === 'menjodohkan' || qTypeRaw === 'matching') {
      qType = 'matching';
      scoringMethod = 'partial_credit';
    }

    const teacherId = context.currentUser?.id || (context.teachers && context.teachers[0]?.id) || '';
    const qId = `q-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Build options if PG
    const options = [];
    if (qType === 'single_choice' || qType === 'complex_choice') {
      const optionLetters = ['A', 'B', 'C', 'D', 'E'];
      const correctLetters = data.answer_key
        ? data.answer_key
            .toUpperCase()
            .split(/[,;\s]+/)
            .filter(Boolean)
        : [];

      optionLetters.forEach((letter, oIdx) => {
        const key = `option_${letter.toLowerCase()}`;
        const optText = data[key];
        if (optText && optText.trim() !== '') {
          options.push({
            id: `opt-${qId}-${oIdx + 1}`,
            question_id: qId,
            option_key: letter,
            option_text: optText.trim(),
            is_correct: correctLetters.includes(letter),
            order_num: oIdx + 1,
          });
        }
      });
    }

    // Build matching pairs if matching
    const matching_pairs = [];
    if (qType === 'matching' && data.matching_pairs) {
      const rawPairs = data.matching_pairs
        .split('|')
        .map((p: string) => p.trim())
        .filter(Boolean);
      rawPairs.forEach((rawP: string, pIdx: number) => {
        const parts = rawP.split('=');
        if (parts.length >= 2) {
          matching_pairs.push({
            id: `pair-${qId}-${pIdx + 1}`,
            question_id: qId,
            left_item: parts[0].trim(),
            right_item: parts.slice(1).join('=').trim(),
            order_num: pIdx + 1,
          });
        }
      });
    }

    // Build essay keywords
    const essay_answer =
      qType === 'essay'
        ? {
            id: `essay-${qId}`,
            question_id: qId,
            reference_answer: data.answer_key || 'Kunci jawaban acuan belum diatur.',
            keywords: (data.answer_key || '').split(/[,;]+/).map((k: string) => k.trim()).filter(Boolean),
            sample_rubric: 'Rubrik penilaian: Kesesuaian konsep (40%), Ketepatan istilah kejuruan (30%), Kelengkapan penjelasan (30%).',
          }
        : undefined;

    return {
      code: data.code.toUpperCase(),
      subject_id: subject?.id || '',
      teacher_id: teacherId,
      grade: data.grade as 'X' | 'XI' | 'XII',
      major_id: undefined,
      question_type: qType,
      difficulty: (data.difficulty?.toLowerCase() || 'medium') as DifficultyLevel,
      points: parseFloat(data.points) || 10,
      question_text: data.question_text,
      explanation: data.explanation || '',
      status: 'active' as const,
      scoring_method: scoringMethod,
      options: options.length > 0 ? options : undefined,
      matching_pairs: matching_pairs.length > 0 ? matching_pairs : undefined,
      essay_answer,
    };
  }

  return data;
}

// -------------------------------------------------------------
// DOWNLOAD TEMPLATE EXCEL (.xlsx)
// -------------------------------------------------------------
export function downloadTemplateExcel(entityType: ImportEntityType): void {
  const schema = ENTITY_COLUMNS[entityType];
  const workbook = XLSX.utils.book_new();

  // Sample data per entity for guidance
  let sampleRows: any[] = [];

  if (entityType === 'siswa') {
    sampleRows = [
      {
        NIS: '20261011',
        NISN: '0089123401',
        Nama_Lengkap: 'Bagus Prakoso',
        Email: 'bagus.prakoso@siswa.smk.belajar.id',
        Kelas: 'X TJKT 1',
        Kode_Jurusan: 'TJKT',
        No_Telepon: '081234567801',
        Status: 'active',
        Password_Awal: 'SiswaSMK2026',
      },
      {
        NIS: '20261012',
        NISN: '0089123402',
        Nama_Lengkap: 'Citra Kirana Wardani',
        Email: 'citra.kirana@siswa.smk.belajar.id',
        Kelas: 'X TJKT 1',
        Kode_Jurusan: 'TJKT',
        No_Telepon: '081234567802',
        Status: 'active',
        Password_Awal: 'SiswaSMK2026',
      },
      {
        NIS: '20262013',
        NISN: '0089123403',
        Nama_Lengkap: 'Dimas Setiawan',
        Email: 'dimas.setiawan@siswa.smk.belajar.id',
        Kelas: 'XI TKRO 1',
        Kode_Jurusan: 'TKRO',
        No_Telepon: '081234567803',
        Status: 'active',
        Password_Awal: 'SiswaSMK2026',
      },
    ];
  } else if (entityType === 'guru') {
    sampleRows = [
      {
        NIP: '198504152010011012',
        Nama_Lengkap: 'Drs. Supriyanto, M.Pd.',
        Email: 'supriyanto@guru.smk.belajar.id',
        No_Telepon: '081398765432',
        Kode_Mata_Pelajaran: 'MTK-SMK, KJ-TJKT',
        Status: 'active',
        Password_Awal: 'GuruSMK2026',
      },
      {
        NIP: '199008212015032004',
        Nama_Lengkap: 'Ratna Dewi, S.Pd.',
        Email: 'ratna.dewi@guru.smk.belajar.id',
        No_Telepon: '081287654321',
        Kode_Mata_Pelajaran: 'BINDO-SMK',
        Status: 'active',
        Password_Awal: 'GuruSMK2026',
      },
    ];
  } else if (entityType === 'admin') {
    sampleRows = [
      {
        Nama_Lengkap: 'Administrator CBT Utama',
        Email: 'admin.cbt@smkn1songgom.sch.id',
        No_Telepon: '081234567890',
        NIP_ID: 'ADM-001',
        Status: 'active',
        Password_Awal: 'Admin123!',
      },
      {
        Nama_Lengkap: 'Operator Ujian SMKN 1 Songgom',
        Email: 'operator.ujian@smkn1songgom.sch.id',
        No_Telepon: '081298765432',
        NIP_ID: 'OPR-002',
        Status: 'active',
        Password_Awal: 'Admin123!',
      },
    ];
  } else if (entityType === 'mapel') {
    sampleRows = [
      {
        Kode_Mapel: 'BD-TJKT',
        Nama_Mapel: 'Basis Data dan Cloud Computing',
        Tingkat_Kelas: 'XI',
        Kode_Jurusan: 'TJKT',
        KKM: 75,
        Kelompok: 'Kejuruan',
        Deskripsi: 'Pemrograman SQL, perancangan database relasional, dan administrasi database cloud.',
        Status: 'active',
      },
      {
        Kode_Mapel: 'BING-SMK',
        Nama_Mapel: 'Bahasa Inggris Kejuruan',
        Tingkat_Kelas: 'Semua',
        Kode_Jurusan: '',
        KKM: 70,
        Kelompok: 'Umum',
        Deskripsi: 'Komunikasi teknis, manual reading, dan percakapan bisnis kejuruan.',
        Status: 'active',
      },
    ];
  } else if (entityType === 'kelas') {
    sampleRows = [
      {
        Nama_Kelas: 'X TJKT 2',
        Tingkat: 'X',
        Kode_Jurusan: 'TJKT',
        Tahun_Ajaran: '2026/2027',
        Status: 'active',
      },
      {
        Nama_Kelas: 'XI AKL 1',
        Tingkat: 'XI',
        Kode_Jurusan: 'AKL',
        Tahun_Ajaran: '2026/2027',
        Status: 'active',
      },
    ];
  } else if (entityType === 'jurusan') {
    sampleRows = [
      {
        Kode_Jurusan: 'PPLG',
        Nama_Jurusan: 'Pengembangan Perangkat Lunak dan Gim',
        Deskripsi: 'Konsentrasi keahlian pemrograman web, mobile apps, game dev, dan UI/UX engineering.',
        Status: 'active',
      },
    ];
  } else if (entityType === 'bank_soal') {
    sampleRows = [
      // 1. PG Biasa
      {
        Kode_Soal: 'SOAL-MTK-101',
        Kode_Mapel: 'MTK-SMK',
        Tipe_Soal: 'pg_biasa',
        Tingkat: 'XI',
        Kesulitan: 'medium',
        Bobot_Poin: 10,
        Teks_Soal: 'Berapakah nilai dari determinan matriks 2x2 [[3, 2], [1, 4]]?',
        Pilihan_A: '10',
        Pilihan_B: '14',
        Pilihan_C: '12',
        Pilihan_D: '8',
        Pilihan_E: '6',
        Kunci_Jawaban: 'A',
        Pasangan_Menjodohkan: '',
        Pembahasan: 'Determinan = (3 × 4) - (2 × 1) = 12 - 2 = 10.',
      },
      // 2. PG Kompleks
      {
        Kode_Soal: 'SOAL-TJKT-201',
        Kode_Mapel: 'KJ-TJKT',
        Tipe_Soal: 'pg_kompleks',
        Tingkat: 'XI',
        Kesulitan: 'hard',
        Bobot_Poin: 15,
        Teks_Soal: 'Manakah dari pernyataan berikut yang merupakan protokol routing dinamis interior (IGP)?',
        Pilihan_A: 'OSPF (Open Shortest Path First)',
        Pilihan_B: 'BGP (Border Gateway Protocol)',
        Pilihan_C: 'EIGRP (Enhanced Interior Gateway Routing Protocol)',
        Pilihan_D: 'DHCP (Dynamic Host Configuration Protocol)',
        Pilihan_E: 'DNS (Domain Name System)',
        Kunci_Jawaban: 'A, C',
        Pasangan_Menjodohkan: '',
        Pembahasan: 'OSPF dan EIGRP adalah Interior Gateway Protocol (IGP), sedangkan BGP adalah EGP.',
      },
      // 3. Menjodohkan
      {
        Kode_Soal: 'SOAL-TJKT-301',
        Kode_Mapel: 'KJ-TJKT',
        Tipe_Soal: 'menjodohkan',
        Tingkat: 'XI',
        Kesulitan: 'medium',
        Bobot_Poin: 20,
        Teks_Soal: 'Pasangkan perangkat keras jaringan berikut dengan fungsi utamanya yang paling tepat:',
        Pilihan_A: '',
        Pilihan_B: '',
        Pilihan_C: '',
        Pilihan_D: '',
        Pilihan_E: '',
        Kunci_Jawaban: '',
        Pasangan_Menjodohkan: 'Router = Mengarahkan paket antar subnet | Switch = Menghubungkan client dalam LAN | Firewall = Memfilter trafik keamanan jaringan | Access Point = Memancarkan sinyal Wi-Fi',
        Pembahasan: 'Router bekerja di Layer 3, Switch di Layer 2, Firewall mengamankan paket, dan AP memancarkan sinyal wireless.',
      },
      // 4. Esai
      {
        Kode_Soal: 'SOAL-MTK-401',
        Kode_Mapel: 'MTK-SMK',
        Tipe_Soal: 'esai',
        Tingkat: 'XI',
        Kesulitan: 'medium',
        Bobot_Poin: 20,
        Teks_Soal: 'Jelaskan perbedaan mendasar antara barisan aritmatika dan barisan geometri serta berikan masing-masing 1 contoh!',
        Pilihan_A: '',
        Pilihan_B: '',
        Pilihan_C: '',
        Pilihan_D: '',
        Pilihan_E: '',
        Kunci_Jawaban: 'Barisan aritmatika memiliki selisih (beda) tetap antar suku berturutan (contoh: 2, 5, 8, 11 beda=3). Barisan geometri memiliki rasio perkalian tetap antar suku berturutan (contoh: 3, 6, 12, 24 rasio=2).',
        Pasangan_Menjodohkan: '',
        Pembahasan: 'Kriteria penilaian: Penjelasan beda tetap vs rasio perkalian, ketepatan contoh, dan formula umum Un.',
      },
    ];
  }

  // 1. Sheet Data Template
  const wsData = XLSX.utils.json_to_sheet(sampleRows);

  // Auto column widths
  const colKeys = Object.keys(sampleRows[0] || {});
  const colWidths = colKeys.map((key) => {
    return { wch: Math.max(key.length + 4, 15) };
  });
  wsData['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, wsData, 'Template_Data');

  // 2. Sheet Petunjuk Pengisian
  const instructions = [
    { Kolom: 'PANDUAN UMUM PENGISIAN', Keterangan: 'Pastikan baris pertama (Header) tidak diubah atau dihapus.' },
    { Kolom: 'FORMAT BERKAS', Keterangan: 'Simpan dan unggah kembali dalam format .xlsx standar.' },
    ...schema.map((col) => ({
      Kolom: col.label,
      Wajib: col.required ? 'YA' : 'TIDAK',
      Keterangan: col.description,
    })),
  ];

  if (entityType === 'bank_soal') {
    instructions.push(
      { Kolom: 'PANDUAN SOAL PG BIASA', Keterangan: 'Tipe_Soal diisi pg_biasa. Isi Opsi A s/d E. Kunci_Jawaban diisi 1 huruf, contoh: A' },
      { Kolom: 'PANDUAN SOAL PG KOMPLEKS', Keterangan: 'Tipe_Soal diisi pg_kompleks. Isi Opsi A s/d E. Kunci_Jawaban diisi koma, contoh: A, C' },
      { Kolom: 'PANDUAN SOAL MENJODOHKAN', Keterangan: 'Tipe_Soal diisi menjodohkan. Kolom Pasangan_Menjodohkan diisi: Kiri 1 = Kanan A | Kiri 2 = Kanan B' },
      { Kolom: 'PANDUAN SOAL ESAI', Keterangan: 'Tipe_Soal diisi esai. Kunci_Jawaban diisi teks kunci acuan / kata kunci yang dinilai guru.' }
    );
  }

  const wsGuide = XLSX.utils.json_to_sheet(instructions);
  wsGuide['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, wsGuide, 'Petunjuk_Pengisian');

  // Trigger download
  const filename = `Template_Import_${entityType.toUpperCase()}_SMKN1Songgom.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// -------------------------------------------------------------
// DOWNLOAD ERROR REPORT EXCEL (.xlsx)
// -------------------------------------------------------------
export function downloadErrorReportExcel(
  entityType: ImportEntityType,
  invalidRows: ImportParsedRow[]
): void {
  const workbook = XLSX.utils.book_new();

  const reportData = invalidRows.map((item) => {
    const errorMessages = item.errors.map((e) => `[${e.column}]: ${e.message}`).join('; ');
    return {
      Baris_Excel: item.rowIndex,
      Status_Validasi: 'GAGAL',
      Pesan_Kesalahan: errorMessages,
      ...item.rawData,
    };
  });

  const ws = XLSX.utils.json_to_sheet(reportData);
  ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, ws, 'Baris_Gagal_Validasi');

  const filename = `Laporan_Error_Import_${entityType.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// -------------------------------------------------------------
// UNIVERSAL EXPORT TO EXCEL (.xlsx)
// -------------------------------------------------------------
export function exportToExcelFile(
  fileName: string,
  sheetName: string,
  data: Record<string, any>[]
): void {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto calculate width
  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    worksheet['!cols'] = keys.map((key) => {
      let maxLen = key.length;
      for (const row of data.slice(0, 100)) {
        const val = row[key];
        if (val !== undefined && val !== null) {
          maxLen = Math.max(maxLen, String(val).length);
        }
      }
      return { wch: Math.min(Math.max(maxLen + 3, 12), 60) };
    });
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

  const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, safeFileName);
}

// -------------------------------------------------------------
// DOMAIN ENTITY EXPORT TO EXCEL (.xlsx)
// -------------------------------------------------------------
export function exportEntityToExcel(
  entityType: ImportEntityType | 'laporan',
  items: any[],
  context?: {
    classes?: SchoolClass[];
    majors?: Major[];
    subjects?: Subject[];
    teachers?: Teacher[];
  },
  customFileName?: string
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  let formattedData: Record<string, any>[] = [];
  let sheetName = 'Data';
  let defaultFileName = `Export_${entityType.toUpperCase()}_SMKN1Songgom_${timestamp}.xlsx`;

  if (entityType === 'siswa') {
    sheetName = 'Data_Siswa';
    formattedData = items.map((item, idx) => {
      const className = item.class?.name || context?.classes?.find((c) => c.id === item.class_id)?.name || item.class_id || '-';
      const majorName = item.major?.name || context?.majors?.find((m) => m.id === item.major_id)?.name || item.major_id || '-';
      return {
        No: idx + 1,
        NIS: item.nis,
        NISN: item.nisn,
        Nama_Lengkap: item.full_name,
        Email: item.email,
        Kelas: className,
        Jurusan: majorName,
        No_Telepon: item.phone_number || '-',
        Status: item.status === 'active' ? 'Aktif' : 'Nonaktif',
      };
    });
  } else if (entityType === 'guru') {
    sheetName = 'Data_Guru';
    formattedData = items.map((item, idx) => {
      const subjectNames = (item.subject_ids || [])
        .map((sId: string) => context?.subjects?.find((s) => s.id === sId)?.name || sId)
        .join(', ');
      return {
        No: idx + 1,
        NIP: item.nip,
        Nama_Lengkap: item.full_name,
        Email: item.email,
        Mata_Pelajaran: subjectNames || '-',
        No_Telepon: item.phone_number || '-',
        Status: item.status === 'active' ? 'Aktif' : 'Nonaktif',
      };
    });
  } else if (entityType === 'admin') {
    sheetName = 'Data_Admin';
    formattedData = items.map((item, idx) => ({
      No: idx + 1,
      Nama_Lengkap: item.full_name,
      Email: item.email,
      NIP_ID: item.nip || '-',
      No_Telepon: item.phone_number || '-',
      Role: 'Admin / Operator',
      Status: item.status === 'active' ? 'Aktif' : 'Nonaktif',
    }));
  } else if (entityType === 'mapel') {
    sheetName = 'Data_Mapel';
    formattedData = items.map((item, idx) => ({
      No: idx + 1,
      Kode_Mapel: item.code,
      Nama_Mata_Pelajaran: item.name,
      Deskripsi: item.description || '-',
      Status: item.status === 'active' ? 'Aktif' : 'Nonaktif',
    }));
  } else if (entityType === 'kelas') {
    sheetName = 'Data_Kelas';
    formattedData = items.map((item, idx) => {
      const majorName = item.major?.name || context?.majors?.find((m) => m.id === item.major_id)?.name || '-';
      return {
        No: idx + 1,
        Nama_Kelas: item.name,
        Tingkat: item.grade,
        Jurusan: majorName,
        Tahun_Ajaran: item.academic_year || '2026/2027',
        Status: item.status === 'active' ? 'Aktif' : 'Nonaktif',
      };
    });
  } else if (entityType === 'jurusan') {
    sheetName = 'Data_Jurusan';
    formattedData = items.map((item, idx) => ({
      No: idx + 1,
      Kode_Jurusan: item.code,
      Nama_Jurusan: item.name,
      Deskripsi: item.description || '-',
      Status: item.status === 'active' ? 'Aktif' : 'Nonaktif',
    }));
  } else if (entityType === 'bank_soal') {
    sheetName = 'Bank_Soal';
    formattedData = items.map((item, idx) => {
      const subjectName = item.subject?.name || context?.subjects?.find((s) => s.id === item.subject_id)?.name || item.subject_id || '-';
      const teacherName = item.teacher?.full_name || context?.teachers?.find((t) => t.id === item.teacher_id)?.full_name || '-';
      
      let answerKey = '';
      if (item.question_type === 'single_choice') {
        const correctOpt = item.options?.find((o: any) => o.is_correct);
        answerKey = correctOpt ? correctOpt.code : '';
      } else if (item.question_type === 'complex_choice') {
        answerKey = (item.options || []).filter((o: any) => o.is_correct).map((o: any) => o.code).join(', ');
      } else if (item.question_type === 'essay') {
        answerKey = item.essay_answer?.reference_answer || '';
      } else if (item.question_type === 'matching') {
        answerKey = (item.matching_pairs || []).map((p: any) => `${p.premise} = ${p.response}`).join(' | ');
      }

      return {
        No: idx + 1,
        Kode_Soal: item.code,
        Mata_Pelajaran: subjectName,
        Guru_Pembuat: teacherName,
        Tingkat: item.grade,
        Tipe_Soal: item.question_type,
        Kesulitan: item.difficulty,
        Bobot_Poin: item.points,
        Pertanyaan: (item.question_text || '').replace(/<[^>]*>/g, ''),
        Kunci_Jawaban: answerKey,
        Pembahasan: (item.explanation || '').replace(/<[^>]*>/g, ''),
        Status: item.status,
      };
    });
  } else if (entityType === 'laporan') {
    sheetName = 'Laporan_Nilai_TKA';
    formattedData = items.map((item, idx) => ({
      No: idx + 1,
      Nama_Siswa: item.studentName || item.nama || '-',
      NIS: item.nis || '-',
      NISN: item.nisn || '-',
      Kelas: item.className || item.kelas || '-',
      Jurusan: item.majorName || item.jurusan || '-',
      Mata_Pelajaran: item.subjectName || item.mapel || '-',
      Ujian: item.examTitle || item.ujian || '-',
      Guru_Pengampu: item.teacherName || '-',
      Tanggal: item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('id-ID') : '-',
      Jumlah_Soal: item.totalQuestions ?? '-',
      Benar: item.correctCount ?? '-',
      Salah: item.incorrectCount ?? '-',
      Kosong: item.unansweredCount ?? '-',
      Skor: item.score ?? '-',
      Nilai: item.nilai ?? '-',
      Status_Ketuntasan: item.isPassed ? 'Tuntas' : 'Remedial',
      Durasi: item.durationFormatted || (item.durationMinutes ? `${item.durationMinutes} menit` : '-'),
    }));
  } else {
    formattedData = items;
  }

  exportToExcelFile(customFileName || defaultFileName, sheetName, formattedData);
}

