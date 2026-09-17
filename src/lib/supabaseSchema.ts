// File ini berisi script SQL lengkap untuk inisialisasi database Supabase
// Guru/Admin/Siswa dapat membaca dan menyalin script ini langsung ke SQL Editor di Supabase.

export const SUPABASE_PHASE_1_SQL = `-- ==============================================================================
-- SKRIP SQL FASE 1: TES KEMAMPUAN AKADEMIK (TKA) SMKN 1 SONGGOM
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPE ENUM ROLE USER
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'guru', 'siswa');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL PROFILES (Terkoneksi langsung dengan auth.users Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'siswa',
    phone_number TEXT,
    nip TEXT,                -- Khusus Guru
    nis TEXT,                -- Khusus Siswa
    nisn TEXT,               -- Khusus Siswa
    class_name TEXT,         -- Misal: "X TJKT 1"
    major_name TEXT,         -- Misal: "Teknik Jaringan Komputer & Telekomunikasi"
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pencarian cepat
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_nis ON public.profiles(nis);
CREATE INDEX IF NOT EXISTS idx_profiles_nip ON public.profiles(nip);

-- 4. ROW LEVEL SECURITY (RLS) UNTUK TABEL PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function: Mengecek apakah user adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Mengecek apakah user adalah guru
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'guru'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kebijakan RLS Profiles
CREATE POLICY "User dapat membaca profil sendiri" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admin dapat membaca semua profil" 
ON public.profiles FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admin dapat mengelola semua profil" 
ON public.profiles FOR ALL 
USING (public.is_admin());

CREATE POLICY "Guru dapat melihat data siswa" 
ON public.profiles FOR SELECT 
USING (public.is_teacher() AND role = 'siswa');

CREATE POLICY "User dapat update profil sendiri" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. TRIGGER OTOMATIS SAAT USER MENDAFTAR/DIBUAT DI AUTH.USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'siswa'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. TABEL AUDIT LOG (Pencatatan aktivitas)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin dapat melihat semua audit log" 
ON public.audit_logs FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Semua user terotentikasi dapat membuat log" 
ON public.audit_logs FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
`;

export const SUPABASE_PHASE_2_SQL = `-- ==============================================================================
-- SKRIP SQL FASE 2: MASTER DATA TKA SMKN 1 SONGGOM
-- Meliputi: Jurusan, Kelas, Mata Pelajaran, Guru, Relasi Guru-Mapel, dan Siswa
-- Jalankan skrip ini setelah FASE 1 selesai dieksekusi di SQL Editor Supabase
-- ==============================================================================

-- 1. TABEL JURUSAN (MAJORS)
CREATE TABLE IF NOT EXISTS public.majors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_majors_code ON public.majors(code);
CREATE INDEX IF NOT EXISTS idx_majors_status ON public.majors(status);

ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua user terotentikasi dapat melihat jurusan"
ON public.majors FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Hanya Admin yang dapat mengelola jurusan"
ON public.majors FOR ALL
USING (public.is_admin());

-- 2. TABEL KELAS (CLASSES)
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

CREATE INDEX IF NOT EXISTS idx_classes_grade ON public.classes(grade);
CREATE INDEX IF NOT EXISTS idx_classes_major ON public.classes(major_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON public.classes(status);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua user terotentikasi dapat melihat kelas"
ON public.classes FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Hanya Admin yang dapat mengelola kelas"
ON public.classes FOR ALL
USING (public.is_admin());

-- 3. TABEL MATA PELAJARAN (SUBJECTS)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_status ON public.subjects(status);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua user terotentikasi dapat melihat mata pelajaran"
ON public.subjects FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Hanya Admin yang dapat mengelola mata pelajaran"
ON public.subjects FOR ALL
USING (public.is_admin());

-- 4. TABEL GURU (TEACHERS)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    nip TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teachers_nip ON public.teachers(nip);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON public.teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON public.teachers(status);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua user terotentikasi dapat melihat guru"
ON public.teachers FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Hanya Admin yang dapat mengelola guru"
ON public.teachers FOR ALL
USING (public.is_admin());

-- 5. TABEL RELASI GURU DENGAN MATA PELAJARAN (TEACHER_SUBJECTS)
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON public.teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON public.teacher_subjects(subject_id);

ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua user terotentikasi dapat melihat pengampu mapel"
ON public.teacher_subjects FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Hanya Admin yang dapat mengelola pengampu mapel"
ON public.teacher_subjects FOR ALL
USING (public.is_admin());

-- 6. TABEL SISWA (STUDENTS)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_students_nis ON public.students(nis);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_major ON public.students(major_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin dan Guru dapat melihat semua data siswa"
ON public.students FOR SELECT
USING (public.is_admin() OR public.is_teacher() OR auth.uid() = id);

CREATE POLICY "Hanya Admin yang dapat mengelola data siswa"
ON public.students FOR ALL
USING (public.is_admin());

-- ==============================================================================
-- SEED DATA SMKN 1 SONGGOM (Master Data Awal)
-- ==============================================================================

-- Seed Jurusan
INSERT INTO public.majors (id, code, name, description, status) VALUES
('a1111111-1111-1111-1111-111111111111', 'TJKT', 'Teknik Jaringan Komputer dan Telekomunikasi', 'Konsentrasi keahlian infrastruktur jaringan, server, fiber optic, dan komputasi awan.', 'active'),
('a2222222-2222-2222-2222-222222222222', 'TKRO', 'Teknik Kendaraan Ringan Otomotif', 'Konsentrasi keahlian sistem chasis, kelistrikan bodi, mesin EFI, dan pemeliharaan otomotif.', 'active'),
('a3333333-3333-3333-3333-333333333333', 'AKL', 'Akuntansi dan Keuangan Lembaga', 'Konsentrasi keahlian akuntansi perbankan, perpajakan, audit, dan spreadsheet keuangan.', 'active'),
('a4444444-4444-4444-4444-444444444444', 'DKV', 'Desain Komunikasi Visual', 'Konsentrasi keahlian desain grafis, ilustrasi vektor, UI/UX, dan videografi digital.', 'active'),
('a5555555-5555-5555-5555-555555555555', 'MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Konsentrasi tata kelola kearsipan, otomasi perkantoran, dan pelayanan prima.', 'active')
ON CONFLICT (code) DO NOTHING;

-- Seed Kelas
INSERT INTO public.classes (id, name, grade, major_id, academic_year, status) VALUES
('b1111111-1111-1111-1111-111111111111', 'X TJKT 1', 'X', 'a1111111-1111-1111-1111-111111111111', '2026/2027', 'active'),
('b2222222-2222-2222-2222-222222222222', 'XI TJKT 1', 'XI', 'a1111111-1111-1111-1111-111111111111', '2026/2027', 'active'),
('b3333333-3333-3333-3333-333333333333', 'XII TJKT 1', 'XII', 'a1111111-1111-1111-1111-111111111111', '2026/2027', 'active'),
('b4444444-4444-4444-4444-444444444444', 'XI TKRO 1', 'XI', 'a2222222-2222-2222-2222-222222222222', '2026/2027', 'active'),
('b5555555-5555-5555-5555-555555555555', 'XI AKL 1', 'XI', 'a3333333-3333-3333-3333-333333333333', '2026/2027', 'active')
ON CONFLICT (name) DO NOTHING;

-- Seed Mata Pelajaran
INSERT INTO public.subjects (id, code, name, description, status) VALUES
('c1111111-1111-1111-1111-111111111111', 'MTK-SMK', 'Matematika Terapan Kejuruan', 'Logika matematika, aljabar linier, statistika inferensial dan trigonometri terapan.', 'active'),
('c2222222-2222-2222-2222-222222222222', 'BIND-01', 'Bahasa Indonesia Kejuruan', 'Literasi informasi, penulisan laporan teknik, proposal proyek, dan komunikasi resmi.', 'active'),
('c3333333-3333-3333-3333-333333333333', 'BING-01', 'Bahasa Inggris Teknis', 'Technical reading, manual troubleshooting instruction, and workplace communication.', 'active'),
('c4444444-4444-4444-4444-444444444444', 'KJ-TJKT', 'Administrasi Infrastruktur Jaringan', 'Routing dinamis, VLAN, firewalling, mikrotik, dan manajemen bandwidth jaringan.', 'active'),
('c5555555-5555-5555-5555-555555555555', 'KJ-TKRO', 'Pemeliharaan Mesin Kendaraan Ringan', 'Diagnosis sistem EFI, engine tune up, sistem pelumasan dan pendinginan motor bakar.', 'active')
ON CONFLICT (code) DO NOTHING;
`;

export const SUPABASE_PHASE_3_SQL = `-- ==============================================================================
-- SKRIP SQL FASE 3: BANK SOAL TKA SMKN 1 SONGGOM
-- Meliputi: Questions, Question Options, Question Answers (Esai), Matching Pairs,
-- Supabase Storage Bucket 'question-images', serta Row Level Security (RLS).
-- Jalankan skrip ini setelah FASE 1 & FASE 2 di SQL Editor Supabase.
-- ==============================================================================

-- 1. TABEL UTAMA: QUESTIONS (BANK SOAL)
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
    points NUMERIC NOT NULL DEFAULT 10 CHECK (points > 0),
    question_text TEXT NOT NULL,
    image_url TEXT,
    explanation TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    scoring_method TEXT NOT NULL DEFAULT 'exact_match' CHECK (scoring_method IN ('exact_match', 'partial_credit', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_teacher ON public.questions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_grade ON public.questions(grade);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);

-- 2. TABEL OPSI PILIHAN GANDA (SINGLE & COMPLEX CHOICE)
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_key TEXT NOT NULL CHECK (option_key IN ('A', 'B', 'C', 'D', 'E')),
    option_text TEXT NOT NULL,
    image_url TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_num INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(question_id, option_key)
);

CREATE INDEX IF NOT EXISTS idx_question_options_question ON public.question_options(question_id);

-- 3. TABEL JAWABAN ACUAN ESAI (ESSAY)
CREATE TABLE IF NOT EXISTS public.question_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID UNIQUE NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    reference_answer TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    sample_rubric TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_answers_question ON public.question_answers(question_id);

-- 4. TABEL PASANGAN MENJODOHKAN (MATCHING PAIRS)
CREATE TABLE IF NOT EXISTS public.matching_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    left_item TEXT NOT NULL,
    right_item TEXT NOT NULL,
    correct_match_key TEXT NOT NULL,
    order_num INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matching_pairs_question ON public.matching_pairs(question_id);

-- 5. KONFIGURASI SUPABASE STORAGE BUCKET 'question-images'
-- Skrip untuk membuat bucket jika belum ada
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Siapa saja dapat melihat gambar soal
CREATE POLICY "Public Read Access for Question Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Storage Policy: Admin dan Guru dapat mengunggah gambar soal
CREATE POLICY "Admin and Guru can upload Question Images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'question-images' AND
    auth.role() = 'authenticated' AND
    (public.is_admin() OR public.is_teacher())
);

-- Storage Policy: Admin dan Guru dapat menghapus gambar soal
CREATE POLICY "Admin and Guru can delete Question Images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'question-images' AND
    auth.role() = 'authenticated' AND
    (public.is_admin() OR public.is_teacher())
);

-- 6. ROW LEVEL SECURITY (RLS) UNTUK BANK SOAL
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_pairs ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk Admin: Akses penuh ke seluruh soal
CREATE POLICY "Admin dapat melihat semua soal"
ON public.questions FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admin dapat mengelola semua soal"
ON public.questions FOR ALL
USING (public.is_admin());

-- Kebijakan RLS untuk Guru:
-- 1. Guru hanya dapat melihat soal untuk mata pelajaran yang diampunya (via teacher_subjects)
CREATE POLICY "Guru dapat melihat soal untuk mata pelajaran yang diampunya"
ON public.questions FOR SELECT
USING (
    public.is_teacher() AND
    EXISTS (
        SELECT 1 FROM public.teacher_subjects ts
        WHERE ts.teacher_id = auth.uid()
        AND ts.subject_id = public.questions.subject_id
    )
);

-- 2. Guru dapat menambah soal untuk mata pelajaran yang diampunya
CREATE POLICY "Guru dapat menambah soal untuk mata pelajaran diampunya"
ON public.questions FOR INSERT
WITH CHECK (
    public.is_teacher() AND
    teacher_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.teacher_subjects ts
        WHERE ts.teacher_id = auth.uid()
        AND ts.subject_id = public.questions.subject_id
    )
);

-- 3. Guru HANYA DAPAT MENGUBAH soal buatannya sendiri (tidak boleh mengubah soal guru lain!)
CREATE POLICY "Guru hanya dapat mengubah soal buatannya sendiri"
ON public.questions FOR UPDATE
USING (
    public.is_teacher() AND
    teacher_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.teacher_subjects ts
        WHERE ts.teacher_id = auth.uid()
        AND ts.subject_id = public.questions.subject_id
    )
)
WITH CHECK (
    public.is_teacher() AND
    teacher_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.teacher_subjects ts
        WHERE ts.teacher_id = auth.uid()
        AND ts.subject_id = public.questions.subject_id
    )
);

-- 4. Guru hanya dapat menghapus soal miliknya sendiri
CREATE POLICY "Guru hanya dapat menghapus soal buatannya sendiri"
ON public.questions FOR DELETE
USING (
    public.is_teacher() AND
    teacher_id = auth.uid()
);

-- Kebijakan Cascading RLS untuk question_options, question_answers, dan matching_pairs:
-- ADMIN: Full Access
CREATE POLICY "Admin akses penuh question_options"
ON public.question_options FOR ALL
USING (public.is_admin());

CREATE POLICY "Admin akses penuh question_answers"
ON public.question_answers FOR ALL
USING (public.is_admin());

CREATE POLICY "Admin akses penuh matching_pairs"
ON public.matching_pairs FOR ALL
USING (public.is_admin());

-- GURU: Mengikuti izin soal induk (parent question)
CREATE POLICY "Guru akses question_options sesuai kepemilikan soal"
ON public.question_options FOR ALL
USING (
    public.is_teacher() AND
    EXISTS (
        SELECT 1 FROM public.questions q
        JOIN public.teacher_subjects ts ON ts.subject_id = q.subject_id
        WHERE q.id = question_id
        AND ts.teacher_id = auth.uid()
        AND (q.teacher_id = auth.uid() OR current_setting('request.jwt.claim.role', true) = 'authenticated')
    )
);

CREATE POLICY "Guru akses question_answers sesuai kepemilikan soal"
ON public.question_answers FOR ALL
USING (
    public.is_teacher() AND
    EXISTS (
        SELECT 1 FROM public.questions q
        JOIN public.teacher_subjects ts ON ts.subject_id = q.subject_id
        WHERE q.id = question_id
        AND ts.teacher_id = auth.uid()
        AND (q.teacher_id = auth.uid() OR current_setting('request.jwt.claim.role', true) = 'authenticated')
    )
);

CREATE POLICY "Guru akses matching_pairs sesuai kepemilikan soal"
ON public.matching_pairs FOR ALL
USING (
    public.is_teacher() AND
    EXISTS (
        SELECT 1 FROM public.questions q
        JOIN public.teacher_subjects ts ON ts.subject_id = q.subject_id
        WHERE q.id = question_id
        AND ts.teacher_id = auth.uid()
        AND (q.teacher_id = auth.uid() OR current_setting('request.jwt.claim.role', true) = 'authenticated')
    )
);

-- SISWA: Tidak diizinkan mengakses bank soal secara langsung.
-- (Akses siswa ke soal saat ujian berlangsung dilakukan melalui function / session views terkontrol pada Fase 4)

-- 7. TRIGGER UPDATE TIMESTAMP OTOMATIS
CREATE OR REPLACE FUNCTION public.set_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_questions_updated_at ON public.questions;
CREATE TRIGGER trg_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_questions_updated_at();
`;

export const SUPABASE_PHASE_5_SQL = `-- ==============================================================================
-- SKRIP SQL FASE 5: PELAKSANAAN UJIAN SISWA (CBT ENGINE & SECURITY)
-- ==============================================================================

-- 1. TABEL EXAM_ATTEMPTS (Sesi Ujian Siswa)
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
    score NUMERIC(5,2),
    total_points NUMERIC(5,2),
    question_order JSONB NOT NULL DEFAULT '[]'::jsonb,
    option_order JSONB NOT NULL DEFAULT '{}'::jsonb,
    doubtful_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- ANTI DUPLIKASI: Satu siswa hanya boleh mempunyai satu attempt per ujian
    CONSTRAINT unique_student_exam_attempt UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON public.exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON public.exam_attempts(status);

-- 2. TABEL STUDENT_ANSWERS (Penyimpanan Autosave Jawaban Siswa)
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    answer JSONB,
    is_doubtful BOOLEAN NOT NULL DEFAULT FALSE,
    points_earned NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_student_answers_attempt ON public.student_answers(attempt_id);

-- 3. VALIDASI SERVER-SIDE: TOLAK PERUBAHAN JAWABAN JIKA DEADLINE HABIS ATAU SUDAH SUBMIT
CREATE OR REPLACE FUNCTION public.check_attempt_editable()
RETURNS TRIGGER AS $$
DECLARE
    v_attempt RECORD;
BEGIN
    SELECT status, deadline_at INTO v_attempt 
    FROM public.exam_attempts 
    WHERE id = NEW.attempt_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesi ujian (attempt) tidak ditemukan.';
    END IF;

    IF v_attempt.status != 'in_progress' THEN
        RAISE EXCEPTION 'Ujian telah dikumpulkan atau ditutup. Perubahan jawaban ditolak.';
    END IF;

    IF NOW() > v_attempt.deadline_at THEN
        -- Otomatis tandai expired/submitted
        UPDATE public.exam_attempts 
        SET status = 'expired', submitted_at = NOW() 
        WHERE id = NEW.attempt_id;
        RAISE EXCEPTION 'Batas waktu pengerjaan telah berakhir. Jawaban tidak dapat diubah lagi.';
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_attempt_editable ON public.student_answers;
CREATE TRIGGER trg_check_attempt_editable
    BEFORE INSERT OR UPDATE ON public.student_answers
    FOR EACH ROW
    EXECUTE FUNCTION public.check_attempt_editable();

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Siswa hanya bisa membaca dan memodifikasi attempt miliknya sendiri
CREATE POLICY "Siswa dapat melihat attempt sendiri"
ON public.exam_attempts FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Siswa dapat membuat attempt sendiri"
ON public.exam_attempts FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Siswa dapat update attempt sendiri jika in_progress"
ON public.exam_attempts FOR UPDATE
USING (auth.uid() = student_id AND status = 'in_progress');

-- Guru dan Admin dapat melihat attempt untuk ujian terkait
CREATE POLICY "Guru dan Admin dapat melihat exam_attempts"
ON public.exam_attempts FOR SELECT
USING (public.is_admin() OR public.is_teacher());

-- Policy student_answers
CREATE POLICY "Siswa dapat kelola jawaban attempt miliknya"
ON public.student_answers FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.exam_attempts ea 
        WHERE ea.id = attempt_id AND ea.student_id = auth.uid()
    )
);

CREATE POLICY "Guru dan Admin dapat melihat jawaban siswa"
ON public.student_answers FOR SELECT
USING (public.is_admin() OR public.is_teacher());
`;

