import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Exam,
  ExamQuestion,
  ExamAssignment,
  ExamAttempt,
  ExamStatus,
  QuestionSelectionMethod,
  StudentExamPayload,
  StudentQuestionItem,
  StudentQuestionOption,
  StudentMatchingPair,
  Student,
  Question,
  GradeCategoryConfig,
  ExamResultSummary,
  RegradeHistory,
} from '../types';
import {
  DEFAULT_GRADE_CATEGORIES,
  getGradeCategory,
  evaluateAttempt,
  GradingOptions,
} from '../lib/gradingEngine';
import { createInitialGradingSnapshots, createInitialSeedAttempts } from '../data/gradingSeed';
import { useQuestionBank } from './QuestionBankContext';
import { useMasterData } from './MasterDataContext';
import { useAuth } from './AuthContext';
import { AuditLogger } from '../lib/auditLogger';

interface ExamContextType {
  exams: Exam[];
  examQuestions: ExamQuestion[];
  examAssignments: ExamAssignment[];
  examAttempts: ExamAttempt[];
  loading: boolean;
  currentServerTime: Date;
  isSimulatedTime: boolean;
  setSimulatedTime: (date: Date | null) => void;
  resetToRealTime: () => void;
  getDynamicStatus: (exam: Exam, refTime?: Date) => ExamStatus;
  calculateDeadline: (exam: Exam, startTime: Date) => Date;
  getExamById: (id: string) => Exam | undefined;
  getExamQuestions: (examId: string) => ExamQuestion[];
  createExam: (
    examData: Omit<Exam, 'id' | 'created_at' | 'updated_at'>,
    selectedQuestionIds?: string[],
    selectionMethod?: QuestionSelectionMethod
  ) => Promise<Exam>;
  updateExam: (
    id: string,
    examData: Partial<Exam>,
    selectedQuestionIds?: string[]
  ) => Promise<Exam>;
  deleteExam: (id: string) => Promise<{ success: boolean; message?: string }>;
  duplicateExam: (id: string) => Promise<Exam>;
  updateExamStatus: (id: string, status: ExamStatus) => Promise<void>;
  getEligibleExamsForStudent: (student: Student | null) => Exam[];
  checkStudentEligibility: (exam: Exam, student: Student | null) => { eligible: boolean; reason?: string };
  startOrGetAttempt: (examId: string, studentId: string) => { attempt: ExamAttempt; isNew: boolean };
  saveStudentAnswer: (attemptId: string, questionId: string, answer: any) => void;
  toggleDoubtfulQuestion: (attemptId: string, questionId: string) => void;
  submitAttempt: (attemptId: string) => Promise<ExamAttempt>;
  getStudentExamPayload: (examId: string, studentId: string) => StudentExamPayload | null;
  resetAllExamsToSeed: () => void;
  // Fase 6 Penilaian Methods
  gradeCategories: GradeCategoryConfig[];
  setGradeCategories: (cats: GradeCategoryConfig[]) => void;
  updateGradeCategory: (id: string, updated: Partial<GradeCategoryConfig>) => void;
  resetGradeCategories: () => void;
  gradeEssayAnswer: (
    attemptId: string,
    questionId: string,
    grading: { score: number; feedback?: string; grader: string }
  ) => Promise<ExamAttempt>;
  regradeExam: (
    examId: string,
    options: {
      reason: string;
      notes?: string;
      regradedBy: string;
      canceledQuestionIds?: string[];
      cancelAction?: 'full_points' | 'exclude_from_max';
      complexScoringMethod?: 'exact_match' | 'partial_credit';
    }
  ) => Promise<{ affectedAttempts: number; history: RegradeHistory[] }>;
  getAttemptResultSummary: (attemptId: string) => ExamResultSummary | null;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

const LOCAL_STORAGE_EXAMS_KEY = 'tka_exams_data_v4';
const LOCAL_STORAGE_EXAM_QUESTIONS_KEY = 'tka_exam_questions_data_v4';
const LOCAL_STORAGE_EXAM_ASSIGNMENTS_KEY = 'tka_exam_assignments_data_v4';
const LOCAL_STORAGE_EXAM_ATTEMPTS_KEY = 'tka_exam_attempts_data_v4';

// Default window date reference: 2026-09-14
const BASE_DATE_STR = '2026-09-14';

export const ExamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { questions } = useQuestionBank();
  const { subjects, teachers, classes, majors, students } = useMasterData();
  const { profile } = useAuth();

  // Server Time State (Allows simulation / time travel for test cases)
  const [simulatedTime, setSimulatedTimeState] = useState<Date | null>(() => {
    // Default default simulated server time: 2026-09-14 08:30:00 (inside test exam window)
    return new Date(`${BASE_DATE_STR}T08:30:00+07:00`);
  });

  const [liveTime, setLiveTime] = useState<Date>(new Date());

  // Tick live time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentServerTime = useMemo(() => {
    return simulatedTime || liveTime;
  }, [simulatedTime, liveTime]);

  const setSimulatedTime = useCallback((date: Date | null) => {
    setSimulatedTimeState(date);
  }, []);

  const resetToRealTime = useCallback(() => {
    setSimulatedTimeState(null);
  }, []);

  // 1. INITIAL SEED EXAMS
  const initialSeedExams = useMemo<Exam[]>(() => {
    return [
      // Contoh Sesuai Panduan Prompt:
      // TKA Matematika Kelas XI, 50 soal, Durasi 60 menit, Window 08:00-10:00
      {
        id: 'exam-mtk-xi-50',
        title: 'TKA Matematika Terapan Kelas XI',
        description: 'Tes Kemampuan Akademik Matematika Terapan Kejuruan Semester Ganjil TA 2026/2027.',
        subject_id: 'c1111111-1111-1111-1111-111111111111', // MTK-SMK
        teacher_id: 'demo-guru-uuid-002', // Siti Aminah
        grade: 'XI',
        major_id: undefined, // Semua Jurusan
        target_class_ids: [
          'b2222222-2222-2222-2222-222222222222', // XI TJKT 1
          'b4444444-4444-4444-4444-444444444444', // XI TKRO 1
          'b5555555-5555-5555-5555-555555555555', // XI AKL 1
        ],
        start_at: `${BASE_DATE_STR}T08:00:00+07:00`,
        end_at: `${BASE_DATE_STR}T10:00:00+07:00`,
        duration_minutes: 60,
        total_questions: 50,
        instructions: '1. Kerjakan dengan jujur dan mandiri.\n2. Waktu pengerjaan adalah 60 menit terhitung saat Anda menekan Mulai Ujian.\n3. Pengerjaan akan otomatis ditutup saat batas akhir jadwal (10:00 WIB) tercapai.\n4. Dilarang membuka tab atau browser lain selama ujian berlangsung.',
        status: 'open', // Ditentukan dinamis oleh waktu
        randomize_questions: true,
        randomize_options: true,
        pass_score: 75,
        question_selection_method: 'random',
        created_at: '2026-09-10T10:00:00Z',
        updated_at: '2026-09-10T10:00:00Z',
      },
      // Contoh 2: Ujian Mendatang (Scheduled) - Bahasa Indonesia Kejuruan Kelas XI
      {
        id: 'exam-bind-xi-scheduled',
        title: 'TKA Bahasa Indonesia Kejuruan Kelas XI',
        description: 'Literasi teknis, komunikasi resmi, dan penulisan laporan proyek industri.',
        subject_id: 'c2222222-2222-2222-2222-222222222222', // BIND-01
        teacher_id: 'demo-guru-uuid-002', // Siti Aminah
        grade: 'XI',
        major_id: undefined,
        target_class_ids: [
          'b2222222-2222-2222-2222-222222222222', // XI TJKT 1
          'b4444444-4444-4444-4444-444444444444', // XI TKRO 1
          'b5555555-5555-5555-5555-555555555555', // XI AKL 1
        ],
        start_at: `${BASE_DATE_STR}T13:00:00+07:00`,
        end_at: `${BASE_DATE_STR}T15:00:00+07:00`,
        duration_minutes: 90,
        total_questions: 20,
        instructions: 'Bacalah teks wacana dengan teliti sebelum menjawab.',
        status: 'scheduled',
        randomize_questions: true,
        randomize_options: true,
        pass_score: 75,
        question_selection_method: 'manual',
        created_at: '2026-09-11T09:00:00Z',
        updated_at: '2026-09-11T09:00:00Z',
      },
      // Contoh 3: Ujian Terbuka - Bahasa Inggris Teknis & Vokasi Kelas XI
      {
        id: 'exam-bing-xi-20',
        title: 'TKA Bahasa Inggris Teknis & Vokasi Kelas XI',
        description: 'Technical English, standard operating procedures, and professional workplace communication.',
        subject_id: 'c3333333-3333-3333-3333-333333333333', // BING-01
        teacher_id: 'demo-guru-uuid-003', // Budi Santoso
        grade: 'XI',
        major_id: undefined,
        target_class_ids: [
          'b2222222-2222-2222-2222-222222222222', // XI TJKT 1
          'b4444444-4444-4444-4444-444444444444', // XI TKRO 1
          'b5555555-5555-5555-5555-555555555555', // XI AKL 1
        ],
        start_at: `${BASE_DATE_STR}T08:00:00+07:00`,
        end_at: `${BASE_DATE_STR}T11:00:00+07:00`,
        duration_minutes: 60,
        total_questions: 20,
        instructions: 'Read every question carefully and select the best answer for workplace communication.',
        status: 'open',
        randomize_questions: true,
        randomize_options: true,
        pass_score: 75,
        question_selection_method: 'manual',
        created_at: '2026-09-11T10:00:00Z',
        updated_at: '2026-09-11T10:00:00Z',
      },
      // Contoh 4: Ujian Selesai (Closed) - Kejuruan TJKT Kelas XII
      {
        id: 'exam-tjkt-xii-closed',
        title: 'Asesmen Standar Kompetensi TJKT Kelas XII',
        description: 'Ujian infrastruktur jaringan, VLAN Trunking, dan firewall routing.',
        subject_id: 'c4444444-4444-4444-4444-444444444444', // KJ-TJKT
        teacher_id: 'demo-guru-uuid-002',
        grade: 'XII',
        major_id: 'a1111111-1111-1111-1111-111111111111',
        target_class_ids: [
          'b3333333-3333-3333-3333-333333333333', // XII TJKT 1
        ],
        start_at: `${BASE_DATE_STR}T06:00:00+07:00`,
        end_at: `${BASE_DATE_STR}T07:30:00+07:00`,
        duration_minutes: 75,
        total_questions: 30,
        instructions: 'Selesaikan instrumen asesmen kejuruan jaringan.',
        status: 'closed',
        randomize_questions: false,
        randomize_options: true,
        pass_score: 80,
        question_selection_method: 'manual',
        created_at: '2026-09-08T08:00:00Z',
        updated_at: '2026-09-08T08:00:00Z',
      },
    ];
  }, []);

  // 2. State & Storage Initialization
  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_EXAMS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Gagal membaca saved exams:', e);
      }
    }
    return initialSeedExams;
  });

  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_EXAM_QUESTIONS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Gagal membaca saved examQuestions:', e);
      }
    }
    return [];
  });

  const [examAssignments, setExamAssignments] = useState<ExamAssignment[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_EXAM_ASSIGNMENTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn('Gagal membaca saved assignments:', e);
      }
    }
    return [];
  });

  const LOCAL_STORAGE_GRADE_CATEGORIES_KEY = 'tka_grade_categories_data_v6';

  const [gradeCategories, setGradeCategoriesState] = useState<GradeCategoryConfig[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_GRADE_CATEGORIES_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Gagal membaca saved grade categories:', e);
      }
    }
    return DEFAULT_GRADE_CATEGORIES;
  });

  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_EXAM_ATTEMPTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Gagal membaca saved attempts:', e);
      }
    }
    return [];
  });

  const [loading, setLoading] = useState(false);

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_EXAMS_KEY, JSON.stringify(exams));
    } catch (e) {
      console.warn('Gagal simpan exams:', e);
    }
  }, [exams]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_GRADE_CATEGORIES_KEY, JSON.stringify(gradeCategories));
    } catch (e) {
      console.warn('Gagal simpan grade categories:', e);
    }
  }, [gradeCategories]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_EXAM_QUESTIONS_KEY, JSON.stringify(examQuestions));
    } catch (e) {
      console.warn('Gagal simpan examQuestions:', e);
    }
  }, [examQuestions]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_EXAM_ASSIGNMENTS_KEY, JSON.stringify(examAssignments));
    } catch (e) {
      console.warn('Gagal simpan examAssignments:', e);
    }
  }, [examAssignments]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_EXAM_ATTEMPTS_KEY, JSON.stringify(examAttempts));
    } catch (e) {
      console.warn('Gagal simpan examAttempts:', e);
    }
  }, [examAttempts]);

  const setGradeCategories = useCallback((cats: GradeCategoryConfig[]) => {
    setGradeCategoriesState(cats);
  }, []);

  const updateGradeCategory = useCallback((id: string, updated: Partial<GradeCategoryConfig>) => {
    setGradeCategoriesState((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
  }, []);

  const resetGradeCategories = useCallback(() => {
    setGradeCategoriesState(DEFAULT_GRADE_CATEGORIES);
  }, []);

  // Seed question snapshots for initialSeedExams if empty or missing
  useEffect(() => {
    if (questions.length > 0) {
      setExamQuestions((currentSnapshots) => {
        const existingExamIds = new Set(currentSnapshots.map((eq) => eq.exam_id));
        const newSnapshots: ExamQuestion[] = [];

        // 1. Snapshot untuk TKA MTK
        if (!existingExamIds.has('exam-mtk-xi-50')) {
          const mtkQuestions = questions.filter(
            (q) => q.subject_id === 'c1111111-1111-1111-1111-111111111111'
          );
          mtkQuestions.slice(0, 50).forEach((q, idx) => {
            newSnapshots.push({
              id: `eq-mtk-50-${idx + 1}`,
              exam_id: 'exam-mtk-xi-50',
              question_id: q.id,
              order_num: idx + 1,
              points: q.points || 2,
              snapshot: JSON.parse(JSON.stringify(q)),
              created_at: new Date().toISOString(),
            });
          });
        }

        // 2. Snapshot untuk TKA Bahasa Indonesia
        if (!existingExamIds.has('exam-bind-xi-scheduled')) {
          const bindQuestions = questions.filter(
            (q) => q.subject_id === 'c2222222-2222-2222-2222-222222222222'
          );
          bindQuestions.slice(0, 20).forEach((q, idx) => {
            newSnapshots.push({
              id: `eq-bind-20-${idx + 1}`,
              exam_id: 'exam-bind-xi-scheduled',
              question_id: q.id,
              order_num: idx + 1,
              points: q.points || 5,
              snapshot: JSON.parse(JSON.stringify(q)),
              created_at: new Date().toISOString(),
            });
          });
        }

        // 3. Snapshot untuk TKA Bahasa Inggris
        if (!existingExamIds.has('exam-bing-xi-20')) {
          const bingQuestions = questions.filter(
            (q) => q.subject_id === 'c3333333-3333-3333-3333-333333333333'
          );
          bingQuestions.slice(0, 20).forEach((q, idx) => {
            newSnapshots.push({
              id: `eq-bing-20-${idx + 1}`,
              exam_id: 'exam-bing-xi-20',
              question_id: q.id,
              order_num: idx + 1,
              points: q.points || 5,
              snapshot: JSON.parse(JSON.stringify(q)),
              created_at: new Date().toISOString(),
            });
          });
        }

        // 4. Snapshot untuk Ujian Tertutup (TJKT Closed)
        if (!existingExamIds.has('exam-tjkt-xii-closed')) {
          const gradingSnapshots = createInitialGradingSnapshots(questions);
          newSnapshots.push(...gradingSnapshots);
        }

        if (newSnapshots.length === 0) return currentSnapshots;

        const updated = [...currentSnapshots, ...newSnapshots];
        localStorage.setItem(LOCAL_STORAGE_EXAM_QUESTIONS_KEY, JSON.stringify(updated));
        return updated;
      });

      // Seed attempts jika belum ada
      setExamAttempts((currentAttempts) => {
        if (currentAttempts.length === 0) {
          const gradingSnapshots = createInitialGradingSnapshots(questions);
          if (gradingSnapshots.length > 0) {
            const seedAttempts = createInitialSeedAttempts(gradingSnapshots);
            localStorage.setItem(LOCAL_STORAGE_EXAM_ATTEMPTS_KEY, JSON.stringify(seedAttempts));
            return seedAttempts;
          }
        }
        return currentAttempts;
      });
    }
  }, [questions]);

  // Helper: Status Otomatis Dinamis Berdasarkan Waktu Server
  const getDynamicStatus = useCallback(
    (exam: Exam, refTime?: Date): ExamStatus => {
      // Jika diset manual ke draft atau archived, pertahankan status tersebut
      if (exam.status === 'draft' || exam.status === 'archived') {
        return exam.status;
      }

      const now = (refTime || currentServerTime).getTime();
      const start = new Date(exam.start_at).getTime();
      const end = new Date(exam.end_at).getTime();

      if (now < start) {
        return 'scheduled';
      } else if (now >= start && now <= end) {
        return 'open';
      } else {
        return 'closed';
      }
    },
    [currentServerTime]
  );

  // Helper: Hitung Batas Akhir Siswa (Deadline tidak boleh melewati end_at)
  const calculateDeadline = useCallback((exam: Exam, startTime: Date): Date => {
    const durationEnd = new Date(startTime.getTime() + exam.duration_minutes * 60 * 1000);
    const windowEnd = new Date(exam.end_at);

    // Deadline = min(startTime + duration, windowEnd)
    return durationEnd.getTime() < windowEnd.getTime() ? durationEnd : windowEnd;
  }, []);

  // Helper: Get exam by ID with joined details
  const getExamById = useCallback(
    (id: string): Exam | undefined => {
      const exam = exams.find((e) => e.id === id);
      if (!exam) return undefined;

      const subject = subjects.find((s) => s.id === exam.subject_id);
      const teacher = teachers.find((t) => t.id === exam.teacher_id);
      const major = exam.major_id ? majors.find((m) => m.id === exam.major_id) : undefined;
      const count = examQuestions.filter((eq) => eq.exam_id === exam.id).length;
      const assigned_classes = classes.filter((c) => exam.target_class_ids?.includes(c.id));

      return {
        ...exam,
        status: getDynamicStatus(exam),
        subject,
        teacher,
        major,
        questions_count: count,
        assigned_classes,
      };
    },
    [exams, subjects, teachers, majors, classes, examQuestions, getDynamicStatus]
  );

  // Helper: Get questions snapshot for an exam (HANYA UNTUK GURU & ADMIN)
  const getExamQuestions = useCallback(
    (examId: string): ExamQuestion[] => {
      if (profile && profile.role === 'siswa') {
        AuditLogger.log({
          action: 'UNAUTHORIZED_ACCESS_BLOCKED',
          entity: 'exam_questions',
          userId: profile.id,
          userEmail: profile.email,
          userRole: profile.role,
          details: { examId, reason: 'Siswa dilarang mengakses snapshot butir soal mentah beserta kunci jawaban.' },
          status: 'BLOCKED',
        });
        throw new Error('Akses Ditolak: Peserta ujian dilarang mengakses snapshot butir soal mentah.');
      }
      return examQuestions
        .filter((eq) => eq.exam_id === examId)
        .sort((a, b) => a.order_num - b.order_num);
    },
    [examQuestions, profile]
  );

  // Method 1: Create Exam (with Manual or Random question snapshotting)
  const createExam = async (
    examData: Omit<Exam, 'id' | 'created_at' | 'updated_at'>,
    selectedQuestionIds: string[] = [],
    selectionMethod: QuestionSelectionMethod = 'manual'
  ): Promise<Exam> => {
    if (profile && profile.role === 'siswa') {
      throw new Error('Akses Ditolak: Peserta ujian tidak diizinkan membuat ujian baru.');
    }
    setLoading(true);
    try {
      const examId = `exam-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      let finalQuestionList: Question[] = [];

      if (selectionMethod === 'random') {
        // Ambil butir soal dari bank soal yang sesuai subject_id, grade, status 'active'
        const pool = questions.filter(
          (q) =>
            q.subject_id === examData.subject_id &&
            q.grade === examData.grade &&
            q.status === 'active'
        );

        if (pool.length === 0) {
          throw new Error(
            `Tidak ditemukan butir soal aktif pada bank soal untuk Mata Pelajaran ini tingkat Kelas ${examData.grade}.`
          );
        }

        // Acak pool dan ambil sebanyak total_questions
        const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
        finalQuestionList = shuffledPool.slice(0, examData.total_questions);
      } else {
        // Pemilihan Manual
        finalQuestionList = questions.filter((q) => selectedQuestionIds.includes(q.id));
        if (finalQuestionList.length === 0) {
          throw new Error('Pilih minimal 1 butir soal untuk membuat ujian.');
        }
      }

      // Buat SNAPSHOT butir soal ke dalam exam_questions
      const newExamQuestions: ExamQuestion[] = finalQuestionList.map((q, idx) => ({
        id: `eq-${examId}-${idx + 1}`,
        exam_id: examId,
        question_id: q.id,
        order_num: idx + 1,
        points: q.points || 10,
        snapshot: JSON.parse(JSON.stringify(q)), // Deep clone snapshot
        created_at: nowIso,
      }));

      // Buat exam assignment untuk kelas target
      const targetClassIds = examData.target_class_ids || [];
      const newAssignments: ExamAssignment[] = targetClassIds.map((cid) => ({
        id: `asg-${examId}-${cid}`,
        exam_id: examId,
        class_id: cid,
        can_take: true,
        created_at: nowIso,
      }));

      const newExam: Exam = {
        ...examData,
        id: examId,
        total_questions: finalQuestionList.length,
        question_selection_method: selectionMethod,
        created_at: nowIso,
        updated_at: nowIso,
      };

      setExams((prev) => [newExam, ...prev]);
      setExamQuestions((prev) => [...prev, ...newExamQuestions]);
      setExamAssignments((prev) => [...prev, ...newAssignments]);

      return newExam;
    } finally {
      setLoading(false);
    }
  };

  // Method 2: Update Exam
  const updateExam = async (
    id: string,
    examData: Partial<Exam>,
    selectedQuestionIds?: string[]
  ): Promise<Exam> => {
    if (profile && profile.role === 'siswa') {
      throw new Error('Akses Ditolak: Peserta ujian tidak diizinkan mengubah konfigurasi ujian.');
    }
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      let updatedExam: Exam | null = null;

      setExams((prev) =>
        prev.map((e) => {
          if (e.id === id) {
            updatedExam = {
              ...e,
              ...examData,
              updated_at: nowIso,
            };
            return updatedExam;
          }
          return e;
        })
      );

      // Jika ada update daftar butir soal
      if (selectedQuestionIds && selectedQuestionIds.length > 0) {
        const chosen = questions.filter((q) => selectedQuestionIds.includes(q.id));
        const newSnapshots: ExamQuestion[] = chosen.map((q, idx) => ({
          id: `eq-${id}-${idx + 1}`,
          exam_id: id,
          question_id: q.id,
          order_num: idx + 1,
          points: q.points || 10,
          snapshot: JSON.parse(JSON.stringify(q)),
          created_at: nowIso,
        }));

        setExamQuestions((prev) => [
          ...prev.filter((eq) => eq.exam_id !== id),
          ...newSnapshots,
        ]);
      }

      if (!updatedExam) throw new Error('Ujian tidak ditemukan');
      return updatedExam;
    } finally {
      setLoading(false);
    }
  };

  // Method 3: Delete Exam
  const deleteExam = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (profile && profile.role === 'siswa') {
      throw new Error('Akses Ditolak: Peserta ujian tidak diizinkan menghapus ujian.');
    }
    setExams((prev) => prev.filter((e) => e.id !== id));
    setExamQuestions((prev) => prev.filter((eq) => eq.exam_id !== id));
    setExamAssignments((prev) => prev.filter((ea) => ea.exam_id !== id));
    setExamAttempts((prev) => prev.filter((att) => att.exam_id !== id));
    return { success: true };
  };

  // Method 4: Duplicate Exam
  const duplicateExam = async (id: string): Promise<Exam> => {
    if (profile && profile.role === 'siswa') {
      throw new Error('Akses Ditolak: Peserta ujian tidak diizinkan menduplikasi ujian.');
    }
    const existing = exams.find((e) => e.id === id);
    if (!existing) throw new Error('Ujian tidak ditemukan');

    const newId = `exam-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const existingQuestions = examQuestions.filter((eq) => eq.exam_id === id);
    const duplicatedQuestions: ExamQuestion[] = existingQuestions.map((eq, idx) => ({
      ...eq,
      id: `eq-${newId}-${idx + 1}`,
      exam_id: newId,
      created_at: nowIso,
    }));

    const duplicatedExam: Exam = {
      ...existing,
      id: newId,
      title: `${existing.title} (Salinan)`,
      status: 'draft', // default salinan menjadi draf
      created_at: nowIso,
      updated_at: nowIso,
    };

    setExams((prev) => [duplicatedExam, ...prev]);
    setExamQuestions((prev) => [...prev, ...duplicatedQuestions]);

    return duplicatedExam;
  };

  // Method 5: Update Exam Status Manual
  const updateExamStatus = async (id: string, status: ExamStatus): Promise<void> => {
    if (profile && profile.role === 'siswa') {
      throw new Error('Akses Ditolak: Peserta ujian tidak diizinkan mengubah status ujian.');
    }
    setExams((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status, updated_at: new Date().toISOString() } : e))
    );
  };

  // Method 6: Check student eligibility
  const checkStudentEligibility = useCallback(
    (exam: Exam, student: Student | null): { eligible: boolean; reason?: string } => {
      if (!student) {
        return { eligible: false, reason: 'Data profil siswa tidak ditemukan.' };
      }

      if (student.status !== 'active') {
        return { eligible: false, reason: 'Status siswa tidak aktif dalam database sekolah.' };
      }

      // 1. Cek Kelas / Grade
      const studentClass = classes.find((c) => c.id === student.class_id);
      const studentGrade = studentClass?.grade || 'XI';

      if (exam.grade && exam.grade !== studentGrade) {
        return {
          eligible: false,
          reason: `Ujian ini ditujukan khusus untuk Kelas ${exam.grade}. Tingkat kelas Anda adalah Kelas ${studentGrade}.`,
        };
      }

      // 2. Cek Target Kelas Spesifik (jika ditentukan)
      if (exam.target_class_ids && exam.target_class_ids.length > 0) {
        if (!exam.target_class_ids.includes(student.class_id)) {
          return {
            eligible: false,
            reason: `Kelas Anda (${studentClass?.name || 'Tidak Diketahui'}) tidak terdaftar dalam rombel peserta ujian ini.`,
          };
        }
      }

      // 3. Cek Jurusan (jika ditentukan spesifik)
      if (exam.major_id && exam.major_id !== 'all' && exam.major_id !== student.major_id) {
        const examMajor = majors.find((m) => m.id === exam.major_id);
        return {
          eligible: false,
          reason: `Ujian ini dikhususkan bagi Program Keahlian ${examMajor?.name || 'Tertentu'}.`,
        };
      }

      return { eligible: true };
    },
    [classes, majors]
  );

  // Method 7: Get all eligible exams for a student
  const getEligibleExamsForStudent = useCallback(
    (student: Student | null): Exam[] => {
      if (!student) return [];
      return exams
        .filter((exam) => {
          const res = checkStudentEligibility(exam, student);
          return res.eligible;
        })
        .map((exam) => ({
          ...exam,
          status: getDynamicStatus(exam),
          subject: subjects.find((s) => s.id === exam.subject_id),
          teacher: teachers.find((t) => t.id === exam.teacher_id),
        }));
    },
    [exams, checkStudentEligibility, getDynamicStatus, subjects, teachers]
  );

  // Helper shuffle array
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Method 8: Start or get existing attempt (Deterministic & snapshot preserved)
  const startOrGetAttempt = useCallback(
    (examId: string, studentId: string): { attempt: ExamAttempt; isNew: boolean } => {
      const exam = exams.find((e) => e.id === examId);
      if (!exam) throw new Error('Ujian tidak ditemukan');

      // ANTI-IDOR CHECK: Siswa hanya dapat memulai ujian atas namanya sendiri
      if (profile && profile.role === 'siswa') {
        const myStudent = students.find(
          (s) => s.email?.toLowerCase() === profile.email?.toLowerCase() || s.id === profile.id
        );
        const myId = myStudent?.id || profile.id;
        const isSelf =
          studentId === myId ||
          studentId === profile.id ||
          myStudent?.user_id === profile.id;

        if (!isSelf) {
          AuditLogger.log({
            action: 'IDOR_PREVENTION_BLOCKED',
            entity: 'exam_attempts',
            userId: profile.id,
            userEmail: profile.email,
            userRole: profile.role,
            details: { examId, attemptedStudentId: studentId, actualStudentId: myId },
            status: 'BLOCKED',
          });
          throw new Error(
            'Akses Ditolak (Proteksi IDOR): Anda tidak memiliki izin mengakses atau memulai sesi ujian milik peserta lain.'
          );
        }

        // Validasi hak kepesertaan (Rombel Kelas & Jurusan)
        const studentObj = students.find(
          (s) => s.email?.toLowerCase() === profile.email?.toLowerCase() || s.id === studentId
        ) || null;
        const eligibility = checkStudentEligibility(exam, studentObj);
        if (!eligibility.eligible) {
          AuditLogger.log({
            action: 'UNAUTHORIZED_ACCESS_BLOCKED',
            entity: 'exams',
            userId: profile.id,
            userEmail: profile.email,
            userRole: profile.role,
            details: { examId, studentId, reason: eligibility.reason },
            status: 'BLOCKED',
          });
          throw new Error(`Akses Ditolak: ${eligibility.reason || 'Anda tidak terdaftar sebagai peserta ujian ini.'}`);
        }
      }

      // Cek apakah siswa sudah memiliki attempt sebelumnya
      const existing = examAttempts.find(
        (att) => att.exam_id === examId && att.student_id === studentId
      );

      if (existing) {
        if (existing.status === 'submitted' || existing.status === 'expired') {
          throw new Error('Anda telah menyelesaikan ujian ini. Sesi attempt tidak dapat diulang.');
        }
        // Jika in_progress, periksa apakah deadline server sudah habis
        const now = currentServerTime.getTime();
        const deadline = new Date(existing.deadline_time).getTime();
        if (now > deadline) {
          submitAttempt(existing.id);
          throw new Error('Batas waktu pengerjaan ujian telah berakhir.');
        }
        return { attempt: existing, isNew: false };
      }

      // Validasi Window Waktu: Siswa hanya dapat mulai jika waktu saat ini berada dalam window ujian
      const now = currentServerTime.getTime();
      const startWindow = new Date(exam.start_at).getTime();
      const endWindow = new Date(exam.end_at).getTime();

      if (now < startWindow) {
        throw new Error('Ujian belum dimulai. Harap tunggu hingga jadwal dibuka.');
      }

      if (now > endWindow) {
        throw new Error('Waktu ujian telah berakhir. Anda tidak dapat memulai sesi baru.');
      }

      // Dapatkan butir soal ujian
      const qSnapshots = examQuestions
        .filter((eq) => eq.exam_id === examId)
        .sort((a, b) => a.order_num - b.order_num);

      if (qSnapshots.length === 0) {
        throw new Error('Ujian ini belum memiliki butir soal yang di-snapshot.');
      }

      // Tentukan urutan soal: jika randomize_questions aktif, acak urutan sekali dan simpan di attempt
      let questionOrder = qSnapshots.map((q) => q.question_id);
      if (exam.randomize_questions) {
        questionOrder = shuffleArray(questionOrder);
      }

      // Tentukan urutan opsi: jika randomize_options aktif, acak opsi sekali dan simpan di attempt
      const optionOrder: Record<string, string[]> = {};
      for (const eq of qSnapshots) {
        const opts = eq.snapshot.options || [];
        const keys = opts.map((o) => o.option_key);
        if (exam.randomize_options && keys.length > 0) {
          optionOrder[eq.question_id] = shuffleArray(keys);
        } else {
          optionOrder[eq.question_id] = keys;
        }
      }

      // Hitung deadline: min(start_time + duration, end_at)
      const startTime = currentServerTime;
      const deadlineTime = calculateDeadline(exam, startTime);

      const newAttempt: ExamAttempt = {
        id: `att-${examId}-${studentId}`,
        exam_id: examId,
        student_id: studentId,
        start_time: startTime.toISOString(),
        deadline_time: deadlineTime.toISOString(),
        status: 'in_progress',
        question_order: questionOrder,
        option_order: optionOrder,
        answers: {},
        created_at: startTime.toISOString(),
        updated_at: startTime.toISOString(),
      };

      setExamAttempts((prev) => [...prev, newAttempt]);
      return { attempt: newAttempt, isNew: true };
    },
    [exams, examAttempts, examQuestions, currentServerTime, calculateDeadline]
  );

  // Method 10: Submit Attempt terintegrasi dengan Centralized Grading Engine (Fase 6)
  const submitAttempt = useCallback(
    async (attemptId: string): Promise<ExamAttempt> => {
      const attempt = examAttempts.find((a) => a.id === attemptId);
      if (!attempt) throw new Error('Attempt tidak ditemukan');

      // ANTI-IDOR CHECK: Siswa hanya dapat submit lembar ujian miliknya sendiri
      if (profile && profile.role === 'siswa') {
        const myStudent = students.find(
          (s) => s.email?.toLowerCase() === profile.email?.toLowerCase() || s.id === profile.id
        );
        const myId = myStudent?.id || profile.id;
        const isSelf =
          attempt.student_id === myId ||
          attempt.student_id === profile.id ||
          myStudent?.user_id === profile.id;

        if (!isSelf) {
          AuditLogger.log({
            action: 'IDOR_PREVENTION_BLOCKED',
            entity: 'exam_attempts_submit',
            userId: profile.id,
            userEmail: profile.email,
            userRole: profile.role,
            details: { attemptId, targetStudentId: attempt.student_id, actualStudentId: myId },
            status: 'BLOCKED',
          });
          throw new Error('Akses Ditolak (Proteksi IDOR): Anda tidak memiliki izin mengumpulkan lembar ujian milik peserta lain.');
        }
      }

      // IDEMPOTENSI SUBMIT: Mencegah duplicate request submit dan race condition
      if (attempt.status !== 'in_progress') {
        return attempt;
      }

      const finishedIso = new Date().toISOString();
      const baseAttempt: ExamAttempt = {
        ...attempt,
        status: 'submitted',
        end_time: attempt.end_time || finishedIso,
        updated_at: finishedIso,
      };

      // Evaluasi lengkap dengan Grading Engine (PG Biasa, PG Kompleks, Menjodohkan, Esai)
      const summary = evaluateAttempt(baseAttempt, examQuestions, gradeCategories);

      const updatedAttempt: ExamAttempt = {
        ...baseAttempt,
        score: summary.nilai,
        total_points: summary.skor,
        maximum_points: summary.maximum_score,
        has_pending_essay: summary.pending_essay > 0,
        result_summary: summary,
      };

      AuditLogger.log({
        action: 'EXAM_SUBMITTED',
        entity: 'exam_attempts',
        userId: attempt.student_id,
        userRole: 'siswa',
        details: {
          attemptId,
          examId: attempt.exam_id,
          score: summary.nilai,
          pendingEssay: summary.pending_essay,
        },
        status: 'SUCCESS',
      });

      setExamAttempts((prev) => prev.map((a) => (a.id === attemptId ? updatedAttempt : a)));
      return updatedAttempt;
    },
    [examAttempts, examQuestions, gradeCategories]
  );

  // Method 10b: Penilaian Esai Manual oleh Guru / Admin
  const gradeEssayAnswer = useCallback(
    async (
      attemptId: string,
      questionId: string,
      grading: { score: number; feedback?: string; grader: string }
    ): Promise<ExamAttempt> => {
      if (profile && profile.role === 'siswa') {
        throw new Error('Akses Ditolak: Peserta ujian tidak diizinkan melakukan penilaian esai.');
      }
      const attempt = examAttempts.find((a) => a.id === attemptId);
      if (!attempt) throw new Error('Attempt tidak ditemukan.');

      const updatedGradings = {
        ...(attempt.essay_gradings || {}),
        [questionId]: {
          score: Number(grading.score) || 0,
          feedback: grading.feedback || '',
          grader: grading.grader || 'Guru Penguji',
          graded_at: new Date().toISOString(),
        },
      };

      const attemptWithGrading: ExamAttempt = {
        ...attempt,
        essay_gradings: updatedGradings,
        updated_at: new Date().toISOString(),
      };

      const summary = evaluateAttempt(attemptWithGrading, examQuestions, gradeCategories);

      const finalAttempt: ExamAttempt = {
        ...attemptWithGrading,
        score: summary.nilai,
        total_points: summary.skor,
        maximum_points: summary.maximum_score,
        has_pending_essay: summary.pending_essay > 0,
        result_summary: summary,
      };

      setExamAttempts((prev) => prev.map((a) => (a.id === attemptId ? finalAttempt : a)));
      return finalAttempt;
    },
    [examAttempts, examQuestions, gradeCategories]
  );

  // Method 10c: Regrading Ujian Aman oleh Admin / Guru
  const regradeExam = useCallback(
    async (
      examId: string,
      options: {
        reason: string;
        notes?: string;
        regradedBy: string;
        canceledQuestionIds?: string[];
        cancelAction?: 'full_points' | 'exclude_from_max';
        complexScoringMethod?: 'exact_match' | 'partial_credit';
      }
    ): Promise<{ affectedAttempts: number; history: RegradeHistory[] }> => {
      if (profile && profile.role === 'siswa') {
        throw new Error('Akses Ditolak: Peserta ujian dilarang menjalankan kalkulasi ulang (regrading).');
      }
      const attemptsToRegrade = examAttempts.filter(
        (a) => a.exam_id === examId && (a.status === 'submitted' || a.status === 'expired')
      );

      if (attemptsToRegrade.length === 0) {
        return { affectedAttempts: 0, history: [] };
      }

      const timestamp = new Date().toISOString();
      const createdHistories: RegradeHistory[] = [];

      const updatedAttempts = examAttempts.map((attempt) => {
        if (attempt.exam_id !== examId || (attempt.status !== 'submitted' && attempt.status !== 'expired')) {
          return attempt;
        }

        const prevScore = attempt.score ?? 0;
        const prevEarned = attempt.total_points ?? 0;
        const currentVersion = (attempt.regrade_version || 0) + 1;

        const newSummary = evaluateAttempt(attempt, examQuestions, gradeCategories, {
          canceledQuestionIds: options.canceledQuestionIds,
          cancelAction: options.cancelAction,
          complexScoringMethod: options.complexScoringMethod,
        });

        const historyEntry: RegradeHistory = {
          id: `regrade-${attempt.id}-v${currentVersion}-${Date.now()}`,
          attempt_id: attempt.id,
          exam_id: examId,
          regraded_at: timestamp,
          regraded_by: options.regradedBy,
          reason: options.reason,
          notes: options.notes,
          previous_score: prevScore,
          previous_earned_points: prevEarned,
          new_score: newSummary.nilai,
          new_earned_points: newSummary.skor,
          version: currentVersion,
        };

        createdHistories.push(historyEntry);

        return {
          ...attempt,
          score: newSummary.nilai,
          total_points: newSummary.skor,
          maximum_points: newSummary.maximum_score,
          has_pending_essay: newSummary.pending_essay > 0,
          result_summary: newSummary,
          regrade_version: currentVersion,
          regrade_history: [...(attempt.regrade_history || []), historyEntry],
          updated_at: timestamp,
        };
      });

      setExamAttempts(updatedAttempts);
      return { affectedAttempts: attemptsToRegrade.length, history: createdHistories };
    },
    [examAttempts, examQuestions, gradeCategories]
  );

  // Method 10d: Ambil ringkasan hasil penilaian attempt (PROTECTED ANTI-IDOR)
  const getAttemptResultSummary = useCallback(
    (attemptId: string): ExamResultSummary | null => {
      const attempt = examAttempts.find((a) => a.id === attemptId);
      if (!attempt) return null;

      // ANTI-IDOR CHECK: Jika yang mengakses adalah siswa, hanya boleh membuka hasil ujian miliknya
      if (profile && profile.role === 'siswa') {
        const myStudent = students.find(
          (s) => s.email?.toLowerCase() === profile.email?.toLowerCase() || s.id === profile.id
        );
        const myId = myStudent?.id || profile.id;
        const isSelf =
          attempt.student_id === myId ||
          attempt.student_id === profile.id ||
          myStudent?.user_id === profile.id;

        if (!isSelf) {
          AuditLogger.log({
            action: 'IDOR_PREVENTION_BLOCKED',
            entity: 'attempt_result_summary',
            userId: profile.id,
            userEmail: profile.email,
            userRole: profile.role,
            details: { attemptId, attemptedStudentId: attempt.student_id, actualStudentId: myId },
            status: 'BLOCKED',
          });
          return null;
        }
      }

      if (attempt.result_summary) return attempt.result_summary;
      return evaluateAttempt(attempt, examQuestions, gradeCategories);
    },
    [examAttempts, examQuestions, gradeCategories, profile, students]
  );

  // Method 9: Simpan jawaban siswa secara realtime dengan proteksi validasi server
  const saveStudentAnswer = useCallback(
    (attemptId: string, questionId: string, answer: any) => {
      const attempt = examAttempts.find((a) => a.id === attemptId);
      if (!attempt) {
        throw new Error('Attempt tidak ditemukan.');
      }

      // ANTI-IDOR: Siswa hanya dapat mengubah lembar jawabannya sendiri
      if (profile && profile.role === 'siswa') {
        const myStudent = students.find(
          (s) => s.email?.toLowerCase() === profile.email?.toLowerCase() || s.id === profile.id
        );
        const myId = myStudent?.id || profile.id;
        const isSelf =
          attempt.student_id === myId ||
          attempt.student_id === profile.id ||
          myStudent?.user_id === profile.id;

        if (!isSelf) {
          AuditLogger.log({
            action: 'IDOR_PREVENTION_BLOCKED',
            entity: 'student_answers',
            userId: profile.id,
            userEmail: profile.email,
            userRole: profile.role,
            details: { attemptId, questionId },
            status: 'BLOCKED',
          });
          throw new Error('Akses Ditolak (Proteksi IDOR): Anda tidak memiliki hak memodifikasi lembar jawaban siswa lain.');
        }
      }

      if (attempt.status !== 'in_progress') {
        throw new Error('Ujian telah selesai atau dikumpulkan. Jawaban tidak dapat diubah lagi.');
      }

      // OPTIMASI LOAD TESTING & MENCEGAH DUPLIKASI REQUEST:
      // Jika butir jawaban sama persis dengan yang tersimpan, abaikan write/re-render
      if (JSON.stringify(attempt.answers?.[questionId]) === JSON.stringify(answer)) {
        return;
      }

      const now = currentServerTime.getTime();
      const deadline = new Date(attempt.deadline_time).getTime();
      if (now > deadline) {
        // Auto-expire attempt
        submitAttempt(attemptId);
        throw new Error('Batas waktu pengerjaan ujian telah habis. Jawaban ditolak.');
      }

      setExamAttempts((prev) =>
        prev.map((att) => {
          if (att.id === attemptId) {
            return {
              ...att,
              answers: {
                ...att.answers,
                [questionId]: answer,
              },
              updated_at: new Date().toISOString(),
            };
          }
          return att;
        })
      );
    },
    [examAttempts, currentServerTime, submitAttempt]
  );

  // Method 9b: Tandai soal ragu-ragu
  const toggleDoubtfulQuestion = useCallback(
    (attemptId: string, questionId: string) => {
      const attempt = examAttempts.find((a) => a.id === attemptId);
      if (!attempt || attempt.status !== 'in_progress') return;

      // ANTI-IDOR CHECK: Siswa hanya dapat menandai soal di attempt miliknya sendiri
      if (profile && profile.role === 'siswa') {
        const myStudent = students.find(
          (s) => s.email?.toLowerCase() === profile.email?.toLowerCase() || s.id === profile.id
        );
        const myId = myStudent?.id || profile.id;
        const isSelf =
          attempt.student_id === myId ||
          attempt.student_id === profile.id ||
          myStudent?.user_id === profile.id;
        if (!isSelf) return;
      }

      setExamAttempts((prev) =>
        prev.map((att) => {
          if (att.id === attemptId) {
            const currentDoubtful = att.doubtful_questions || [];
            const exists = currentDoubtful.includes(questionId);
            const nextDoubtful = exists
              ? currentDoubtful.filter((id) => id !== questionId)
              : [...currentDoubtful, questionId];
            return {
              ...att,
              doubtful_questions: nextDoubtful,
              updated_at: new Date().toISOString(),
            };
          }
          return att;
        })
      );
    },
    [examAttempts, profile, students]
  );

  // Method 11: GET STUDENT EXAM PAYLOAD (CRITICAL SECURITY: 100% STRIPPED OF ANSWER KEYS & ANTI-IDOR)
  const getStudentExamPayload = useCallback(
    (examId: string, studentId: string): StudentExamPayload | null => {
      const exam = exams.find((e) => e.id === examId);
      if (!exam) return null;

      // ANTI-IDOR: Siswa hanya dapat mengambil payload soal untuk akunnya sendiri
      if (profile && profile.role === 'siswa') {
        const myStudent = students.find(
          (s) => s.email?.toLowerCase() === profile.email?.toLowerCase() || s.id === profile.id
        );
        const myId = myStudent?.id || profile.id;
        const isSelf =
          studentId === myId ||
          studentId === profile.id ||
          myStudent?.user_id === profile.id;

        if (!isSelf) {
          AuditLogger.log({
            action: 'IDOR_PREVENTION_BLOCKED',
            entity: 'student_exam_payload',
            userId: profile.id,
            userEmail: profile.email,
            userRole: profile.role,
            details: { examId, attemptedStudentId: studentId, actualStudentId: myId },
            status: 'BLOCKED',
          });
          return null;
        }

        // Validasi hak kepesertaan (Rombel Kelas & Jurusan)
        const eligibility = checkStudentEligibility(exam, myStudent || null);
        if (!eligibility.eligible) {
          AuditLogger.log({
            action: 'UNAUTHORIZED_ACCESS_BLOCKED',
            entity: 'student_exam_payload',
            userId: profile.id,
            userEmail: profile.email,
            userRole: profile.role,
            details: { examId, studentId, reason: eligibility.reason },
            status: 'BLOCKED',
          });
          return null;
        }
      }

      const subject = subjects.find((s) => s.id === exam.subject_id);
      const teacher = teachers.find((t) => t.id === exam.teacher_id);
      const qSnapshots = examQuestions.filter((eq) => eq.exam_id === examId);

      // Cari atau buat attempt untuk siswa
      let attempt = examAttempts.find(
        (att) => att.exam_id === examId && att.student_id === studentId
      );

      // Urutan soal sesuai attempt (atau order_num jika attempt belum ada)
      const orderedQuestionIds = attempt ? attempt.question_order : qSnapshots.map((q) => q.question_id);

      // Map snapshot ke StudentQuestionItem (SECURITY: STRIP SEMUA KUNCI JAWABAN!)
      const studentQuestions: StudentQuestionItem[] = orderedQuestionIds
        .map((qid) => {
          const eq = qSnapshots.find((item) => item.question_id === qid);
          if (!eq) return null;
          const q = eq.snapshot;

          // Urutan opsi sesuai attempt
          const optOrder = attempt?.option_order[q.id];

          // 1. Opsi Jawaban (STRIP is_correct!)
          const safeOptions: StudentQuestionOption[] = (q.options || [])
            .map((opt) => ({
              id: opt.id,
              option_key: opt.option_key,
              option_text: opt.option_text,
              image_url: opt.image_url,
              order_num: opt.order_num,
              // JANGAN masukkan `is_correct` ke browser siswa!
            }))
            .sort((a, b) => {
              if (optOrder) {
                return optOrder.indexOf(a.option_key) - optOrder.indexOf(b.option_key);
              }
              return a.order_num - b.order_num;
            });

          // 2. Pasangan Menjodohkan (STRIP correct_match_key!)
          const safeMatchingPairs: StudentMatchingPair[] = (q.matching_pairs || []).map((p) => ({
            id: p.id,
            left_item: p.left_item,
            right_item: p.right_item,
            order_num: p.order_num,
            // JANGAN masukkan `correct_match_key` ke browser siswa!
          }));

          return {
            id: q.id,
            code: q.code,
            question_type: q.question_type,
            points: eq.points,
            question_text: q.question_text,
            image_url: q.image_url,
            options: q.options ? safeOptions : undefined,
            matching_pairs: q.matching_pairs ? safeMatchingPairs : undefined,
            // JANGAN sertakan q.explanation ke browser siswa!
            // JANGAN sertakan reference_answer atau rubric esai!
          };
        })
        .filter((q): q is StudentQuestionItem => q !== null);

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        subject_name: subject?.name || 'Mata Pelajaran',
        teacher_name: teacher?.full_name,
        grade: exam.grade,
        duration_minutes: exam.duration_minutes,
        total_questions: studentQuestions.length,
        start_at: exam.start_at,
        end_at: exam.end_at,
        instructions: exam.instructions,
        pass_score: exam.pass_score,
        questions: studentQuestions,
        attempt: attempt
          ? {
              id: attempt.id,
              start_time: attempt.start_time,
              deadline_time: attempt.deadline_time,
              status: attempt.status,
              answers: attempt.answers,
              doubtful_questions: attempt.doubtful_questions || [],
            }
          : undefined,
        server_time: currentServerTime.toISOString(),
      };
    },
    [exams, subjects, teachers, examQuestions, examAttempts, currentServerTime, profile, students]
  );

  // Helper reset all exams to initial seed
  const resetAllExamsToSeed = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_EXAMS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_EXAM_QUESTIONS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_EXAM_ASSIGNMENTS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_EXAM_ATTEMPTS_KEY);
    setExams(initialSeedExams);
    setExamQuestions([]);
    setExamAssignments([]);
    setExamAttempts([]);
    setSimulatedTimeState(new Date(`${BASE_DATE_STR}T08:30:00+07:00`));
  }, [initialSeedExams]);

  const value = useMemo(
    () => ({
      exams,
      examQuestions: profile?.role === 'siswa' ? [] : examQuestions,
      examAssignments,
      examAttempts,
      loading,
      currentServerTime,
      isSimulatedTime: !!simulatedTime,
      setSimulatedTime,
      resetToRealTime,
      getDynamicStatus,
      calculateDeadline,
      getExamById,
      getExamQuestions,
      createExam,
      updateExam,
      deleteExam,
      duplicateExam,
      updateExamStatus,
      getEligibleExamsForStudent,
      checkStudentEligibility,
      startOrGetAttempt,
      saveStudentAnswer,
      toggleDoubtfulQuestion,
      submitAttempt,
      getStudentExamPayload,
      resetAllExamsToSeed,
      gradeCategories,
      setGradeCategories,
      updateGradeCategory,
      resetGradeCategories,
      gradeEssayAnswer,
      regradeExam,
      getAttemptResultSummary,
    }),
    [
      profile?.role,
      exams,
      examQuestions,
      examAssignments,
      examAttempts,
      loading,
      currentServerTime,
      simulatedTime,
      setSimulatedTime,
      resetToRealTime,
      getDynamicStatus,
      calculateDeadline,
      getExamById,
      getExamQuestions,
      createExam,
      updateExam,
      deleteExam,
      duplicateExam,
      updateExamStatus,
      getEligibleExamsForStudent,
      checkStudentEligibility,
      startOrGetAttempt,
      saveStudentAnswer,
      toggleDoubtfulQuestion,
      submitAttempt,
      getStudentExamPayload,
      resetAllExamsToSeed,
      gradeCategories,
      setGradeCategories,
      updateGradeCategory,
      resetGradeCategories,
      gradeEssayAnswer,
      regradeExam,
      getAttemptResultSummary,
    ]
  );

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
};

export const useExam = () => {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
};
