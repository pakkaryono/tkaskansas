-- ==============================================================================
-- SKRIP DATABASE SQL PRODUKSI LENGKAP & MASTER OTENTIKASI SUPABASE
-- PROYEK: mltysivggdshktbsrvtp.supabase.co
-- APLIKASI TES KEMAMPUAN AKADEMIK (TKA) SMKN 1 SONGGOM
-- ==============================================================================
-- Fitur & Penyempurnaan:
-- [x] Skema Master Data, Bank Soal 4 Tipe Soal TKA, Pelaksanaan Ujian & CBT Engine
-- [x] Bebas error 42804 (Dynamic check UUID vs TEXT pada auth.identities)
-- [x] Idempotent (Aman dijalankan berulang kali tanpa merusak data yang ada)
-- [x] Akun login resmi otomatis terdaftar dan terkonfirmasi (Ready-to-Login)
-- [x] Mendukung login via NIS, NISN, NIP, atau Email
-- [x] Fungsi RPC Lengkap: get_email_by_identifier, admin_create_user,
--     admin_batch_create_users, admin_reset_user_password, sync_unregistered_logins
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPE ENUM ROLE
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'guru', 'siswa');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL PROFILES (Terkoneksi ke auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'siswa' CHECK (role IN ('admin', 'guru', 'siswa')),
    phone_number TEXT,
    nip TEXT,
    nis TEXT,
    nisn TEXT,
    class_name TEXT,
    major_name TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-Repair Kolom Profiles
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS nip TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS nisn TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS major_name TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. TABEL MAJORS (Program Keahlian / Jurusan)
CREATE TABLE IF NOT EXISTS public.majors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.majors ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS public.majors ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_majors_status ON public.majors(status);

-- 5. TABEL CLASSES (Rombongan Belajar / Kelas)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    grade TEXT NOT NULL CHECK (grade IN ('X', 'XI', 'XII')),
    major_id UUID NOT NULL REFERENCES public.majors(id) ON DELETE RESTRICT,
    academic_year TEXT NOT NULL DEFAULT '2026/2027',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.classes ADD COLUMN IF NOT EXISTS academic_year TEXT NOT NULL DEFAULT '2026/2027';
ALTER TABLE IF EXISTS public.classes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_classes_major_id ON public.classes(major_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade ON public.classes(grade);

-- 6. TABEL SUBJECTS (Mata Pelajaran)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Umum',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.subjects ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Umum';
ALTER TABLE IF EXISTS public.subjects ALTER COLUMN category DROP NOT NULL;
ALTER TABLE IF EXISTS public.subjects ALTER COLUMN category SET DEFAULT 'Umum';
UPDATE public.subjects SET category = 'Umum' WHERE category IS NULL;
ALTER TABLE IF EXISTS public.subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS public.subjects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_subjects_status ON public.subjects(status);

-- 7. TABEL TEACHERS (Data Pendidik / Guru)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nip TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.teachers ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE IF EXISTS public.teachers ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE IF EXISTS public.teachers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_teachers_status ON public.teachers(status);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON public.teachers(email);

-- 8. TABEL TEACHER_SUBJECTS (Relasi Guru Mengampu Mapel)
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON public.teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON public.teacher_subjects(subject_id);

-- 9. TABEL STUDENTS (Peserta Didik / Siswa)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nis TEXT UNIQUE NOT NULL,
    nisn TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    gender TEXT DEFAULT 'L',
    class_id UUID REFERENCES public.classes(id) ON DELETE RESTRICT,
    major_id UUID REFERENCES public.majors(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.students ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE IF EXISTS public.students ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE IF EXISTS public.students ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'L';
ALTER TABLE IF EXISTS public.students ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_major_id ON public.students(major_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);

-- 10. TABEL QUESTIONS (Bank Soal TKA)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    major_id UUID REFERENCES public.majors(id) ON DELETE SET NULL,
    grade TEXT NOT NULL DEFAULT 'XI' CHECK (grade IN ('X', 'XI', 'XII')),
    question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'complex_choice', 'essay', 'matching')),
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points NUMERIC(6,2) NOT NULL DEFAULT 10.00,
    question_text TEXT NOT NULL,
    image_url TEXT,
    explanation TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    scoring_method TEXT NOT NULL DEFAULT 'exact_match' CHECK (scoring_method IN ('exact_match', 'partial_credit', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE IF EXISTS public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE IF EXISTS public.questions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE IF EXISTS public.questions ADD COLUMN IF NOT EXISTS scoring_method TEXT NOT NULL DEFAULT 'exact_match';

CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_teacher_id ON public.questions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);

-- 11. TABEL QUESTION_OPTIONS
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_key TEXT NOT NULL CHECK (option_key IN ('A', 'B', 'C', 'D', 'E')),
    option_text TEXT NOT NULL,
    image_url TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_num INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.question_options ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE IF EXISTS public.question_options ADD COLUMN IF NOT EXISTS is_correct BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON public.question_options(question_id);

-- 12. TABEL QUESTION_ANSWERS
CREATE TABLE IF NOT EXISTS public.question_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID UNIQUE NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    reference_answer TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    sample_rubric TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_answers_question_id ON public.question_answers(question_id);

-- 13. TABEL MATCHING_PAIRS
CREATE TABLE IF NOT EXISTS public.matching_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    left_item TEXT NOT NULL,
    right_item TEXT NOT NULL,
    correct_match_key TEXT NOT NULL,
    order_num INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matching_pairs_question_id ON public.matching_pairs(question_id);

-- 14. TABEL EXAMS
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    grade TEXT NOT NULL CHECK (grade IN ('X', 'XI', 'XII')),
    major_id UUID REFERENCES public.majors(id) ON DELETE SET NULL,
    target_class_ids UUID[] DEFAULT '{}',
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_questions INTEGER NOT NULL DEFAULT 20,
    instructions TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'open', 'closed', 'archived')),
    randomize_questions BOOLEAN NOT NULL DEFAULT true,
    randomize_options BOOLEAN NOT NULL DEFAULT true,
    pass_score NUMERIC(5,2) NOT NULL DEFAULT 75.00,
    question_selection_method TEXT NOT NULL DEFAULT 'random' CHECK (question_selection_method IN ('manual', 'random')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS target_class_ids UUID[] DEFAULT '{}';
ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS randomize_options BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS pass_score NUMERIC(5,2) NOT NULL DEFAULT 75.00;
ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS question_selection_method TEXT NOT NULL DEFAULT 'random';

CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON public.exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_teacher_id ON public.exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exams_schedule ON public.exams(start_at, end_at);

-- 15. TABEL EXAM_QUESTIONS
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
    order_num INTEGER NOT NULL DEFAULT 1,
    points NUMERIC(6,2) NOT NULL DEFAULT 10.00,
    snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON public.exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question_id ON public.exam_questions(question_id);

-- 16. TABEL EXAM_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.exam_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    can_take BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam_id ON public.exam_assignments(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_class_id ON public.exam_assignments(class_id);

-- 17. TABEL EXAM_ATTEMPTS (Sesi Pengerjaan Ujian Siswa)
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'expired', 'abandoned', 'graded')),
    question_order JSONB DEFAULT '[]'::jsonb,
    option_order JSONB DEFAULT '{}'::jsonb,
    answers JSONB DEFAULT '{}'::jsonb,
    doubtful_questions JSONB DEFAULT '[]'::jsonb,
    score NUMERIC(5,2),
    total_points NUMERIC(6,2),
    maximum_points NUMERIC(6,2),
    has_pending_essay BOOLEAN DEFAULT false,
    essay_gradings JSONB DEFAULT '{}'::jsonb,
    result_summary JSONB,
    regrade_history JSONB DEFAULT '[]'::jsonb,
    regrade_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS question_order JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS option_order JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS doubtful_questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS has_pending_essay BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS essay_gradings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS result_summary JSONB;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS regrade_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS regrade_version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_id ON public.exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON public.exam_attempts(status);

-- 18. TABEL STUDENT_ANSWERS
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
    student_answer JSONB,
    is_doubtful BOOLEAN DEFAULT false,
    is_correct BOOLEAN,
    points_earned NUMERIC(6,2) DEFAULT 0.00,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_student_answers_attempt ON public.student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question ON public.student_answers(question_id);

-- 19. TABEL AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 20. TABEL GRADE_CATEGORY_CONFIGS
CREATE TABLE IF NOT EXISTS public.grade_category_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    min_score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    badge_class TEXT NOT NULL,
    color TEXT,
    order_num INTEGER DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 21. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_category_configs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'guru'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "majors_read" ON public.majors;
CREATE POLICY "majors_read" ON public.majors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "majors_admin" ON public.majors;
CREATE POLICY "majors_admin" ON public.majors FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "classes_read" ON public.classes;
CREATE POLICY "classes_read" ON public.classes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "classes_admin" ON public.classes;
CREATE POLICY "classes_admin" ON public.classes FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "subjects_read" ON public.subjects;
CREATE POLICY "subjects_read" ON public.subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "subjects_admin" ON public.subjects;
CREATE POLICY "subjects_admin" ON public.subjects FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "teachers_read" ON public.teachers;
CREATE POLICY "teachers_read" ON public.teachers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "teachers_admin" ON public.teachers;
CREATE POLICY "teachers_admin" ON public.teachers FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "teacher_subjects_read" ON public.teacher_subjects;
CREATE POLICY "teacher_subjects_read" ON public.teacher_subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "teacher_subjects_admin" ON public.teacher_subjects;
CREATE POLICY "teacher_subjects_admin" ON public.teacher_subjects FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "students_read" ON public.students;
CREATE POLICY "students_read" ON public.students FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "students_admin" ON public.students;
CREATE POLICY "students_admin" ON public.students FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "questions_staff" ON public.questions;
CREATE POLICY "questions_staff" ON public.questions FOR ALL TO authenticated
USING (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "question_options_staff" ON public.question_options;
CREATE POLICY "question_options_staff" ON public.question_options FOR ALL TO authenticated
USING (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "question_answers_staff" ON public.question_answers;
CREATE POLICY "question_answers_staff" ON public.question_answers FOR ALL TO authenticated
USING (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "matching_pairs_staff" ON public.matching_pairs;
CREATE POLICY "matching_pairs_staff" ON public.matching_pairs FOR ALL TO authenticated
USING (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "exams_read" ON public.exams;
CREATE POLICY "exams_read" ON public.exams FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "exams_staff" ON public.exams;
CREATE POLICY "exams_staff" ON public.exams FOR ALL TO authenticated
USING (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "exam_questions_read" ON public.exam_questions;
CREATE POLICY "exam_questions_read" ON public.exam_questions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "exam_questions_staff" ON public.exam_questions;
CREATE POLICY "exam_questions_staff" ON public.exam_questions FOR ALL TO authenticated
USING (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "exam_assignments_read" ON public.exam_assignments;
CREATE POLICY "exam_assignments_read" ON public.exam_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "exam_assignments_staff" ON public.exam_assignments;
CREATE POLICY "exam_assignments_staff" ON public.exam_assignments FOR ALL TO authenticated
USING (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "attempts_student_select" ON public.exam_attempts;
CREATE POLICY "attempts_student_select" ON public.exam_attempts FOR SELECT TO authenticated
USING (
    public.is_admin() OR
    public.is_teacher() OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "attempts_student_insert" ON public.exam_attempts;
CREATE POLICY "attempts_student_insert" ON public.exam_attempts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "attempts_update" ON public.exam_attempts;
CREATE POLICY "attempts_update" ON public.exam_attempts FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "student_answers_all" ON public.student_answers;
CREATE POLICY "student_answers_all" ON public.student_answers FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "grade_category_read" ON public.grade_category_configs;
CREATE POLICY "grade_category_read" ON public.grade_category_configs FOR SELECT TO authenticated USING (true);

-- ==============================================================================
-- 22. RPC: GET_STUDENT_EXAM_PAYLOAD (STRIPPED OF KEYS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_student_exam_payload(
    p_exam_id UUID,
    p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exam RECORD;
    v_questions JSONB;
BEGIN
    SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Ujian tidak ditemukan');
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', q.id,
            'code', q.code,
            'grade', q.grade,
            'question_type', q.question_type,
            'difficulty', q.difficulty,
            'points', eq.points,
            'question_text', q.question_text,
            'image_url', q.image_url,
            'options', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', qo.id,
                        'option_key', qo.option_key,
                        'option_text', qo.option_text,
                        'image_url', qo.image_url,
                        'order_num', qo.order_num
                    ) ORDER BY qo.order_num
                )
                FROM public.question_options qo
                WHERE qo.question_id = q.id
            ),
            'matching_pairs', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', mp.id,
                        'left_item', mp.left_item,
                        'right_item', mp.right_item,
                        'order_num', mp.order_num
                    ) ORDER BY mp.order_num
                )
                FROM public.matching_pairs mp
                WHERE mp.question_id = q.id
            )
        ) ORDER BY eq.order_num
    )
    INTO v_questions
    FROM public.exam_questions eq
    JOIN public.questions q ON q.id = eq.question_id
    WHERE eq.exam_id = p_exam_id;

    RETURN jsonb_build_object(
        'exam', jsonb_build_object(
            'id', v_exam.id,
            'title', v_exam.title,
            'description', v_exam.description,
            'duration_minutes', v_exam.duration_minutes,
            'start_at', v_exam.start_at,
            'end_at', v_exam.end_at,
            'randomize_questions', v_exam.randomize_questions,
            'randomize_options', v_exam.randomize_options,
            'pass_score', v_exam.pass_score,
            'instructions', v_exam.instructions
        ),
        'questions', COALESCE(v_questions, '[]'::jsonb)
    );
END;
$$;

-- ==============================================================================
-- 23. SEED MASTER DATA DASAR SMKN 1 SONGGOM (IDEMPOTENT)
-- ==============================================================================

-- 23.1 MAJORS (3 PROGRAM KEAHLIAN)
INSERT INTO public.majors (id, code, name, description, status)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'TJKT', 'Teknik Jaringan Komputer dan Telekomunikasi', 'Konsentrasi keahlian infrastruktur jaringan, server, fiber optic dan telekomunikasi.', 'active'),
    ('a2222222-2222-2222-2222-222222222222', 'TKRO', 'Teknik Kendaraan Ringan Otomotif', 'Konsentrasi keahlian mesin otomotif modern, kelistrikan kendaraan, dan chasis.', 'active'),
    ('a3333333-3333-3333-3333-333333333333', 'AKL', 'Akuntansi dan Keuangan Lembaga', 'Konsentrasi keahlian pembukuan digital, perpajakan, dan perbankan.', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 23.2 CLASSES (3 KELAS)
INSERT INTO public.classes (id, name, grade, major_id, academic_year, status)
VALUES
    ('b1111111-1111-1111-1111-111111111111', 'X TJKT 1', 'X', 'a1111111-1111-1111-1111-111111111111', '2026/2027', 'active'),
    ('b2222222-2222-2222-2222-222222222222', 'XI TJKT 1', 'XI', 'a1111111-1111-1111-1111-111111111111', '2026/2027', 'active'),
    ('b3333333-3333-3333-3333-333333333333', 'XII TKRO 1', 'XII', 'a2222222-2222-2222-2222-222222222222', '2026/2027', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 23.3 SUBJECTS (3 MATA PELAJARAN DENGAN KATEGORI NON-NULL)
INSERT INTO public.subjects (id, code, name, description, category, status)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'AIJ', 'Administrasi Infrastruktur Jaringan', 'Routing statik & dinamik, VLAN, firewall, NAT dan monitoring traffic jaringan.', 'Kejuruan', 'active'),
    ('c2222222-2222-2222-2222-222222222222', 'MTK', 'Matematika Terapan Kejuruan', 'Aljabar, trigonometri, statistika data dan probabilitas teknik.', 'Umum', 'active'),
    ('c3333333-3333-3333-3333-333333333333', 'BIND', 'Bahasa Indonesia Kejuruan', 'Penyusunan laporan teknis ilmiah, proposal kerja industri, dan tata bahasa formal.', 'Umum', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, category = EXCLUDED.category;

-- 23.4 TEACHERS (3 GURU)
INSERT INTO public.teachers (id, nip, full_name, email, phone_number, status)
VALUES
    ('d2222222-2222-2222-2222-222222222222', '198803152014022003', 'Siti Aminah, S.Kom., Gr.', 'guru@smk.id', '0857-1122-3344', 'active'),
    ('d3333333-3333-3333-3333-333333333333', '198405102010011015', 'Budi Santoso, S.Pd.', 'budi.santoso@smk.id', '0813-2233-4455', 'active'),
    ('d4444444-4444-4444-4444-444444444444', '199208222019032007', 'Dewi Lestari, M.Pd.', 'dewi.lestari@smk.id', '0819-3344-5566', 'active')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, status = EXCLUDED.status;

-- 23.5 TEACHER_SUBJECTS (RELASI PENGAMPU)
INSERT INTO public.teacher_subjects (id, teacher_id, subject_id)
VALUES
    ('d5555555-5555-5555-5555-555555555551', 'd2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111'),
    ('d5555555-5555-5555-5555-555555555552', 'd3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222'),
    ('d5555555-5555-5555-5555-555555555553', 'd4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333')
ON CONFLICT (teacher_id, subject_id) DO NOTHING;

-- 23.6 STUDENTS (3 PESERTA DIDIK)
INSERT INTO public.students (id, nis, nisn, full_name, email, phone_number, class_id, major_id, status)
VALUES
    ('e1111111-1111-1111-1111-111111111111', '21001', '0051234567', 'Budi Siswa Pratama', 'siswa@smk.id', '0812-3456-7890', 'b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'active'),
    ('e2222222-2222-2222-2222-222222222222', '21002', '0051234568', 'Ahmad Rizky Maulana', 'ahmad.rizky@smk.id', '0812-9876-5432', 'b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'active'),
    ('e3333333-3333-3333-3333-333333333333', '21003', '0051234569', 'Siti Nurhaliza', 'siti.nurhaliza@smk.id', '0813-7788-9900', 'b3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'active')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, status = EXCLUDED.status;

-- 23.7 GRADE CATEGORY CONFIGS
INSERT INTO public.grade_category_configs (id, min_score, max_score, code, label, badge_class, color, order_num, description)
VALUES
    ('ca111111-1111-1111-1111-111111111111', 90.00, 100.00, 'A', 'Sangat Baik', 'bg-emerald-100 text-emerald-800 border-emerald-300', '#059669', 1, 'Menguasai seluruh kompetensi kejuruan dengan predikat istimewa.'),
    ('ca222222-2222-2222-2222-222222222222', 80.00, 89.99, 'B', 'Baik', 'bg-blue-100 text-blue-800 border-blue-300', '#2563eb', 2, 'Menguasai kompetensi kejuruan dengan tuntas.'),
    ('ca333333-3333-3333-3333-333333333333', 70.00, 79.99, 'C', 'Cukup', 'bg-amber-100 text-amber-800 border-amber-300', '#d97706', 3, 'Memenuhi standar minimal KKM dengan pendampingan.'),
    ('ca444444-4444-4444-4444-444444444444', 0.00, 69.99, 'D', 'Perlu Bimbingan', 'bg-rose-100 text-rose-800 border-rose-300', '#e11d48', 4, 'Belum tuntas, wajib mengikuti program remedial.')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, min_score = EXCLUDED.min_score, max_score = EXCLUDED.max_score;

-- 23.8 QUESTIONS (4 TIPE SOAL TKA)
INSERT INTO public.questions (
    id, code, subject_id, teacher_id, grade, question_type, difficulty,
    points, question_text, explanation, status, scoring_method
)
VALUES
    (
        'f1111111-1111-1111-1111-111111111111',
        'SOAL-AIJ-001',
        'c1111111-1111-1111-1111-111111111111',
        'd2222222-2222-2222-2222-222222222222',
        'XI',
        'single_choice',
        'medium',
        25.00,
        'Pada konfigurasi router MikroTik atau Cisco di lingkungan jaringan SMK, fitur apa yang digunakan untuk menerjemahkan banyak IP Private dari jaringan laboratorium komputer ke satu IP Public router saat mengakses internet?',
        'NAT (Network Address Translation) khususnya masquerade atau PAT bertugas memetakan IP privat ke IP publik tunggal.',
        'active',
        'exact_match'
    ),
    (
        'f2222222-2222-2222-2222-222222222222',
        'SOAL-AIJ-002',
        'c1111111-1111-1111-1111-111111111111',
        'd2222222-2222-2222-2222-222222222222',
        'XI',
        'complex_choice',
        'hard',
        25.00,
        'Manakah dari pernyataan berikut yang merupakan keuntungan utama dari penerapan Virtual Local Area Network (VLAN) pada switch manageable? (Pilihlah lebih dari satu jawaban yang benar)',
        'VLAN mengisolasi broadcast domain, membatasi akses antar divisi/kelas, dan meningkatkan efisiensi bandwidth.',
        'active',
        'partial_credit'
    ),
    (
        'f3333333-3333-3333-3333-333333333333',
        'SOAL-AIJ-003',
        'c1111111-1111-1111-1111-111111111111',
        'd2222222-2222-2222-2222-222222222222',
        'XI',
        'matching',
        'medium',
        25.00,
        'Jodohkanlah nomor port standar berikut dengan protokol jaringan yang tepat:',
        'Port 80 adalah HTTP, Port 443 adalah HTTPS, Port 22 adalah SSH, dan Port 53 adalah DNS.',
        'active',
        'partial_credit'
    ),
    (
        'f4444444-4444-4444-4444-444444444444',
        'SOAL-AIJ-004',
        'c1111111-1111-1111-1111-111111111111',
        'd2222222-2222-2222-2222-222222222222',
        'XI',
        'essay',
        'hard',
        25.00,
        'Jelaskan perbedaan mendasar antara routing statik dan routing dinamik, serta sebutkan satu contoh skenario kapan sebuah instansi sekolah sebaiknya beralih dari routing statik ke routing dinamik!',
        'Routing statik dikonfigurasi secara manual untuk tiap rute, sedangkan routing dinamik saling bertukar tabel routing secara otomatis menggunakan routing protocol (seperti OSPF atau BGP). Sekolah sebaiknya beralih ke routing dinamik ketika jumlah gedung/router bertambah banyak dan membutuhkan jalur failover otomatis ketika salah satu link fiber optic terputus.',
        'active',
        'manual'
    )
ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, status = EXCLUDED.status;

-- 23.9 QUESTION_OPTIONS
INSERT INTO public.question_options (id, question_id, option_key, option_text, is_correct, order_num)
VALUES
    ('01111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'A', 'DHCP Server', false, 1),
    ('01111111-1111-1111-1111-111111111112', 'f1111111-1111-1111-1111-111111111111', 'B', 'NAT (Network Address Translation)', true, 2),
    ('01111111-1111-1111-1111-111111111113', 'f1111111-1111-1111-1111-111111111111', 'C', 'DNS Resolver', false, 3),
    ('01111111-1111-1111-1111-111111111114', 'f1111111-1111-1111-1111-111111111111', 'D', 'Proxy Server Squid', false, 4),
    ('01111111-1111-1111-1111-111111111115', 'f1111111-1111-1111-1111-111111111111', 'E', 'NTP Client Sync', false, 5),
    ('02222222-2222-2222-2222-222222222221', 'f2222222-2222-2222-2222-222222222222', 'A', 'Mempersempit domain broadcast jaringan lokal', true, 1),
    ('02222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 'B', 'Meningkatkan keamanan dengan segmentasi logis antar departemen', true, 2),
    ('02222222-2222-2222-2222-222222222223', 'f2222222-2222-2222-2222-222222222222', 'C', 'Menggantikan fungsi kabel fisik menjadi sepenuhnya nirkabel', false, 3),
    ('02222222-2222-2222-2222-222222222224', 'f2222222-2222-2222-2222-222222222222', 'D', 'Memudahkan manajemen jaringan tanpa merombak kabel fisik', true, 4),
    ('02222222-2222-2222-2222-222222222225', 'f2222222-2222-2222-2222-222222222222', 'E', 'Otomatis memperbesar kapasitas kecepatan ISP sekolah 10x lipat', false, 5)
ON CONFLICT (id) DO UPDATE SET option_text = EXCLUDED.option_text, is_correct = EXCLUDED.is_correct;

-- 23.10 MATCHING_PAIRS
INSERT INTO public.matching_pairs (id, question_id, left_item, right_item, correct_match_key, order_num)
VALUES
    ('21111111-1111-1111-1111-111111111111', 'f3333333-3333-3333-3333-333333333333', 'Port 80', 'HTTP', 'HTTP', 1),
    ('21111111-1111-1111-1111-111111111112', 'f3333333-3333-3333-3333-333333333333', 'Port 443', 'HTTPS', 'HTTPS', 2),
    ('21111111-1111-1111-1111-111111111113', 'f3333333-3333-3333-3333-333333333333', 'Port 22', 'SSH', 'SSH', 3),
    ('21111111-1111-1111-1111-111111111114', 'f3333333-3333-3333-3333-333333333333', 'Port 53', 'DNS', 'DNS', 4)
ON CONFLICT (id) DO UPDATE SET left_item = EXCLUDED.left_item, right_item = EXCLUDED.right_item;

-- 23.11 QUESTION_ANSWERS
INSERT INTO public.question_answers (id, question_id, reference_answer, keywords, sample_rubric)
VALUES
    (
        'a4444444-4444-4444-4444-444444444444',
        'f4444444-4444-4444-4444-444444444444',
        'Routing statik adalah penentuan rute jaringan yang dimasukkan secara manual oleh administrator. Routing dinamik adalah metode di mana router saling bertukar informasi tabel routing secara otomatis menggunakan routing protocol (seperti OSPF atau BGP). Sekolah sebaiknya beralih ke routing dinamik ketika jumlah gedung/router bertambah banyak dan membutuhkan jalur failover otomatis ketika salah satu link fiber optic terputus.',
        ARRAY['manual', 'otomatis', 'failover', 'OSPF', 'tabel routing'],
        'Skor 25: Menjelaskan statik, dinamik, dan contoh skenario dengan sangat tepat. Skor 15: Menjelaskan perbedaan namun skenario kurang relevan. Skor 5: Hanya menyebutkan definisi singkat.'
    )
ON CONFLICT (question_id) DO UPDATE SET reference_answer = EXCLUDED.reference_answer, keywords = EXCLUDED.keywords;

-- 23.12 EXAMS (UJIAN KEJURUAN TKA)
INSERT INTO public.exams (
    id, title, description, subject_id, teacher_id, grade, major_id,
    target_class_ids, start_at, end_at, duration_minutes, total_questions,
    instructions, status, randomize_questions, randomize_options, pass_score, question_selection_method
)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'Tes Kemampuan Akademik (TKA) Kejuruan AIJ 2026',
        'Ujian Penilaian Kemampuan Standar Industri TKJ: Routing, VLAN, NAT, dan Protokol Jaringan.',
        'c1111111-1111-1111-1111-111111111111',
        'd2222222-2222-2222-2222-222222222222',
        'XI',
        'a1111111-1111-1111-1111-111111111111',
        ARRAY['b2222222-2222-2222-2222-222222222222']::uuid[],
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '14 days',
        60,
        4,
        'Bacalah setiap butir soal dengan saksama. Jawablah soal pilihan ganda, pilihan kompleks, menjodohkan, dan esai secara jujur dan tertib.',
        'open',
        true,
        true,
        75.00,
        'manual'
    )
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

-- 23.13 EXAM_QUESTIONS
INSERT INTO public.exam_questions (id, exam_id, question_id, order_num, points)
VALUES
    ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 1, 25.00),
    ('32222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222', 2, 25.00),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'f3333333-3333-3333-3333-333333333333', 3, 25.00),
    ('34444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'f4444444-4444-4444-4444-444444444444', 4, 25.00)
ON CONFLICT (exam_id, question_id) DO UPDATE SET points = EXCLUDED.points;

-- 23.14 EXAM_ASSIGNMENTS (KELAS XI TJKT 1)
INSERT INTO public.exam_assignments (id, exam_id, class_id, can_take)
VALUES
    ('ea111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 24. HELPER AUTH & IDENTITIES BEBAS ERROR 42804
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.ensure_auth_identity(p_user_id UUID, p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_has_provider_id BOOLEAN;
    v_id_type TEXT;
    v_clean_email TEXT;
    v_identity_data JSONB;
BEGIN
    IF p_user_id IS NULL OR p_email IS NULL OR trim(p_email) = '' THEN
        RETURN;
    END IF;

    v_clean_email := LOWER(trim(p_email));
    v_identity_data := jsonb_build_object(
        'sub', p_user_id::text,
        'email', v_clean_email,
        'email_verified', true
    );

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
    ) INTO v_has_provider_id;

    SELECT COALESCE(data_type, 'uuid') INTO v_id_type
    FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id';

    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
    WHERE id = p_user_id;

    DELETE FROM auth.identities WHERE user_id = p_user_id AND provider = 'email';

    IF v_id_type = 'uuid' THEN
        DELETE FROM auth.identities WHERE id = p_user_id;

        IF v_has_provider_id THEN
            EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
                     VALUES ($1, $2, $3, ''email'', $4, NOW(), NOW(), NOW())
                     ON CONFLICT DO NOTHING'
            USING p_user_id, p_user_id, v_identity_data, p_user_id::text;
        ELSE
            EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
                     VALUES ($1, $2, $3, ''email'', NOW(), NOW(), NOW())
                     ON CONFLICT DO NOTHING'
            USING p_user_id, p_user_id, v_identity_data;
        END IF;
    ELSE
        DELETE FROM auth.identities WHERE id = p_user_id::text;

        IF v_has_provider_id THEN
            EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
                     VALUES ($1, $2, $3, ''email'', $4, NOW(), NOW(), NOW())
                     ON CONFLICT DO NOTHING'
            USING p_user_id::text, p_user_id, v_identity_data, p_user_id::text;
        ELSE
            EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
                     VALUES ($1, $2, $3, ''email'', NOW(), NOW(), NOW())
                     ON CONFLICT DO NOTHING'
            USING p_user_id::text, p_user_id, v_identity_data;
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice ensure_auth_identity (%): %', p_email, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_auth_identity(UUID, TEXT) TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 25. RESOLUSI LOGIN VIA NIS, NISN, NIP, ATAU EMAIL
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_email_by_identifier(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_id TEXT;
    v_email TEXT;
BEGIN
    IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
        RETURN NULL;
    END IF;

    v_clean_id := trim(p_identifier);

    IF v_clean_id LIKE '%@%' THEN
        RETURN LOWER(v_clean_id);
    END IF;

    -- 1. Cari NIS di profiles
    SELECT email INTO v_email
    FROM public.profiles
    WHERE nis = v_clean_id OR LOWER(email) = LOWER(v_clean_id)
    LIMIT 1;

    IF v_email IS NOT NULL THEN
        RETURN LOWER(v_email);
    END IF;

    -- 2. Cari NIP di profiles
    SELECT email INTO v_email
    FROM public.profiles
    WHERE nip = v_clean_id
    LIMIT 1;

    IF v_email IS NOT NULL THEN
        RETURN LOWER(v_email);
    END IF;

    -- 3. Cari di students (NIS atau NISN)
    SELECT email INTO v_email
    FROM public.students
    WHERE nis = v_clean_id OR nisn = v_clean_id
    LIMIT 1;

    IF v_email IS NOT NULL THEN
        RETURN LOWER(v_email);
    END IF;

    -- 4. Cari di teachers (NIP)
    SELECT email INTO v_email
    FROM public.teachers
    WHERE nip = v_clean_id
    LIMIT 1;

    IF v_email IS NOT NULL THEN
        RETURN LOWER(v_email);
    END IF;

    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_identifier(TEXT) TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 26. PROVISI AKUN-AKUN RESMI DEFAULT KE DALAM AUTH.USERS & PUBLIC.PROFILES
-- ==============================================================================
DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_admin2_id UUID := '00000000-0000-0000-0000-000000000002';
    v_guru_id UUID := '00000000-0000-0000-0000-000000000003';
    v_siswa_id UUID := '00000000-0000-0000-0000-000000000004';
BEGIN
    -- 1. AKUN ADMIN UTAMA: karyono621@guru.smk.belajar.id (Password: AdminTKA2026!)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = 'karyono621@guru.smk.belajar.id') THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            v_admin_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'karyono621@guru.smk.belajar.id',
            crypt('AdminTKA2026!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Karyono (Administrator TKA)","role":"admin"}'::jsonb,
            NOW(), NOW(), '', '', '', ''
        );
    ELSE
        SELECT id INTO v_admin_id FROM auth.users WHERE LOWER(email) = 'karyono621@guru.smk.belajar.id';
        UPDATE auth.users SET encrypted_password = crypt('AdminTKA2026!', gen_salt('bf')) WHERE id = v_admin_id;
    END IF;

    PERFORM public.ensure_auth_identity(v_admin_id, 'karyono621@guru.smk.belajar.id');

    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (v_admin_id, 'karyono621@guru.smk.belajar.id', 'Karyono (Administrator TKA)', 'admin', 'active')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active', email = 'karyono621@guru.smk.belajar.id';

    -- 2. AKUN ADMIN SEKOLAH: admin@smk.id (Password: AdminTKA2026!)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = 'admin@smk.id') THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            v_admin2_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'admin@smk.id',
            crypt('AdminTKA2026!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Administrator SMKN 1 Songgom","role":"admin"}'::jsonb,
            NOW(), NOW(), '', '', '', ''
        );
    ELSE
        SELECT id INTO v_admin2_id FROM auth.users WHERE LOWER(email) = 'admin@smk.id';
        UPDATE auth.users SET encrypted_password = crypt('AdminTKA2026!', gen_salt('bf')) WHERE id = v_admin2_id;
    END IF;

    PERFORM public.ensure_auth_identity(v_admin2_id, 'admin@smk.id');

    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (v_admin2_id, 'admin@smk.id', 'Administrator SMKN 1 Songgom', 'admin', 'active')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active', email = 'admin@smk.id';

    -- 3. AKUN GURU RESMI: guru@smk.id (Password: GuruTKA2026!)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = 'guru@smk.id') THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            v_guru_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'guru@smk.id',
            crypt('GuruTKA2026!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Siti Aminah, S.Kom., Gr.","role":"guru"}'::jsonb,
            NOW(), NOW(), '', '', '', ''
        );
    ELSE
        SELECT id INTO v_guru_id FROM auth.users WHERE LOWER(email) = 'guru@smk.id';
        UPDATE auth.users SET encrypted_password = crypt('GuruTKA2026!', gen_salt('bf')) WHERE id = v_guru_id;
    END IF;

    PERFORM public.ensure_auth_identity(v_guru_id, 'guru@smk.id');

    INSERT INTO public.profiles (id, email, full_name, role, status, nip)
    VALUES (v_guru_id, 'guru@smk.id', 'Siti Aminah, S.Kom., Gr.', 'guru', 'active', '198803152014022003')
    ON CONFLICT (id) DO UPDATE SET role = 'guru', status = 'active', email = 'guru@smk.id', nip = '198803152014022003';

    UPDATE public.teachers SET user_id = v_guru_id WHERE LOWER(email) = 'guru@smk.id';

    -- 4. AKUN SISWA RESMI: siswa@smk.id (Password: SiswaTKA2026!)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = 'siswa@smk.id') THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            v_siswa_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'siswa@smk.id',
            crypt('SiswaTKA2026!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Budi Siswa Pratama","role":"siswa"}'::jsonb,
            NOW(), NOW(), '', '', '', ''
        );
    ELSE
        SELECT id INTO v_siswa_id FROM auth.users WHERE LOWER(email) = 'siswa@smk.id';
        UPDATE auth.users SET encrypted_password = crypt('SiswaTKA2026!', gen_salt('bf')) WHERE id = v_siswa_id;
    END IF;

    PERFORM public.ensure_auth_identity(v_siswa_id, 'siswa@smk.id');

    INSERT INTO public.profiles (id, email, full_name, role, status, nis, nisn, class_name, major_name)
    VALUES (v_siswa_id, 'siswa@smk.id', 'Budi Siswa Pratama', 'siswa', 'active', '21001', '0051234567', 'XI TJKT 1', 'Teknik Jaringan Komputer dan Telekomunikasi')
    ON CONFLICT (id) DO UPDATE SET role = 'siswa', status = 'active', email = 'siswa@smk.id', nis = '21001';

    UPDATE public.students SET user_id = v_siswa_id WHERE LOWER(email) = 'siswa@smk.id';

END $$;

-- ==============================================================================
-- 27. FUNGSI RPC: admin_create_user (PEMBUATAN PENGGUNA SATUAN)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_create_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_phone TEXT DEFAULT NULL,
    p_nis TEXT DEFAULT NULL,
    p_nisn TEXT DEFAULT NULL,
    p_nip TEXT DEFAULT NULL,
    p_class_id UUID DEFAULT NULL,
    p_major_id UUID DEFAULT NULL,
    p_subject_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
    v_class_name TEXT;
    v_major_name TEXT;
    v_subject_id UUID;
BEGIN
    p_email := LOWER(TRIM(p_email));
    p_full_name := TRIM(p_full_name);
    p_role := LOWER(TRIM(p_role));

    IF p_email IS NULL OR p_email = '' OR p_password IS NULL OR p_password = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email dan password tidak boleh kosong');
    END IF;

    IF p_role NOT IN ('admin', 'guru', 'siswa') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Role harus salah satu dari: admin, guru, siswa');
    END IF;

    IF p_class_id IS NOT NULL THEN
        SELECT name INTO v_class_name FROM public.classes WHERE id = p_class_id;
    END IF;

    IF p_major_id IS NOT NULL THEN
        SELECT name INTO v_major_name FROM public.majors WHERE id = p_major_id;
    END IF;

    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = p_email;

    IF v_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = jsonb_build_object(
                'full_name', p_full_name,
                'role', p_role,
                'nis', p_nis,
                'nip', p_nip
            ),
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token,
            email_change_token_new, email_change
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            p_email,
            v_encrypted_pw,
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object(
                'full_name', p_full_name,
                'role', p_role,
                'nis', p_nis,
                'nip', p_nip
            ),
            NOW(), NOW(), '', '', '', ''
        );
    END IF;

    PERFORM public.ensure_auth_identity(v_user_id, p_email);

    DELETE FROM public.profiles WHERE LOWER(email) = p_email AND id <> v_user_id;

    INSERT INTO public.profiles (
        id, email, full_name, role, phone_number,
        nis, nisn, nip, class_name, major_name, status, updated_at
    ) VALUES (
        v_user_id, p_email, p_full_name, p_role, p_phone,
        p_nis, p_nisn, p_nip, v_class_name, v_major_name, 'active', NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
        nis = COALESCE(EXCLUDED.nis, public.profiles.nis),
        nisn = COALESCE(EXCLUDED.nisn, public.profiles.nisn),
        nip = COALESCE(EXCLUDED.nip, public.profiles.nip),
        class_name = COALESCE(EXCLUDED.class_name, public.profiles.class_name),
        major_name = COALESCE(EXCLUDED.major_name, public.profiles.major_name),
        status = 'active',
        updated_at = NOW();

    IF p_role = 'siswa' THEN
        INSERT INTO public.students (
            id, user_id, nis, nisn, full_name, email, phone_number, class_id, major_id, status
        ) VALUES (
            v_user_id, v_user_id, COALESCE(p_nis, ''), p_nisn, p_full_name, p_email, p_phone, p_class_id, p_major_id, 'active'
        )
        ON CONFLICT (email) DO UPDATE SET
            user_id = v_user_id,
            nis = COALESCE(EXCLUDED.nis, public.students.nis),
            nisn = COALESCE(EXCLUDED.nisn, public.students.nisn),
            full_name = EXCLUDED.full_name,
            phone_number = COALESCE(EXCLUDED.phone_number, public.students.phone_number),
            class_id = COALESCE(EXCLUDED.class_id, public.students.class_id),
            major_id = COALESCE(EXCLUDED.major_id, public.students.major_id),
            status = 'active';

        UPDATE public.students SET user_id = v_user_id WHERE (nis = p_nis AND p_nis IS NOT NULL) OR LOWER(email) = p_email;
    END IF;

    IF p_role = 'guru' THEN
        INSERT INTO public.teachers (
            id, user_id, nip, full_name, email, phone_number, status
        ) VALUES (
            v_user_id, v_user_id, COALESCE(p_nip, ''), p_full_name, p_email, p_phone, 'active'
        )
        ON CONFLICT (email) DO UPDATE SET
            user_id = v_user_id,
            nip = COALESCE(EXCLUDED.nip, public.teachers.nip),
            full_name = EXCLUDED.full_name,
            phone_number = COALESCE(EXCLUDED.phone_number, public.teachers.phone_number),
            status = 'active';

        UPDATE public.teachers SET user_id = v_user_id WHERE (nip = p_nip AND p_nip IS NOT NULL) OR LOWER(email) = p_email;

        IF p_subject_ids IS NOT NULL AND array_length(p_subject_ids, 1) > 0 THEN
            FOREACH v_subject_id IN ARRAY p_subject_ids LOOP
                INSERT INTO public.teacher_subjects (teacher_id, subject_id)
                SELECT t.id, v_subject_id
                FROM public.teachers t
                WHERE t.user_id = v_user_id OR LOWER(t.email) = p_email
                ON CONFLICT (teacher_id, subject_id) DO NOTHING;
            END LOOP;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', p_email,
        'role', p_role,
        'message', 'Pengguna ' || p_email || ' berhasil dibuat dan terkonfirmasi.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_user TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 28. FUNGSI RPC: admin_batch_create_users (IMPOR MASAL DARI EXCEL)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_batch_create_users(
    p_users JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_item JSONB;
    v_imported INT := 0;
    v_failed INT := 0;
    v_res JSONB;
    v_role TEXT;
    v_email TEXT;
    v_password TEXT;
    v_full_name TEXT;
    v_phone TEXT;
    v_nis TEXT;
    v_nisn TEXT;
    v_nip TEXT;
    v_class_id UUID;
    v_major_id UUID;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_users) LOOP
        BEGIN
            v_role := COALESCE(v_item->>'role', 'siswa');
            v_email := v_item->>'email';
            v_password := COALESCE(v_item->>'password', CASE WHEN v_role = 'guru' THEN 'Guru123!' WHEN v_role = 'admin' THEN 'Admin123!' ELSE 'Siswa123!' END);
            v_full_name := COALESCE(v_item->>'full_name', 'Pengguna CBT');
            v_phone := v_item->>'phone_number';
            v_nis := v_item->>'nis';
            v_nisn := v_item->>'nisn';
            v_nip := v_item->>'nip';
            v_class_id := (v_item->>'class_id')::uuid;
            v_major_id := (v_item->>'major_id')::uuid;

            v_res := public.admin_create_user(
                p_email => v_email,
                p_password => v_password,
                p_full_name => v_full_name,
                p_role => v_role,
                p_phone => v_phone,
                p_nis => v_nis,
                p_nisn => v_nisn,
                p_nip => v_nip,
                p_class_id => v_class_id,
                p_major_id => v_major_id
            );

            IF (v_res->>'success')::boolean THEN
                v_imported := v_imported + 1;
            ELSE
                v_failed := v_failed + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'imported', v_imported,
        'failed', v_failed,
        'total', jsonb_array_length(p_users)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_batch_create_users TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 29. FUNGSI RPC: admin_reset_user_password (RESET KATA SANDI)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_email TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    p_email := LOWER(TRIM(p_email));

    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = p_email;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pengguna dengan email ' || p_email || ' tidak ditemukan di sistem.');
    END IF;

    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_user_id;

    PERFORM public.ensure_auth_identity(v_user_id, p_email);

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', p_email,
        'message', 'Password untuk ' || p_email || ' berhasil diperbarui.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 30. FUNGSI RPC: sync_unregistered_logins (SINKRONISASI AKUN LAMA OTOMATIS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_unregistered_logins(
    p_default_student_pass TEXT DEFAULT 'Siswa123!',
    p_default_teacher_pass TEXT DEFAULT 'Guru123!',
    p_default_admin_pass TEXT DEFAULT 'Admin123!'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_new_user_id UUID;
    v_students_synced INT := 0;
    v_teachers_synced INT := 0;
    v_profiles_synced INT := 0;
    v_total_fixed INT := 0;
    s RECORD;
    t RECORD;
    p RECORD;
BEGIN
    -- 1. SINKRONKAN SEMUA SISWA
    FOR s IN 
        SELECT s.id, s.email, s.full_name, s.nis, s.nisn, s.class_id, s.major_id, s.phone_number
        FROM public.students s
        WHERE s.email IS NOT NULL AND trim(s.email) <> ''
          AND NOT EXISTS (
              SELECT 1 FROM auth.users u WHERE LOWER(u.email) = LOWER(trim(s.email))
          )
    LOOP
        v_new_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            v_new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            LOWER(trim(s.email)),
            crypt(p_default_student_pass, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', s.full_name, 'role', 'siswa', 'nis', s.nis),
            NOW(), NOW(), '', '', '', ''
        );

        PERFORM public.ensure_auth_identity(v_new_user_id, s.email);

        UPDATE public.students SET user_id = v_new_user_id WHERE id = s.id;

        INSERT INTO public.profiles (
            id, email, full_name, role, nis, nisn, phone_number, status, updated_at
        ) VALUES (
            v_new_user_id, LOWER(trim(s.email)), s.full_name, 'siswa', s.nis, s.nisn, s.phone_number, 'active', NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = 'siswa',
            nis = EXCLUDED.nis,
            nisn = EXCLUDED.nisn,
            status = 'active';

        v_students_synced := v_students_synced + 1;
    END LOOP;

    -- 2. SINKRONKAN SEMUA GURU
    FOR t IN 
        SELECT t.id, t.email, t.full_name, t.nip, t.phone_number
        FROM public.teachers t
        WHERE t.email IS NOT NULL AND trim(t.email) <> ''
          AND NOT EXISTS (
              SELECT 1 FROM auth.users u WHERE LOWER(u.email) = LOWER(trim(t.email))
          )
    LOOP
        v_new_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            v_new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            LOWER(trim(t.email)),
            crypt(p_default_teacher_pass, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', t.full_name, 'role', 'guru', 'nip', t.nip),
            NOW(), NOW(), '', '', '', ''
        );

        PERFORM public.ensure_auth_identity(v_new_user_id, t.email);

        UPDATE public.teachers SET user_id = v_new_user_id WHERE id = t.id;

        INSERT INTO public.profiles (
            id, email, full_name, role, nip, phone_number, status, updated_at
        ) VALUES (
            v_new_user_id, LOWER(trim(t.email)), t.full_name, 'guru', t.nip, t.phone_number, 'active', NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = 'guru',
            nip = EXCLUDED.nip,
            status = 'active';

        v_teachers_synced := v_teachers_synced + 1;
    END LOOP;

    -- 3. PERBAIKI SEMUA USER YANG SUDAH TERDAFTAR DI auth.users
    FOR p IN SELECT id, email FROM auth.users WHERE email IS NOT NULL LOOP
        PERFORM public.ensure_auth_identity(p.id, p.email);
        v_profiles_synced := v_profiles_synced + 1;
    END LOOP;

    v_total_fixed := v_students_synced + v_teachers_synced + v_profiles_synced;

    RETURN jsonb_build_object(
        'success', true,
        'students_synced', v_students_synced,
        'teachers_synced', v_teachers_synced,
        'profiles_synced', v_profiles_synced,
        'total_fixed', v_total_fixed,
        'message', 'Sinkronisasi berhasil! ' || v_total_fixed || ' akun telah terkonfirmasi dan siap login.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_unregistered_logins TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 31. AUTO-REPAIR & SINKRONISASI TERAKHIR (IDEMPOTENT PASS)
-- ==============================================================================
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT id, email FROM auth.users WHERE email IS NOT NULL LOOP
        PERFORM public.ensure_auth_identity(u.id, u.email);

        UPDATE public.students SET user_id = u.id WHERE LOWER(email) = LOWER(u.email) AND (user_id IS NULL OR user_id <> u.id);
        UPDATE public.teachers SET user_id = u.id WHERE LOWER(email) = LOWER(u.email) AND (user_id IS NULL OR user_id <> u.id);

        UPDATE public.profiles p
        SET nis = s.nis, nisn = s.nisn
        FROM public.students s
        WHERE p.id = u.id AND LOWER(s.email) = LOWER(u.email) AND p.nis IS NULL;

        UPDATE public.profiles p
        SET nip = t.nip
        FROM public.teachers t
        WHERE p.id = u.id AND LOWER(t.email) = LOWER(u.email) AND p.nip IS NULL;
    END LOOP;
END $$;

SELECT 'DATABASE & OTENTIKASI CBT TKA SMKN 1 SONGGOM 100% SUKSES DISIAPKAN!' AS status;
