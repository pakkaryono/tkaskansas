export type UserRole = 'admin' | 'guru' | 'siswa';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  nip?: string;
  nis?: string;
  nisn?: string;
  class_name?: string;
  major_name?: string;
  avatar_url?: string;
  status?: 'active' | 'inactive';
  created_at?: string;
  subjects_taught?: string[]; // untuk guru
}

export interface NavItem {
  name: string;
  path: string;
  icon: string;
  badge?: number | string;
}

// ================= FASE 2 MASTER DATA TYPES =================

export interface Major {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: 'X' | 'XI' | 'XII';
  major_id: string;
  academic_year: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  major?: Major;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface Teacher {
  id: string;
  nip: string;
  full_name: string;
  email: string;
  phone_number?: string;
  status: 'active' | 'inactive';
  subject_ids: string[];
  subjects?: Subject[];
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  full_name: string;
  email: string;
  class_id: string;
  major_id: string;
  status: 'active' | 'inactive';
  phone_number?: string;
  class?: SchoolClass;
  major?: Major;
  created_at?: string;
  updated_at?: string;
}

// ================= FASE 3 BANK SOAL TYPES =================

export type QuestionType = 'single_choice' | 'complex_choice' | 'essay' | 'matching';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'active' | 'inactive' | 'draft';
export type ScoringMethod = 'exact_match' | 'partial_credit' | 'manual';

export interface QuestionOption {
  id: string;
  question_id?: string;
  option_key: 'A' | 'B' | 'C' | 'D' | 'E';
  option_text: string;
  image_url?: string;
  is_correct: boolean;
  order_num: number;
}

export interface EssayAnswer {
  id: string;
  question_id?: string;
  reference_answer: string;
  keywords: string[];
  sample_rubric?: string;
  created_at?: string;
}

export interface MatchingPair {
  id: string;
  question_id?: string;
  left_item: string;
  right_item: string;
  correct_match_key: string; // Identifier connecting left to right
  order_num: number;
}

export interface Question {
  id: string;
  code: string;
  subject_id: string;
  teacher_id: string;
  class_id?: string;
  grade: 'X' | 'XI' | 'XII';
  major_id?: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  points: number;
  question_text: string;
  image_url?: string;
  explanation?: string;
  status: QuestionStatus;
  scoring_method: ScoringMethod;
  options?: QuestionOption[];
  essay_answer?: EssayAnswer;
  matching_pairs?: MatchingPair[];
  created_at?: string;
  updated_at?: string;
  // Joined relation models for display
  subject?: Subject;
  teacher?: Teacher;
  school_class?: SchoolClass;
  major?: Major;
}

export interface QuestionFilterParams {
  search?: string;
  subject_id?: string;
  teacher_id?: string;
  class_id?: string;
  grade?: string;
  major_id?: string;
  question_type?: string;
  difficulty?: string;
  status?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface DashboardStatsAdmin {
  totalTeachers: number;
  totalStudents: number;
  totalSubjects: number;
  totalClasses: number;
  totalMajors: number;
  totalQuestions: number;
  totalExams: number;
  totalAttempts: number;
}

export interface DashboardStatsGuru {
  myQuestions: number;
  myExams: number;
  completedAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

export interface DashboardStatsSiswa {
  availableExams: number;
  inProgressExams: number;
  completedExams: number;
  latestScore: number | null;
  averageScore: number | null;
}

// ================= FASE 4 MANAJEMEN UJIAN DAN JADWAL =================

export type ExamStatus = 'draft' | 'scheduled' | 'open' | 'closed' | 'archived';
export type QuestionSelectionMethod = 'manual' | 'random';
export type AttemptStatus = 'not_started' | 'in_progress' | 'submitted' | 'expired' | 'abandoned';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  subject_id: string;
  teacher_id: string;
  grade: 'X' | 'XI' | 'XII';
  major_id?: string; // specific major ID or undefined/'all' for all majors
  target_class_ids?: string[]; // IDs of classes assigned to take this exam
  start_at: string; // ISO 8601 string, e.g. 2026-09-14T08:00:00+07:00
  end_at: string; // ISO 8601 string, e.g. 2026-09-14T10:00:00+07:00
  duration_minutes: number; // e.g. 60
  total_questions: number; // e.g. 50
  instructions?: string;
  status: ExamStatus;
  randomize_questions: boolean; // acak urutan soal
  randomize_options: boolean; // acak urutan opsi jawaban
  pass_score: number; // KKM, default 75
  question_selection_method: QuestionSelectionMethod; // 'manual' | 'random'
  created_at?: string;
  updated_at?: string;
  // Joined relation models
  subject?: Subject;
  teacher?: Teacher;
  major?: Major;
  questions_count?: number;
  assigned_classes?: SchoolClass[];
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  order_num: number;
  points: number;
  snapshot: Question; // immutable snapshot of question content at time of exam creation
  created_at?: string;
}

export interface ExamAssignment {
  id: string;
  exam_id: string;
  class_id?: string;
  student_id?: string;
  can_take: boolean;
  created_at?: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  start_time: string; // ISO string
  deadline_time: string; // ISO string: min(start_time + duration_minutes, exam.end_at)
  end_time?: string;
  status: AttemptStatus;
  question_order: string[]; // array of question_ids in fixed order for this attempt
  option_order: Record<string, string[]>; // map question_id -> array of option_keys (shuffled or original)
  answers: Record<string, any>; // student answers
  doubtful_questions?: string[]; // IDs of questions marked as "ragu-ragu"
  score?: number; // Nilai skala 0-100
  total_points?: number; // total skor diperoleh
  maximum_points?: number; // total skor maksimal
  has_pending_essay?: boolean;
  essay_gradings?: Record<string, EssayGrading>; // question_id -> EssayGrading
  result_summary?: ExamResultSummary;
  regrade_history?: RegradeHistory[];
  regrade_version?: number;
  created_at?: string;
  updated_at?: string;
}

// ================= FASE 6 SISTEM PENILAIAN TYPES =================

export type ItemResultStatus =
  | 'correct'
  | 'incorrect'
  | 'partial'
  | 'unanswered'
  | 'pending_grading';

export interface EssayGrading {
  score: number; // nilai yang diberikan (0 s.d. bobot soal)
  feedback?: string; // komentar / catatan evaluasi guru
  grader: string; // nama atau NIP/ID penilai
  graded_at: string; // ISO timestamp
}

export interface QuestionResultDetail {
  question_id: string;
  question_code?: string;
  question_type: QuestionType;
  question_text: string;
  explanation?: string;
  student_answer: any;
  correct_answer_display?: string | string[];
  max_points: number;
  earned_points: number;
  status: ItemResultStatus;
  matching_detail?: {
    total_pairs: number;
    correct_pairs: number;
  };
  essay_grading?: EssayGrading;
  is_canceled?: boolean; // Jika soal dianulir / dibatalkan saat regrading
}

export interface GradeCategoryConfig {
  id: string;
  min_score: number; // Contoh: 90
  max_score: number; // Contoh: 100
  code: string; // Contoh: 'A', 'B', 'C', 'D'
  grade_code?: string; // Alias for code
  label: string; // Contoh: 'Sangat Baik', 'Baik', 'Cukup', 'Perlu Bimbingan'
  badge_class: string; // Tailwind styling class
  color?: string;
  order?: number;
  description?: string;
}

export interface ExamResultSummary {
  jumlah_soal: number;
  benar: number;
  salah: number;
  kosong: number;
  partial: number;
  pending_essay: number;
  skor: number; // total_score diperoleh
  maximum_score: number; // total bobot maksimal
  nilai: number; // total_score / maximum_score * 100
  kategori_nilai: GradeCategoryConfig;
  waktu_mulai: string;
  waktu_selesai: string;
  durasi_detik: number;
  durasi: string; // Format teks: e.g. "45 Menit 12 Detik"
  item_details: QuestionResultDetail[];
  question_details?: QuestionResultDetail[]; // Alias for item_details
}

export interface RegradeHistory {
  id: string;
  attempt_id: string;
  exam_id: string;
  regraded_at: string;
  regraded_by: string; // Admin yang mengeksekusi
  reason: string; // e.g. "Kunci jawaban salah", "Bobot berubah", "Soal dibatalkan"
  notes?: string;
  previous_score: number;
  previous_earned_points: number;
  new_score: number;
  new_earned_points: number;
  version: number;
}

// Data payload yang dikirim ke browser siswa (SECURITY ENFORCED: 100% STRIPPED OF ANSWER KEYS)
export interface StudentQuestionOption {
  id: string;
  option_key: 'A' | 'B' | 'C' | 'D' | 'E';
  option_text: string;
  image_url?: string;
  order_num: number;
  // CRITICAL: NO is_correct property!
}

export interface StudentMatchingPair {
  id: string;
  left_item: string;
  right_item: string;
  order_num: number;
  // CRITICAL: NO correct_match_key property!
}

export interface StudentQuestionItem {
  id: string;
  code: string;
  question_type: QuestionType;
  points: number;
  question_text: string;
  image_url?: string;
  options?: StudentQuestionOption[];
  // CRITICAL: NO reference_answer, keywords, or sample_rubric in essay!
  matching_pairs?: StudentMatchingPair[];
  // CRITICAL: NO explanation property!
}

export interface StudentExamPayload {
  id: string;
  title: string;
  description?: string;
  subject_name: string;
  teacher_name?: string;
  grade: string;
  duration_minutes: number;
  total_questions: number;
  start_at: string;
  end_at: string;
  instructions?: string;
  pass_score: number;
  questions: StudentQuestionItem[];
  attempt?: {
    id: string;
    start_time: string;
    deadline_time: string;
    status: AttemptStatus;
    answers: Record<string, any>;
    doubtful_questions?: string[];
  };
  server_time: string;
}

export interface ExamFilterParams {
  search?: string;
  subject_id?: string;
  teacher_id?: string;
  grade?: string;
  major_id?: string;
  status?: ExamStatus | 'all';
}

// ==========================================
// FASE 8: IMPORT & EXPORT EXCEL TYPES
// ==========================================
export type ImportEntityType = 'siswa' | 'guru' | 'admin' | 'mapel' | 'kelas' | 'jurusan' | 'bank_soal';

export interface ImportValidationError {
  row: number; // 1-indexed row in Excel
  column: string; // Column header / field name
  value: any; // Offending value
  message: string; // Detailed error message
}

export interface ImportParsedRow<T = any> {
  rowIndex: number;
  rawData: Record<string, any>;
  parsedData?: T;
  errors: ImportValidationError[];
  isValid: boolean;
}

export interface ImportResultSummary {
  entityType: ImportEntityType;
  totalRows: number;
  successCount: number;
  failedCount: number;
  importedItems: any[];
  invalidRows: ImportParsedRow[];
  timestamp: string;
}

