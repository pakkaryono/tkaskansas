-- ==============================================================================
-- DATABASE SCHEMA FINAL LENGKAP & SEED DATA (MINIMAL 3 DATA TERISI)
-- APLIKASI TES KEMAMPUAN AKADEMIK (TKA) SMKN 1 SONGGOM
-- Target Supabase Project: https://mltysivggdshktbsrvtp.supabase.co
--
-- CARA PENGGUNAAN DI SUPABASE:
-- 1. Buka Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Klik menu 'SQL Editor' di bilah kiri
-- 3. Klik tombol '+ New query'
-- 4. Tempel (Paste) seluruh isi skrip ini ke dalam editor
-- 5. Klik tombol 'Run' (atau tekan Ctrl+Enter / Cmd+Enter)
--
-- FITUR SKRIP INI:
-- - Bersifat Idempotent & Self-Healing (Bisa dijalankan berulang kali tanpa error)
-- - Memperbaiki otomatis kolom yang hilang (Fix Error 42703: column status does not exist)
-- - Menyediakan RPC get_student_exam_payload & get_student_exam_questions
-- - Memuat minimal 3 data lengkap pada setiap tabel (Jurusan, Kelas, Mapel, Guru, Siswa, Soal, Ujian, Attempt)
-- - Mengonfigurasi Akun Pengujian di auth.users & profiles dengan password: password123
-- ==============================================================================

-- 1. EKSTENSI POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPE ENUM ROLE
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'guru', 'siswa');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. FUNGSI HELPER KEAMANAN & RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role::text = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'guru' OR role::text = 'guru')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. TABEL PROFILES (Pengguna Aplikasi)
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
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS nip TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS nisn TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS major_name TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 5. TABEL MAJORS (Jurusan / Program Keahlian)
CREATE TABLE IF NOT EXISTS public.majors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-Repair Kolom Majors
ALTER TABLE IF EXISTS public.majors ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE IF EXISTS public.majors ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_majors_status ON public.majors(status);

-- 6. TABEL CLASSES (Rombel / Kelas)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    grade TEXT NOT NULL CHECK (grade IN ('X', 'XI', 'XII')),
    major_id UUID NOT NULL REFERENCES public.majors(id) ON DELETE RESTRICT,
    academic_year TEXT NOT NULL DEFAULT '2026/2027',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-Repair Kolom Classes
ALTER TABLE IF EXISTS public.classes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE IF EXISTS public.classes ADD COLUMN IF NOT EXISTS academic_year TEXT NOT NULL DEFAULT '2026/2027';

CREATE INDEX IF NOT EXISTS idx_classes_status ON public.classes(status);

-- 7. TABEL SUBJECTS (Mata Pelajaran)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-Repair Kolom Subjects
ALTER TABLE IF EXISTS public.subjects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE IF EXISTS public.subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS public.subjects ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Umum';
ALTER TABLE IF EXISTS public.subjects ALTER COLUMN category DROP NOT NULL;
ALTER TABLE IF EXISTS public.subjects ALTER COLUMN category SET DEFAULT 'Umum';

CREATE INDEX IF NOT EXISTS idx_subjects_status ON public.subjects(status);

-- 8. TABEL TEACHERS (Guru)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nip TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-Repair Kolom Teachers
ALTER TABLE IF EXISTS public.teachers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE IF EXISTS public.teachers ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE INDEX IF NOT EXISTS idx_teachers_status ON public.teachers(status);

-- 9. TABEL TEACHER_SUBJECTS (Relasi Guru Pengampu Mapel)
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(teacher_id, subject_id)
);

-- 10. TABEL STUDENTS (Peserta Didik)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nis TEXT UNIQUE NOT NULL,
    nisn TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    major_id UUID NOT NULL REFERENCES public.majors(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-Repair Kolom Students
ALTER TABLE IF EXISTS public.students ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE IF EXISTS public.students ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE IF EXISTS public.students ADD COLUMN IF NOT EXISTS major_id UUID;

CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- 11. TABEL QUESTIONS (Bank Soal)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    grade TEXT NOT NULL CHECK (grade IN ('X', 'XI', 'XII')),
    major_id UUID REFERENCES public.majors(id) ON DELETE SET NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'complex_choice', 'essay', 'matching')),
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (points > 0),
    question_text TEXT NOT NULL,
    image_url TEXT,
    explanation TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    scoring_method TEXT NOT NULL DEFAULT 'exact_match' CHECK (scoring_method IN ('exact_match', 'partial_credit', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-Repair Kolom Questions
ALTER TABLE IF EXISTS public.questions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE IF EXISTS public.questions ADD COLUMN IF NOT EXISTS scoring_method TEXT NOT NULL DEFAULT 'exact_match';
ALTER TABLE IF EXISTS public.questions ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE IF EXISTS public.questions ADD COLUMN IF NOT EXISTS points NUMERIC(5,2) NOT NULL DEFAULT 10.00;
ALTER TABLE IF EXISTS public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;

CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject_id);

-- 12. TABEL QUESTION_OPTIONS (Pilihan Ganda)
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_key TEXT NOT NULL,
    option_text TEXT NOT NULL,
    image_url TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_num INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(question_id, option_key)
);

-- 13. TABEL QUESTION_ANSWERS (Rubrik Esai)
CREATE TABLE IF NOT EXISTS public.question_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID UNIQUE NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    reference_answer TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    sample_rubric TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. TABEL MATCHING_PAIRS (Pasangan Menjodohkan)
CREATE TABLE IF NOT EXISTS public.matching_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    left_item TEXT NOT NULL DEFAULT '',
    right_item TEXT NOT NULL DEFAULT '',
    correct_match_key TEXT NOT NULL DEFAULT '',
    order_num INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.matching_pairs ADD COLUMN IF NOT EXISTS left_item TEXT NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS public.matching_pairs ADD COLUMN IF NOT EXISTS right_item TEXT NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS public.matching_pairs ADD COLUMN IF NOT EXISTS correct_match_key TEXT NOT NULL DEFAULT '';

-- 15. TABEL EXAMS (Jadwal Ujian)
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    grade TEXT NOT NULL CHECK (grade IN ('X', 'XI', 'XII')),
    major_id UUID REFERENCES public.majors(id) ON DELETE SET NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    total_questions INT NOT NULL DEFAULT 0,
    instructions TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'open', 'closed', 'archived')),
    randomize_questions BOOLEAN NOT NULL DEFAULT true,
    randomize_options BOOLEAN NOT NULL DEFAULT true,
    pass_score NUMERIC(5,2) NOT NULL DEFAULT 75.00,
    question_selection_method TEXT NOT NULL DEFAULT 'random' CHECK (question_selection_method IN ('random', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-Repair Kolom Exams
ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS pass_score NUMERIC(5,2) NOT NULL DEFAULT 75.00;
ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS randomize_options BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS question_selection_method TEXT NOT NULL DEFAULT 'random';

CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);

-- 16. TABEL EXAM_CLASSES (Kelas Peserta Ujian)
CREATE TABLE IF NOT EXISTS public.exam_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, class_id)
);

-- 17. TABEL EXAM_QUESTIONS (Snapshot Soal Ujian)
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    order_num INT NOT NULL DEFAULT 1,
    points NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, question_id)
);

-- 18. TABEL EXAM_ATTEMPTS (Sesi Ujian Siswa)
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded', 'expired')),
    score NUMERIC(5,2),
    total_points NUMERIC(6,2) DEFAULT 0,
    maximum_points NUMERIC(6,2) DEFAULT 100,
    has_pending_essay BOOLEAN DEFAULT false,
    question_order JSONB DEFAULT '[]'::jsonb,
    option_order JSONB DEFAULT '{}'::jsonb,
    doubtful_questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);

-- Auto-Repair Kolom Exam Attempts
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress';
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS total_points NUMERIC(6,2) DEFAULT 0;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS maximum_points NUMERIC(6,2) DEFAULT 100;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS has_pending_essay BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS question_order JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS option_order JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.exam_attempts ADD COLUMN IF NOT EXISTS doubtful_questions JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON public.exam_attempts(status);

-- 19. TABEL STUDENT_ANSWERS (Lembar Jawaban Siswa)
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    student_answer JSONB,
    answer_data JSONB,
    is_doubtful BOOLEAN DEFAULT false,
    is_correct BOOLEAN,
    points_earned NUMERIC(5,2) DEFAULT 0,
    feedback TEXT,
    teacher_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- Auto-Repair Kolom Student Answers
ALTER TABLE IF EXISTS public.student_answers ADD COLUMN IF NOT EXISTS student_answer JSONB;
ALTER TABLE IF EXISTS public.student_answers ADD COLUMN IF NOT EXISTS answer_data JSONB;
ALTER TABLE IF EXISTS public.student_answers ADD COLUMN IF NOT EXISTS is_doubtful BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.student_answers ADD COLUMN IF NOT EXISTS points_earned NUMERIC(5,2) DEFAULT 0;
ALTER TABLE IF EXISTS public.student_answers ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE IF EXISTS public.student_answers ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;

-- 20. TABEL AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_email TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 21. FUNCTION & RPC: GET_STUDENT_EXAM_PAYLOAD (Sesuai Frontend TKA)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_student_exam_payload(p_exam_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'exam', (
            SELECT row_to_json(e) FROM (
                SELECT id, title, description, subject_id, grade, duration_minutes,
                       start_at, end_at, instructions, randomize_questions, randomize_options, total_questions
                FROM public.exams WHERE id = p_exam_id
            ) e
        ),
        'questions', (
            SELECT COALESCE(jsonb_agg(q_row), '[]'::jsonb)
            FROM (
                SELECT 
                    q.id,
                    q.code,
                    q.question_type,
                    q.question_text,
                    q.image_url,
                    q.difficulty,
                    eq.points,
                    eq.order_num,
                    (
                        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                            'id', qo.id,
                            'option_key', qo.option_key,
                            'option_text', qo.option_text,
                            'image_url', qo.image_url,
                            'order_num', qo.order_num
                        ) ORDER BY qo.order_num), '[]'::jsonb)
                        FROM public.question_options qo
                        WHERE qo.question_id = q.id
                    ) AS options,
                    (
                        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                            'id', mp.id,
                            'left_item', mp.left_item,
                            'right_item', mp.right_item,
                            'order_num', mp.order_num
                        ) ORDER BY mp.order_num), '[]'::jsonb)
                        FROM public.matching_pairs mp
                        WHERE mp.question_id = q.id
                    ) AS matching_pairs
                FROM public.exam_questions eq
                JOIN public.questions q ON q.id = eq.question_id
                WHERE eq.exam_id = p_exam_id
                ORDER BY eq.order_num
            ) q_row
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alias untuk kompatibilitas
CREATE OR REPLACE FUNCTION public.get_student_exam_questions(p_exam_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN public.get_student_exam_payload(p_exam_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 22. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "User update own profile" ON public.profiles;
CREATE POLICY "User update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admin manage profiles" ON public.profiles;
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL USING (public.is_admin() OR auth.role() = 'service_role');

ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read majors" ON public.majors;
CREATE POLICY "Read majors" ON public.majors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage majors" ON public.majors;
CREATE POLICY "Admin manage majors" ON public.majors FOR ALL USING (public.is_admin() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read classes" ON public.classes;
CREATE POLICY "Read classes" ON public.classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage classes" ON public.classes;
CREATE POLICY "Admin manage classes" ON public.classes FOR ALL USING (public.is_admin() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read subjects" ON public.subjects;
CREATE POLICY "Read subjects" ON public.subjects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage subjects" ON public.subjects;
CREATE POLICY "Admin manage subjects" ON public.subjects FOR ALL USING (public.is_admin() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read teachers" ON public.teachers;
CREATE POLICY "Read teachers" ON public.teachers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage teachers" ON public.teachers;
CREATE POLICY "Admin manage teachers" ON public.teachers FOR ALL USING (public.is_admin() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Read teacher_subjects" ON public.teacher_subjects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Admin manage teacher_subjects" ON public.teacher_subjects FOR ALL USING (public.is_admin() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read students" ON public.students;
CREATE POLICY "Read students" ON public.students FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage students" ON public.students;
CREATE POLICY "Admin manage students" ON public.students FOR ALL USING (public.is_admin() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read questions" ON public.questions;
CREATE POLICY "Read questions" ON public.questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage questions" ON public.questions;
CREATE POLICY "Manage questions" ON public.questions FOR ALL USING (public.is_admin() OR public.is_teacher() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read question_options" ON public.question_options;
CREATE POLICY "Read question_options" ON public.question_options FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage question_options" ON public.question_options;
CREATE POLICY "Manage question_options" ON public.question_options FOR ALL USING (public.is_admin() OR public.is_teacher() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read question_answers" ON public.question_answers;
CREATE POLICY "Read question_answers" ON public.question_answers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage question_answers" ON public.question_answers;
CREATE POLICY "Manage question_answers" ON public.question_answers FOR ALL USING (public.is_admin() OR public.is_teacher() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.matching_pairs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read matching_pairs" ON public.matching_pairs;
CREATE POLICY "Read matching_pairs" ON public.matching_pairs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage matching_pairs" ON public.matching_pairs;
CREATE POLICY "Manage matching_pairs" ON public.matching_pairs FOR ALL USING (public.is_admin() OR public.is_teacher() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read exams" ON public.exams;
CREATE POLICY "Read exams" ON public.exams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage exams" ON public.exams;
CREATE POLICY "Manage exams" ON public.exams FOR ALL USING (public.is_admin() OR public.is_teacher() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.exam_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read exam_classes" ON public.exam_classes;
CREATE POLICY "Read exam_classes" ON public.exam_classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage exam_classes" ON public.exam_classes;
CREATE POLICY "Manage exam_classes" ON public.exam_classes FOR ALL USING (public.is_admin() OR public.is_teacher() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read exam_questions" ON public.exam_questions;
CREATE POLICY "Read exam_questions" ON public.exam_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage exam_questions" ON public.exam_questions;
CREATE POLICY "Manage exam_questions" ON public.exam_questions FOR ALL USING (public.is_admin() OR public.is_teacher() OR auth.role() = 'service_role' OR auth.role() = 'anon');

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access exam_attempts" ON public.exam_attempts;
CREATE POLICY "Access exam_attempts" ON public.exam_attempts FOR ALL USING (
    auth.role() = 'anon' OR
    auth.role() = 'service_role' OR
    auth.uid() = student_id OR
    public.is_admin() OR
    public.is_teacher()
);

ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access student_answers" ON public.student_answers;
CREATE POLICY "Access student_answers" ON public.student_answers FOR ALL USING (
    auth.role() = 'anon' OR
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = attempt_id AND ea.student_id = auth.uid()) OR
    public.is_admin() OR
    public.is_teacher()
);

-- ==============================================================================
-- 23. STORAGE BUCKET: question-images
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Question Images" ON storage.objects;
CREATE POLICY "Public Read Question Images" ON storage.objects FOR SELECT USING (bucket_id = 'question-images');

DROP POLICY IF EXISTS "Public Upload Question Images" ON storage.objects;
CREATE POLICY "Public Upload Question Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'question-images');

-- ==============================================================================
-- 24. SEED DATA LENGKAP: MINIMAL 3 DATA TERISI PER ENTITAS
-- ==============================================================================

-- 24.1 SEED AUTH USERS (Password untuk semua: password123)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        'd1111111-1111-1111-1111-111111111111',
        'authenticated', 'authenticated', 'admin@smk.id',
        crypt('password123', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"M. Karyono, S.Kom. (Admin)","role":"admin"}',
        NOW(), NOW(), '', '', '', ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'd2222222-2222-2222-2222-222222222222',
        'authenticated', 'authenticated', 'guru@smk.id',
        crypt('password123', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Siti Aminah, S.Kom., Gr.","role":"guru"}',
        NOW(), NOW(), '', '', '', ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'e1111111-1111-1111-1111-111111111111',
        'authenticated', 'authenticated', 'siswa@smk.id',
        crypt('password123', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Muhammad Rizky Ramadhan","role":"siswa"}',
        NOW(), NOW(), '', '', '', ''
    )
ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

-- 24.2 SEED PROFILES
INSERT INTO public.profiles (
    id, email, full_name, role, phone_number, nip, nis, nisn, class_name, major_name, status
)
VALUES
    (
        'd1111111-1111-1111-1111-111111111111',
        'admin@smk.id',
        'M. Karyono, S.Kom. (Admin)',
        'admin',
        '0812-3456-7890',
        NULL, NULL, NULL, NULL, NULL,
        'active'
    ),
    (
        'd2222222-2222-2222-2222-222222222222',
        'guru@smk.id',
        'Siti Aminah, S.Kom., Gr.',
        'guru',
        '0857-1122-3344',
        '198803152014022003',
        NULL, NULL, NULL, NULL,
        'active'
    ),
    (
        'e1111111-1111-1111-1111-111111111111',
        'siswa@smk.id',
        'Muhammad Rizky Ramadhan',
        'siswa',
        '0896-9988-7766',
        NULL,
        '20241088',
        '0078129931',
        'XI TJKT 1',
        'Teknik Jaringan Komputer dan Telekomunikasi',
        'active'
    )
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    status = EXCLUDED.status;

-- 24.3 SEED MAJORS (3 JURUSAN)
INSERT INTO public.majors (id, code, name, description, status)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'TJKT', 'Teknik Jaringan Komputer dan Telekomunikasi', 'Konsentrasi keahlian infrastruktur jaringan, server, fiber optic dan telekomunikasi.', 'active'),
    ('a2222222-2222-2222-2222-222222222222', 'TKRO', 'Teknik Kendaraan Ringan Otomotif', 'Konsentrasi keahlian mesin otomotif modern, kelistrikan kendaraan, dan chasis.', 'active'),
    ('a3333333-3333-3333-3333-333333333333', 'AKL', 'Akuntansi dan Keuangan Lembaga', 'Konsentrasi keahlian pembukuan digital, perpajakan, dan perbankan syariah/konvensional.', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 24.4 SEED CLASSES (3 KELAS)
INSERT INTO public.classes (id, name, grade, major_id, academic_year, status)
VALUES
    ('b1111111-1111-1111-1111-111111111111', 'X TJKT 1', 'X', 'a1111111-1111-1111-1111-111111111111', '2026/2027', 'active'),
    ('b2222222-2222-2222-2222-222222222222', 'XI TJKT 1', 'XI', 'a1111111-1111-1111-1111-111111111111', '2026/2027', 'active'),
    ('b3333333-3333-3333-3333-333333333333', 'XII TKRO 1', 'XII', 'a2222222-2222-2222-2222-222222222222', '2026/2027', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 24.5 SEED SUBJECTS (3 MAPEL)
INSERT INTO public.subjects (id, code, name, description, category, status)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'AIJ', 'Administrasi Infrastruktur Jaringan', 'Routing statik & dinamik, VLAN, firewall, NAT dan monitoring traffic jaringan.', 'Kejuruan', 'active'),
    ('c2222222-2222-2222-2222-222222222222', 'MTK', 'Matematika Terapan Kejuruan', 'Aljabar, trigonometri, statistika data dan probabilitas teknik.', 'Umum', 'active'),
    ('c3333333-3333-3333-3333-333333333333', 'BIND', 'Bahasa Indonesia Kejuruan', 'Penyusunan laporan teknis ilmiah, proposal kerja industri, dan tata bahasa formal.', 'Umum', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, category = EXCLUDED.category;

-- 24.6 SEED TEACHERS (3 GURU)
INSERT INTO public.teachers (id, nip, full_name, email, phone_number, status)
VALUES
    ('d2222222-2222-2222-2222-222222222222', '198803152014022003', 'Siti Aminah, S.Kom., Gr.', 'guru@smk.id', '0857-1122-3344', 'active'),
    ('d3333333-3333-3333-3333-333333333333', '198405102010011015', 'Budi Santoso, S.Pd.', 'budi.santoso@smk.id', '0813-2233-4455', 'active'),
    ('d4444444-4444-4444-4444-444444444444', '199208222019032007', 'Dewi Lestari, M.Pd.', 'dewi.lestari@smk.id', '0819-3344-5566', 'active')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, status = EXCLUDED.status;

-- 24.7 SEED TEACHER_SUBJECTS (GURU PENGAMPU)
INSERT INTO public.teacher_subjects (id, teacher_id, subject_id)
VALUES
    ('d5555555-5555-5555-5555-555555555551', 'd2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111'),
    ('d5555555-5555-5555-5555-555555555552', 'd3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222'),
    ('d5555555-5555-5555-5555-555555555553', 'd4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333')
ON CONFLICT (teacher_id, subject_id) DO NOTHING;

-- 24.8 SEED STUDENTS (3 SISWA)
INSERT INTO public.students (id, nis, nisn, full_name, email, phone_number, class_id, major_id, status)
VALUES
    (
        'e1111111-1111-1111-1111-111111111111',
        '20241088', '0078129931',
        'Muhammad Rizky Ramadhan',
        'siswa@smk.id',
        '0896-9988-7766',
        'b2222222-2222-2222-2222-222222222222', -- XI TJKT 1
        'a1111111-1111-1111-1111-111111111111', -- TJKT
        'active'
    ),
    (
        'e2222222-2222-2222-2222-222222222222',
        '20241089', '0078129932',
        'Fadhil Ahmad Pratama',
        'fadhil.ahmad@siswa.smk.id',
        '0895-1234-5678',
        'b2222222-2222-2222-2222-222222222222', -- XI TJKT 1
        'a1111111-1111-1111-1111-111111111111', -- TJKT
        'active'
    ),
    (
        'e3333333-3333-3333-3333-333333333333',
        '20241090', '0078129933',
        'Anisa Rahmawati',
        'anisa.rahma@siswa.smk.id',
        '0878-8765-4321',
        'b1111111-1111-1111-1111-111111111111', -- X TJKT 1
        'a1111111-1111-1111-1111-111111111111', -- TJKT
        'active'
    )
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, status = EXCLUDED.status;

-- 24.9 SEED QUESTIONS (4 JENIS SOAL: PILGAN, PILGAN KOMPLEKS, MENJODOHKAN, ESAI)
INSERT INTO public.questions (
    id, code, subject_id, teacher_id, grade, major_id,
    question_type, difficulty, points, question_text, explanation, status, scoring_method
)
VALUES
    (
        'f1111111-1111-1111-1111-111111111111',
        'AIJ-XI-001',
        'c1111111-1111-1111-1111-111111111111',
        'd1111111-1111-1111-1111-111111111111',
        'XI',
        'a1111111-1111-1111-1111-111111111111',
        'single_choice',
        'medium',
        25.00,
        'Protokol jaringan yang bertugas menerjemahkan alamat IP privat menjadi alamat IP publik agar perangkat dapat terhubung ke internet adalah...',
        'Network Address Translation (NAT) berfungsi memetakan alamat IP privat ke satu atau lebih alamat IP publik.',
        'active',
        'exact_match'
    ),
    (
        'f2222222-2222-2222-2222-222222222222',
        'AIJ-XI-002',
        'c1111111-1111-1111-1111-111111111111',
        'd1111111-1111-1111-1111-111111111111',
        'XI',
        'a1111111-1111-1111-1111-111111111111',
        'complex_choice',
        'hard',
        25.00,
        'Manakah di antara pilihan berikut yang merupakan keuntungan utama implementasi Virtual LAN (VLAN) pada switch enterprise? (Pilih semua yang benar)',
        'VLAN mengisolasi broadcast domain untuk keamanan dan efisiensi traffic bandwidth jaringan.',
        'active',
        'exact_match'
    ),
    (
        'f3333333-3333-3333-3333-333333333333',
        'AIJ-XI-003',
        'c1111111-1111-1111-1111-111111111111',
        'd1111111-1111-1111-1111-111111111111',
        'XI',
        'a1111111-1111-1111-1111-111111111111',
        'matching',
        'medium',
        25.00,
        'Jodohkanlah nomor port standar berikut dengan protokol jaringan yang sesuai:',
        'Port 80: HTTP, Port 443: HTTPS, Port 22: SSH, Port 53: DNS.',
        'active',
        'exact_match'
    ),
    (
        'f4444444-4444-4444-4444-444444444444',
        'AIJ-XI-004',
        'c1111111-1111-1111-1111-111111111111',
        'd1111111-1111-1111-1111-111111111111',
        'XI',
        'a1111111-1111-1111-1111-111111111111',
        'essay',
        'hard',
        25.00,
        'Jelaskan perbedaan mendasar antara Dynamic Routing (misal: OSPF) dengan Static Routing dalam hal skalabilitas dan redundansi jalur link!',
        'Rubrik: Konsep dasar (30%), Skalabilitas (35%), Penanganan redundansi failover otomatis (35%).',
        'active',
        'manual'
    )
ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, status = EXCLUDED.status;

-- 24.10 SEED QUESTION_OPTIONS
INSERT INTO public.question_options (id, question_id, option_key, option_text, is_correct, order_num)
VALUES
    ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f1111111-1111-1111-1111-111111111111', 'A', 'DHCP (Dynamic Host Configuration Protocol)', false, 1),
    ('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f1111111-1111-1111-1111-111111111111', 'B', 'NAT (Network Address Translation)', true, 2),
    ('33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f1111111-1111-1111-1111-111111111111', 'C', 'DNS (Domain Name System)', false, 3),
    ('44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f1111111-1111-1111-1111-111111111111', 'D', 'SNMP (Simple Network Management Protocol)', false, 4),
    ('55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f1111111-1111-1111-1111-111111111111', 'E', 'ICMP (Internet Control Message Protocol)', false, 5),
    ('66666666-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f2222222-2222-2222-2222-222222222222', 'A', 'Membatasi ukuran broadcast domain', true, 1),
    ('77777777-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f2222222-2222-2222-2222-222222222222', 'B', 'Meningkatkan keamanan segmentasi antar divisi', true, 2),
    ('88888888-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f2222222-2222-2222-2222-222222222222', 'C', 'Menghilangkan kebutuhan kabel fisik secara menyeluruh', false, 3),
    ('99999999-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f2222222-2222-2222-2222-222222222222', 'D', 'Fleksibilitas manajemen penempatan perangkat tanpa batas fisik', true, 4)
ON CONFLICT (question_id, option_key) DO UPDATE SET option_text = EXCLUDED.option_text, is_correct = EXCLUDED.is_correct;

-- 24.11 SEED QUESTION_ANSWERS (ESAI)
INSERT INTO public.question_answers (id, question_id, reference_answer, keywords, sample_rubric)
VALUES
    (
        'aaaa1111-1111-1111-1111-111111111111',
        'f4444444-4444-4444-4444-444444444444',
        'Static routing memerlukan konfigurasi tabel rute manual di setiap router, kurang skalabel untuk jaringan besar, dan tidak memiliki deteksi failover otomatis tanpa skrip. Sedangkan Dynamic routing (OSPF) secara otomatis bertukar informasi topologi melalui Link-State Advertisements (LSA), sangat skalabel, dan mampu mengalihkan paket ke jalur cadangan seketika saat jalur utama terputus.',
        ARRAY['static routing', 'dynamic routing', 'ospf', 'skalabilitas', 'failover', 'lsa', 'otomatis'],
        'Poin 25: Menjelaskan perbandingan kedua routing dengan akurat beserta implikasi skala jaringan. Poin 15: Menjelaskan konsep namun kurang detail pada aspek failover.'
    )
ON CONFLICT (question_id) DO UPDATE SET reference_answer = EXCLUDED.reference_answer;

-- 24.12 SEED MATCHING_PAIRS (MENJODOHKAN)
INSERT INTO public.matching_pairs (id, question_id, left_item, right_item, correct_match_key, order_num)
VALUES
    ('m1111111-1111-1111-1111-111111111111', 'f3333333-3333-3333-3333-333333333333', 'Port 80', 'HTTP', 'HTTP', 1),
    ('m2222222-2222-2222-2222-222222222222', 'f3333333-3333-3333-3333-333333333333', 'Port 443', 'HTTPS', 'HTTPS', 2),
    ('m3333333-3333-3333-3333-333333333333', 'f3333333-3333-3333-3333-333333333333', 'Port 22', 'SSH', 'SSH', 3),
    ('m4444444-4444-4444-4444-444444444444', 'f3333333-3333-3333-3333-333333333333', 'Port 53', 'DNS', 'DNS', 4)
ON CONFLICT (id) DO UPDATE SET left_item = EXCLUDED.left_item, right_item = EXCLUDED.right_item;

-- 24.13 SEED EXAMS (3 UJIAN TKA)
INSERT INTO public.exams (
    id, title, description, subject_id, teacher_id, grade, major_id,
    start_at, end_at, duration_minutes, total_questions, instructions, status,
    randomize_questions, randomize_options, pass_score, question_selection_method
)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'Asesmen Sumatif Tengah Semester AIJ XI TJKT',
        'Ujian Kemampuan Akademik Kejuruan Materi VLAN, Routing Statik & NAT untuk kelas XI.',
        'c1111111-1111-1111-1111-111111111111',
        'd1111111-1111-1111-1111-111111111111',
        'XI',
        'a1111111-1111-1111-1111-111111111111',
        NOW() - INTERVAL '1 hour',
        NOW() + INTERVAL '7 days',
        90,
        4,
        'Kerjakan soal secara mandiri dan jujur. Dilarang membuka tab peramban lain selama ujian berlangsung.',
        'open',
        true, true, 75.00, 'random'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Simulasi TKA Matematika Terapan Semester Genap',
        'Latihan simulasi kesiapan ujian sekolah terstandar nasional untuk kelas XI dan XII.',
        'c2222222-2222-2222-2222-222222222222',
        'd1111111-1111-1111-1111-111111111111',
        'XI',
        'a1111111-1111-1111-1111-111111111111',
        NOW() + INTERVAL '1 day',
        NOW() + INTERVAL '10 days',
        120,
        50,
        'Siapkan kertas cakar dan alat tulis. Kalkulator tidak diperkenankan.',
        'scheduled',
        true, true, 70.00, 'random'
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'Uji Kompetensi Awal Bahasa Indonesia Kejuruan',
        'Evaluasi literasi laporan kerja lapangan dan korespondensi industri.',
        'c3333333-3333-3333-3333-333333333333',
        'd1111111-1111-1111-1111-111111111111',
        'X',
        'a1111111-1111-1111-1111-111111111111',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '1 day',
        60,
        25,
        'Ujian telah selesai dilaksanakan.',
        'closed',
        true, true, 75.00, 'random'
    )
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

-- 24.14 SEED EXAM_CLASSES
INSERT INTO public.exam_classes (id, exam_id, class_id)
VALUES
    ('c1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222'),
    ('c2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222'),
    ('c3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111')
ON CONFLICT (exam_id, class_id) DO NOTHING;

-- 24.15 SEED EXAM_QUESTIONS
INSERT INTO public.exam_questions (id, exam_id, question_id, order_num, points)
VALUES
    ('eq111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 1, 25.00),
    ('eq222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222', 2, 25.00),
    ('eq333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'f3333333-3333-3333-3333-333333333333', 3, 25.00),
    ('eq444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'f4444444-4444-4444-4444-444444444444', 4, 25.00)
ON CONFLICT (exam_id, question_id) DO UPDATE SET points = EXCLUDED.points;

-- 24.16 SEED EXAM_ATTEMPTS (SESI PENGERJAAN SISWA)
INSERT INTO public.exam_attempts (
    id, exam_id, student_id, started_at, deadline_at, submitted_at,
    status, score, total_points, maximum_points, has_pending_essay,
    question_order, option_order, doubtful_questions
)
VALUES
    (
        'att11111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        'e1111111-1111-1111-1111-111111111111',
        NOW() - INTERVAL '30 minutes',
        NOW() + INTERVAL '60 minutes',
        NOW() - INTERVAL '5 minutes',
        'graded',
        95.00,
        95.00,
        100.00,
        false,
        '["f1111111-1111-1111-1111-111111111111", "f2222222-2222-2222-2222-222222222222", "f3333333-3333-3333-3333-333333333333", "f4444444-4444-4444-4444-444444444444"]'::jsonb,
        '{"f1111111-1111-1111-1111-111111111111":["A","B","C","D","E"]}'::jsonb,
        '[]'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, score = EXCLUDED.score;

-- 24.17 SEED STUDENT_ANSWERS
INSERT INTO public.student_answers (
    id, attempt_id, question_id, student_answer, is_doubtful, is_correct, points_earned, feedback
)
VALUES
    (
        'ans11111-1111-1111-1111-111111111111',
        'att11111-1111-1111-1111-111111111111',
        'f1111111-1111-1111-1111-111111111111',
        '{"selected_key":"B"}'::jsonb,
        false, true, 25.00, 'Jawaban tepat: NAT bertugas menerjemahkan IP private ke public.'
    ),
    (
        'ans22222-2222-2222-2222-222222222222',
        'att11111-1111-1111-1111-111111111111',
        'f2222222-2222-2222-2222-222222222222',
        '{"selected_keys":["A","B","D"]}'::jsonb,
        false, true, 25.00, 'Kombinasi jawaban sempurna.'
    ),
    (
        'ans33333-3333-3333-3333-333333333333',
        'att11111-1111-1111-1111-111111111111',
        'f3333333-3333-3333-3333-333333333333',
        '{"matches":{"Port 80":"HTTP","Port 443":"HTTPS","Port 22":"SSH","Port 53":"DNS"}}'::jsonb,
        false, true, 25.00, 'Semua pasangan port terpasang benar.'
    ),
    (
        'ans44444-4444-4444-4444-444444444444',
        'att11111-1111-1111-1111-111111111111',
        'f4444444-4444-4444-4444-444444444444',
        '{"text":"Static routing dikonfigurasi manual per router sehingga rentan human-error dan kurang adaptif saat skala jaringan membesar. Sebaliknya dynamic routing menggunakan protokol seperti OSPF yang saling menyebarkan link-state otomatis sehingga jika suatu link putus, paket dialihkan otomatis ke jalur cadangan."}'::jsonb,
        false, true, 20.00, 'Penjelasan sangat baik dan komprehensif.'
    )
ON CONFLICT (attempt_id, question_id) DO UPDATE SET points_earned = EXCLUDED.points_earned;

-- Selesai! Pesan notifikasi database siap
SELECT 'DATABASE SUPABASE TKA SMKN 1 SONGGOM BERHASIL DIPERBAIKI DAN TERISI SEED DATA LENGKAP!' AS status_migrasi;
