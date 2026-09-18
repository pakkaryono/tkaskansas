-- ==============================================================================
-- MASTER SKRIP MIGRASI SUPABASE LENGKAP (FASE 1 S.D FASE 5)
-- TES KEMAMPUAN AKADEMIK (TKA) SMKN 1 SONGGOM
-- Dijalankan sekali jalan di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- ==============================================================================
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
DROP POLICY IF EXISTS "User dapat membaca profil sendiri" ON public.profiles;
CREATE POLICY "User dapat membaca profil sendiri"
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin dapat membaca semua profil" ON public.profiles;
CREATE POLICY "Admin dapat membaca semua profil"
ON public.profiles FOR SELECT 
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin dapat mengelola semua profil" ON public.profiles;
CREATE POLICY "Admin dapat mengelola semua profil"
ON public.profiles FOR ALL 
USING (public.is_admin());

DROP POLICY IF EXISTS "Guru dapat melihat data siswa" ON public.profiles;
CREATE POLICY "Guru dapat melihat data siswa"
ON public.profiles FOR SELECT 
USING (public.is_teacher() AND role = 'siswa');

-- KEAMANAN KRITIS: User hanya dapat update profil sendiri, DILARANG mengubah kolom 'role' secara mandiri
DROP POLICY IF EXISTS "User dapat update profil sendiri" ON public.profiles;
CREATE POLICY "User dapat update profil sendiri"
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- TRIGGER ANTI-ESKALASI HAK AKSES (PREVENT PRIVILEGE ESCALATION)
-- Mencegah siswa/guru mengubah role mereka sendiri menjadi 'admin' melalui manipulasi API Supabase
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Pelanggaran Keamanan: Perubahan peran (role) hanya boleh dilakukan oleh Administrator.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

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

DROP POLICY IF EXISTS "Admin dapat melihat semua audit log" ON public.audit_logs;
CREATE POLICY "Admin dapat melihat semua audit log"
ON public.audit_logs FOR SELECT 
USING (public.is_admin());

DROP POLICY IF EXISTS "Semua user terotentikasi dapat membuat log" ON public.audit_logs;
CREATE POLICY "Semua user terotentikasi dapat membuat log"
ON public.audit_logs FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');


-- ==============================================================================
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

DROP POLICY IF EXISTS "Semua user terotentikasi dapat melihat jurusan" ON public.majors;
CREATE POLICY "Semua user terotentikasi dapat melihat jurusan"
ON public.majors FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Hanya Admin yang dapat mengelola jurusan" ON public.majors;
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

DROP POLICY IF EXISTS "Semua user terotentikasi dapat melihat kelas" ON public.classes;
CREATE POLICY "Semua user terotentikasi dapat melihat kelas"
ON public.classes FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Hanya Admin yang dapat mengelola kelas" ON public.classes;
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

DROP POLICY IF EXISTS "Semua user terotentikasi dapat melihat mata pelajaran" ON public.subjects;
CREATE POLICY "Semua user terotentikasi dapat melihat mata pelajaran"
ON public.subjects FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Hanya Admin yang dapat mengelola mata pelajaran" ON public.subjects;
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

DROP POLICY IF EXISTS "Guru dan Admin dapat melihat guru" ON public.teachers;
CREATE POLICY "Guru dan Admin dapat melihat guru"
ON public.teachers FOR SELECT
USING (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "Hanya Admin yang dapat mengelola guru" ON public.teachers;
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

DROP POLICY IF EXISTS "Semua user terotentikasi dapat melihat pengampu mapel" ON public.teacher_subjects;
CREATE POLICY "Semua user terotentikasi dapat melihat pengampu mapel"
ON public.teacher_subjects FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Hanya Admin yang dapat mengelola pengampu mapel" ON public.teacher_subjects;
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

DROP POLICY IF EXISTS "Admin dan Guru dapat melihat semua data siswa" ON public.students;
CREATE POLICY "Admin dan Guru dapat melihat semua data siswa"
ON public.students FOR SELECT
USING (public.is_admin() OR public.is_teacher() OR auth.uid() = id);

DROP POLICY IF EXISTS "Hanya Admin yang dapat mengelola data siswa" ON public.students;
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


-- ==============================================================================
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
DROP POLICY IF EXISTS "Public Read Access for Question Images" ON storage.objects;
CREATE POLICY "Public Read Access for Question Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Storage Policy: Admin dan Guru dapat mengunggah gambar soal
DROP POLICY IF EXISTS "Admin and Guru can upload Question Images" ON storage.objects;
CREATE POLICY "Admin and Guru can upload Question Images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'question-images' AND
    auth.role() = 'authenticated' AND
    (public.is_admin() OR public.is_teacher())
);

-- Storage Policy: Admin dan Guru dapat menghapus gambar soal
DROP POLICY IF EXISTS "Admin and Guru can delete Question Images" ON storage.objects;
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
DROP POLICY IF EXISTS "Admin dapat melihat semua soal" ON public.questions;
CREATE POLICY "Admin dapat melihat semua soal"
ON public.questions FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin dapat mengelola semua soal" ON public.questions;
CREATE POLICY "Admin dapat mengelola semua soal"
ON public.questions FOR ALL
USING (public.is_admin());

-- Kebijakan RLS untuk Guru:
-- 1. Guru hanya dapat melihat soal untuk mata pelajaran yang diampunya (via teacher_subjects)
DROP POLICY IF EXISTS "Guru dapat melihat soal untuk mata pelajaran yang diampunya" ON public.questions;
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
DROP POLICY IF EXISTS "Guru dapat menambah soal untuk mata pelajaran diampunya" ON public.questions;
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
DROP POLICY IF EXISTS "Guru hanya dapat mengubah soal buatannya sendiri" ON public.questions;
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
DROP POLICY IF EXISTS "Guru hanya dapat menghapus soal buatannya sendiri" ON public.questions;
CREATE POLICY "Guru hanya dapat menghapus soal buatannya sendiri"
ON public.questions FOR DELETE
USING (
    public.is_teacher() AND
    teacher_id = auth.uid()
);

-- Kebijakan Cascading RLS untuk question_options, question_answers, dan matching_pairs:
-- ADMIN: Full Access
DROP POLICY IF EXISTS "Admin akses penuh question_options" ON public.question_options;
CREATE POLICY "Admin akses penuh question_options"
ON public.question_options FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin akses penuh question_answers" ON public.question_answers;
CREATE POLICY "Admin akses penuh question_answers"
ON public.question_answers FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin akses penuh matching_pairs" ON public.matching_pairs;
CREATE POLICY "Admin akses penuh matching_pairs"
ON public.matching_pairs FOR ALL
USING (public.is_admin());

-- GURU: Mengikuti izin soal induk (parent question)
DROP POLICY IF EXISTS "Guru akses question_options sesuai kepemilikan soal" ON public.question_options;
CREATE POLICY "Guru akses question_options sesuai kepemilikan soal"
ON public.question_options FOR ALL
USING (
    public.is_teacher() AND
    EXISTS (
        SELECT 1 FROM public.questions q
        JOIN public.teacher_subjects ts ON ts.subject_id = q.subject_id
        WHERE q.id = question_id
        AND ts.teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Guru akses question_answers sesuai kepemilikan soal" ON public.question_answers;
CREATE POLICY "Guru akses question_answers sesuai kepemilikan soal"
ON public.question_answers FOR ALL
USING (
    public.is_teacher() AND
    EXISTS (
        SELECT 1 FROM public.questions q
        JOIN public.teacher_subjects ts ON ts.subject_id = q.subject_id
        WHERE q.id = question_id
        AND ts.teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Guru akses matching_pairs sesuai kepemilikan soal" ON public.matching_pairs;
CREATE POLICY "Guru akses matching_pairs sesuai kepemilikan soal"
ON public.matching_pairs FOR ALL
USING (
    public.is_teacher() AND
    EXISTS (
        SELECT 1 FROM public.questions q
        JOIN public.teacher_subjects ts ON ts.subject_id = q.subject_id
        WHERE q.id = question_id
        AND ts.teacher_id = auth.uid()
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


-- ==============================================================================
-- SKRIP SQL FASE 4: MANAJEMEN UJIAN DAN PENJADWALAN CBT
-- Meliputi: Tabel exams, exam_classes, exam_questions, serta RLS ketat anti-bocor kunci.
-- Jalankan skrip ini sebelum FASE 5 di SQL Editor Supabase.
-- ==============================================================================

-- 1. TABEL UTAMA: EXAMS (MANAJEMEN PAKET UJIAN)
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
    pass_score NUMERIC NOT NULL DEFAULT 75,
    question_selection_method TEXT NOT NULL DEFAULT 'random' CHECK (question_selection_method IN ('manual', 'random')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_exam_time CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_exams_subject ON public.exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_teacher ON public.exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_time ON public.exams(start_at, end_at);

-- 2. TABEL RELASI UJIAN DENGAN ROMBEL KELAS (TARGET PESERTA)
CREATE TABLE IF NOT EXISTS public.exam_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_classes_exam ON public.exam_classes(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_classes_class ON public.exam_classes(class_id);

-- 3. TABEL BUTIR SOAL TERPILIH PADA UJIAN (EXAM QUESTIONS SNAPSHOT)
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
    order_num INT NOT NULL DEFAULT 0,
    points NUMERIC NOT NULL DEFAULT 10,
    snapshot JSONB NOT NULL, -- Menyimpan salinan konten soal saat ujian diterbitkan
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON public.exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question ON public.exam_questions(question_id);

-- 4. ROW LEVEL SECURITY (RLS) FASE 4
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS EXAMS:
-- Admin: Akses penuh
DROP POLICY IF EXISTS "Admin akses penuh exams" ON public.exams;
CREATE POLICY "Admin akses penuh exams"
ON public.exams FOR ALL
USING (public.is_admin());

-- Guru: Hanya dapat melihat ujian mata pelajaran yang diampunya
DROP POLICY IF EXISTS "Guru melihat ujian sesuai mapel yang diampunya" ON public.exams;
CREATE POLICY "Guru melihat ujian sesuai mapel yang diampunya"
ON public.exams FOR SELECT
USING (
    public.is_teacher() AND (
        teacher_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.teacher_subjects ts
            WHERE ts.teacher_id = auth.uid() AND ts.subject_id = public.exams.subject_id
        )
    )
);

DROP POLICY IF EXISTS "Guru kelola ujian buatannya sendiri" ON public.exams;
CREATE POLICY "Guru kelola ujian buatannya sendiri"
ON public.exams FOR INSERT
WITH CHECK (
    public.is_teacher() AND
    teacher_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.teacher_subjects ts
        WHERE ts.teacher_id = auth.uid() AND ts.subject_id = public.exams.subject_id
    )
);

DROP POLICY IF EXISTS "Guru ubah ujian buatannya sendiri" ON public.exams;
CREATE POLICY "Guru ubah ujian buatannya sendiri"
ON public.exams FOR UPDATE
USING (
    public.is_teacher() AND
    teacher_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.teacher_subjects ts
        WHERE ts.teacher_id = auth.uid() AND ts.subject_id = public.exams.subject_id
    )
);

DROP POLICY IF EXISTS "Guru hapus ujian buatannya sendiri" ON public.exams;
CREATE POLICY "Guru hapus ujian buatannya sendiri"
ON public.exams FOR DELETE
USING (
    public.is_teacher() AND teacher_id = auth.uid()
);

-- Siswa: Hanya dapat melihat ujian berstatus scheduled, open, atau closed yang ditugaskan ke kelasnya
DROP POLICY IF EXISTS "Siswa hanya melihat ujian yang ditugaskan ke kelasnya" ON public.exams;
CREATE POLICY "Siswa hanya melihat ujian yang ditugaskan ke kelasnya"
ON public.exams FOR SELECT
USING (
    status IN ('scheduled', 'open', 'closed') AND (
        NOT EXISTS (SELECT 1 FROM public.exam_classes ec WHERE ec.exam_id = public.exams.id) OR
        EXISTS (
            SELECT 1 FROM public.exam_classes ec
            JOIN public.students s ON s.class_id = ec.class_id
            WHERE ec.exam_id = public.exams.id AND s.id = auth.uid()
        )
    )
);

-- Kebijakan RLS EXAM_CLASSES:
DROP POLICY IF EXISTS "Admin dan Guru akses exam_classes" ON public.exam_classes;
CREATE POLICY "Admin dan Guru akses exam_classes"
ON public.exam_classes FOR ALL
USING (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "Siswa melihat exam_classes untuk ujiannya" ON public.exam_classes;
CREATE POLICY "Siswa melihat exam_classes untuk ujiannya"
ON public.exam_classes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = auth.uid() AND s.class_id = public.exam_classes.class_id
    )
);

-- Kebijakan RLS EXAM_QUESTIONS:
-- Admin dan Guru Pengampu dapat melihat butir soal ujian
DROP POLICY IF EXISTS "Admin dan Guru akses exam_questions" ON public.exam_questions;
CREATE POLICY "Admin dan Guru akses exam_questions"
ON public.exam_questions FOR ALL
USING (
    public.is_admin() OR (
        public.is_teacher() AND EXISTS (
            SELECT 1 FROM public.exams e
            JOIN public.teacher_subjects ts ON ts.subject_id = e.subject_id
            WHERE e.id = public.exam_questions.exam_id AND ts.teacher_id = auth.uid()
        )
    )
);

-- KEAMANAN KRITIS ANTI-BOCOR KUNCI:
-- SISWA TIDAK DIIZINKAN melakukan SELECT langsung ke tabel exam_questions
-- karena kolom snapshot memuat objek soal lengkap beserta 'is_correct' dan 'reference_answer'.
-- Siswa wajib mengambil soal tersanitasi melalui RPC get_student_exam_payload.


-- ==============================================================================
-- SKRIP SQL FASE 5: PELAKSANAAN UJIAN SISWA (CBT ENGINE & SECURITY)
-- Meliputi: exam_attempts, student_answers, Anti-IDOR, Anti-Skor Tampering, dan Trigger Timer.
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
    maximum_points NUMERIC(5,2),
    has_pending_essay BOOLEAN NOT NULL DEFAULT FALSE,
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

-- 3. TRIGGER SERVER-SIDE: VALIDASI PRE-INSERT EXAM_ATTEMPTS (SERVER-AUTHORITATIVE TIMER & ANTI-TAMPERING)
CREATE OR REPLACE FUNCTION public.validate_exam_attempt_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_exam RECORD;
    v_calculated_deadline TIMESTAMPTZ;
BEGIN
    -- 1. Verifikasi eksistensi dan jadwal ujian
    SELECT * INTO v_exam FROM public.exams WHERE id = NEW.exam_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ujian tidak ditemukan.';
    END IF;

    -- 2. Validasi Window Jadwal Ujian
    IF NOW() < v_exam.start_at THEN
        RAISE EXCEPTION 'Ujian belum dibuka. Jadwal mulai: %', v_exam.start_at;
    END IF;
    IF NOW() > v_exam.end_at THEN
        RAISE EXCEPTION 'Jadwal pelaksanaan ujian telah ditutup.';
    END IF;

    -- 3. Validasi Rombel Kelas (Siswa hanya boleh mengerjakan ujian untuk kelasnya)
    IF NOT (public.is_admin() OR public.is_teacher()) THEN
        IF EXISTS (SELECT 1 FROM public.exam_classes WHERE exam_id = NEW.exam_id) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.exam_classes ec
                JOIN public.students s ON s.class_id = ec.class_id
                WHERE ec.exam_id = NEW.exam_id AND s.id = NEW.student_id
            ) THEN
                RAISE EXCEPTION 'Akses Ditolak: Rombel kelas Anda tidak terdaftar sebagai peserta ujian ini.';
            END IF;
        END IF;
    END IF;

    -- 4. Server-Authoritative Timing: Deadline dihitung mutlak oleh server
    -- Formula: LEAST(waktu_mulai + durasi_menit, batas_akhir_jadwal_ujian)
    v_calculated_deadline := LEAST(
        NOW() + (COALESCE(v_exam.duration_minutes, 60) || ' minutes')::INTERVAL,
        v_exam.end_at
    );

    NEW.started_at := NOW();
    NEW.deadline_at := v_calculated_deadline;
    NEW.status := 'in_progress';
    NEW.score := NULL;
    NEW.total_points := NULL;
    NEW.maximum_points := NULL;
    NEW.has_pending_essay := FALSE;
    NEW.submitted_at := NULL;
    NEW.created_at := NOW();
    NEW.updated_at := NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_exam_attempt_insert ON public.exam_attempts;
CREATE TRIGGER trg_validate_exam_attempt_insert
    BEFORE INSERT ON public.exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_exam_attempt_insert();

-- 4. TRIGGER ANTI-TAMPERING NILAI, SKOR, DEADLINE & ID (MENCEGAH MANIPULASI DARI CLIENT)
CREATE OR REPLACE FUNCTION public.prevent_tampering_exam_attempt()
RETURNS TRIGGER AS $$
BEGIN
    -- Jika yang mengupdate bukan Admin atau Guru, terapkan proteksi ketat
    IF NOT (public.is_admin() OR public.is_teacher()) THEN
        -- A. Siswa dilarang mengubah skor, total poin, atau maximum poin
        IF NEW.score IS DISTINCT FROM OLD.score OR
           NEW.total_points IS DISTINCT FROM OLD.total_points OR
           NEW.maximum_points IS DISTINCT FROM OLD.maximum_points OR
           NEW.has_pending_essay IS DISTINCT FROM OLD.has_pending_essay THEN
            RAISE EXCEPTION 'Pelanggaran Keamanan: Siswa dilarang mengubah skor atau nilai secara mandiri.';
        END IF;

        -- B. Siswa dilarang memperpanjang deadline_at atau memanipulasi started_at
        IF NEW.deadline_at IS DISTINCT FROM OLD.deadline_at OR
           NEW.started_at IS DISTINCT FROM OLD.started_at THEN
            RAISE EXCEPTION 'Pelanggaran Keamanan: Batas waktu (deadline) ujian dikontrol penuh oleh server dan tidak dapat diubah.';
        END IF;

        -- C. Siswa dilarang memanipulasi student_id atau exam_id (Anti-IDOR / Anti-Session Hijacking)
        IF NEW.student_id IS DISTINCT FROM OLD.student_id OR
           NEW.exam_id IS DISTINCT FROM OLD.exam_id THEN
            RAISE EXCEPTION 'Pelanggaran Keamanan: ID peserta dan ID ujian tidak dapat dialihkan.';
        END IF;

        -- D. Siswa dilarang mengaktifkan kembali sesi yang sudah diserahkan (submitted/expired)
        IF OLD.status IN ('submitted', 'expired') AND NEW.status = 'in_progress' THEN
            RAISE EXCEPTION 'Pelanggaran Keamanan: Sesi ujian yang telah diserahkan tidak dapat dibuka kembali.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_tampering_exam_attempt ON public.exam_attempts;
DROP TRIGGER IF EXISTS trg_prevent_tampering_attempt_scores ON public.exam_attempts;
CREATE TRIGGER trg_prevent_tampering_exam_attempt
    BEFORE UPDATE ON public.exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_tampering_exam_attempt();

-- 5. VALIDASI SERVER-SIDE: TOLAK PERUBAHAN JAWABAN JIKA DEADLINE HABIS ATAU SUDAH SUBMIT
CREATE OR REPLACE FUNCTION public.check_attempt_editable()
RETURNS TRIGGER AS $$
DECLARE
    v_attempt RECORD;
BEGIN
    SELECT student_id, status, deadline_at INTO v_attempt 
    FROM public.exam_attempts 
    WHERE id = NEW.attempt_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesi ujian (attempt) tidak ditemukan.';
    END IF;

    -- Anti-IDOR: Pastikan user yang mengirim jawaban adalah pemilik attempt (jika bukan admin/guru)
    IF NOT (public.is_admin() OR public.is_teacher()) THEN
        IF v_attempt.student_id != auth.uid() THEN
            RAISE EXCEPTION 'Pelanggaran Keamanan (IDOR): Anda tidak memiliki hak memodifikasi lembar jawaban peserta lain.';
        END IF;
    END IF;

    IF v_attempt.status != 'in_progress' THEN
        RAISE EXCEPTION 'Ujian telah dikumpulkan atau ditutup. Perubahan jawaban ditolak.';
    END IF;

    IF NOW() > v_attempt.deadline_at THEN
        -- Otomatis kunci attempt menjadi expired
        UPDATE public.exam_attempts 
        SET status = 'expired', submitted_at = NOW() 
        WHERE id = NEW.attempt_id;
        RAISE EXCEPTION 'Batas waktu pengerjaan telah berakhir. Jawaban tidak dapat diubah lagi.';
    END IF;

    -- Siswa tidak boleh memanipulasi kolom points_earned saat autosave jawaban
    IF NOT (public.is_admin() OR public.is_teacher()) THEN
        NEW.points_earned = COALESCE(OLD.points_earned, 0);
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

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Kebijakan Siswa:
DROP POLICY IF EXISTS "Siswa dapat melihat attempt sendiri" ON public.exam_attempts;
CREATE POLICY "Siswa dapat melihat attempt sendiri"
ON public.exam_attempts FOR SELECT
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Siswa dapat membuat attempt sendiri" ON public.exam_attempts;
CREATE POLICY "Siswa dapat membuat attempt sendiri"
ON public.exam_attempts FOR INSERT
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Siswa dapat update attempt sendiri jika in_progress" ON public.exam_attempts;
CREATE POLICY "Siswa dapat update attempt sendiri jika in_progress"
ON public.exam_attempts FOR UPDATE
USING (auth.uid() = student_id AND status = 'in_progress');

-- Kebijakan Guru dan Admin:
-- Guru HANYA DAPAT MELIHAT attempts untuk mata pelajaran yang diampunya (Mencegah IDOR antar Guru)
DROP POLICY IF EXISTS "Guru dan Admin melihat attempts sesuai kewenangan mapel" ON public.exam_attempts;
CREATE POLICY "Guru dan Admin melihat attempts sesuai kewenangan mapel"
ON public.exam_attempts FOR SELECT
USING (
    public.is_admin() OR (
        public.is_teacher() AND EXISTS (
            SELECT 1 FROM public.exams e
            JOIN public.teacher_subjects ts ON ts.subject_id = e.subject_id
            WHERE e.id = public.exam_attempts.exam_id AND ts.teacher_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Guru dan Admin dapat mengelola nilai attempt" ON public.exam_attempts;
CREATE POLICY "Guru dan Admin dapat mengelola nilai attempt"
ON public.exam_attempts FOR UPDATE
USING (
    public.is_admin() OR (
        public.is_teacher() AND EXISTS (
            SELECT 1 FROM public.exams e
            JOIN public.teacher_subjects ts ON ts.subject_id = e.subject_id
            WHERE e.id = public.exam_attempts.exam_id AND ts.teacher_id = auth.uid()
        )
    )
);

-- Kebijakan student_answers:
DROP POLICY IF EXISTS "Siswa kelola jawaban attempt miliknya" ON public.student_answers;
CREATE POLICY "Siswa kelola jawaban attempt miliknya"
ON public.student_answers FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.exam_attempts ea 
        WHERE ea.id = attempt_id AND ea.student_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Guru dan Admin melihat jawaban siswa sesuai mapel" ON public.student_answers;
CREATE POLICY "Guru dan Admin melihat jawaban siswa sesuai mapel"
ON public.student_answers FOR SELECT
USING (
    public.is_admin() OR (
        public.is_teacher() AND EXISTS (
            SELECT 1 FROM public.exam_attempts ea
            JOIN public.exams e ON e.id = ea.exam_id
            JOIN public.teacher_subjects ts ON ts.subject_id = e.subject_id
            WHERE ea.id = public.student_answers.attempt_id AND ts.teacher_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Guru dan Admin menilai jawaban esai siswa" ON public.student_answers;
CREATE POLICY "Guru dan Admin menilai jawaban esai siswa"
ON public.student_answers FOR UPDATE
USING (
    public.is_admin() OR (
        public.is_teacher() AND EXISTS (
            SELECT 1 FROM public.exam_attempts ea
            JOIN public.exams e ON e.id = ea.exam_id
            JOIN public.teacher_subjects ts ON ts.subject_id = e.subject_id
            WHERE ea.id = public.student_answers.attempt_id AND ts.teacher_id = auth.uid()
        )
    )
);

-- ==============================================================================
-- CONTOH DATA AWAL (SEED DATA) SISTEM TKA SMKN 1 SONGGOM
-- Minimal 3 data terisi untuk seluruh tabel utama:
-- Akun Auth, Profil, Jurusan, Kelas, Mapel, Guru, Siswa, Soal 4 Tipe, Ujian, dan Nilai.
-- ==============================================================================

-- 1. AKTIFKAN EKSTENSI KRIPTOGRAFI UNTUK PASSWORD AUTH
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Nonaktifkan trigger validasi sementara agar seed data historis dapat masuk dengan presisi
ALTER TABLE IF EXISTS public.exam_attempts DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.student_answers DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.profiles DISABLE TRIGGER ALL;

-- 2. AKUN OTENTIKASI (auth.users)
-- Seluruh akun contoh menggunakan password: password123
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES 
-- Admin (1 Akun)
('00000000-0000-0000-0000-000000000000', 'd1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@smk.id', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"M. Karyono, S.Kom. (Admin)","role":"admin"}', NOW(), NOW()),
-- Guru (3 Akun)
('00000000-0000-0000-0000-000000000000', 'd2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'guru.tjkt@smk.id', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Karyono, S.Kom.","role":"guru"}', NOW(), NOW()),
('00000000-0000-0000-0000-000000000000', 'd3333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'guru.tkro@smk.id', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ahmad Hidayat, S.T.","role":"guru"}', NOW(), NOW()),
('00000000-0000-0000-0000-000000000000', 'd4444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'guru.mtk@smk.id', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Siti Nurhaliza, S.Pd.","role":"guru"}', NOW(), NOW()),
-- Siswa (3 Akun)
('00000000-0000-0000-0000-000000000000', 'e1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'siswa.fajar@smk.id', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Muhammad Fajar Pratama","role":"siswa"}', NOW(), NOW()),
('00000000-0000-0000-0000-000000000000', 'e2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'siswa.aisyah@smk.id', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Siti Aisyah Lestari","role":"siswa"}', NOW(), NOW()),
('00000000-0000-0000-0000-000000000000', 'e3333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'siswa.rizky@smk.id', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rizky Ramadhan","role":"siswa"}', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- 3. PROFIL PENGGUNA (public.profiles)
INSERT INTO public.profiles (
    id, email, full_name, role, phone_number, nip, nis, nisn, class_name, major_name, status
) VALUES
('d1111111-1111-1111-1111-111111111111', 'admin@smk.id', 'M. Karyono, S.Kom. (Admin)', 'admin', '081234567890', '198507142011011001', NULL, NULL, NULL, NULL, 'active'),
('d2222222-2222-2222-2222-222222222222', 'guru.tjkt@smk.id', 'Karyono, S.Kom.', 'guru', '081234567891', '198507142011011001', NULL, NULL, NULL, 'Teknik Jaringan Komputer dan Telekomunikasi', 'active'),
('d3333333-3333-3333-3333-333333333333', 'guru.tkro@smk.id', 'Ahmad Hidayat, S.T.', 'guru', '081234567892', '198203252009021003', NULL, NULL, NULL, 'Teknik Kendaraan Ringan Otomotif', 'active'),
('d4444444-4444-4444-4444-444444444444', 'guru.mtk@smk.id', 'Siti Nurhaliza, S.Pd.', 'guru', '081234567893', '199011052016032002', NULL, NULL, NULL, 'Umum & Matematika', 'active'),
('e1111111-1111-1111-1111-111111111111', 'siswa.fajar@smk.id', 'Muhammad Fajar Pratama', 'siswa', '089876543210', NULL, '20261001', '0071234561', 'XI TJKT 1', 'Teknik Jaringan Komputer dan Telekomunikasi', 'active'),
('e2222222-2222-2222-2222-222222222222', 'siswa.aisyah@smk.id', 'Siti Aisyah Lestari', 'siswa', '089876543211', NULL, '20261002', '0071234562', 'XI TJKT 1', 'Teknik Jaringan Komputer dan Telekomunikasi', 'active'),
('e3333333-3333-3333-3333-333333333333', 'siswa.rizky@smk.id', 'Rizky Ramadhan', 'siswa', '089876543212', NULL, '20261003', '0071234563', 'XII TKRO 1', 'Teknik Kendaraan Ringan Otomotif', 'active')
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  class_name = EXCLUDED.class_name,
  major_name = EXCLUDED.major_name;

-- 4. MASTER JURUSAN (Minimal 3 Jurusan)
INSERT INTO public.majors (id, code, name, description, status) VALUES
('a1111111-1111-1111-1111-111111111111', 'TJKT', 'Teknik Jaringan Komputer dan Telekomunikasi', 'Konsentrasi keahlian infrastruktur jaringan, routing dinamis, cyber security, server, dan cloud.', 'active'),
('a2222222-2222-2222-2222-222222222222', 'TKRO', 'Teknik Kendaraan Ringan Otomotif', 'Konsentrasi keahlian sistem chasis, mesin EFI, kelistrikan bodi, dan tune up motor bakar.', 'active'),
('a3333333-3333-3333-3333-333333333333', 'AKL', 'Akuntansi dan Keuangan Lembaga', 'Konsentrasi keahlian siklus akuntansi, perpajakan, perbankan syariah, dan spreadsheet audit.', 'active'),
('a4444444-4444-4444-4444-444444444444', 'DKV', 'Desain Komunikasi Visual', 'Konsentrasi desain grafis, ilustrasi, media publikasi digital, dan videografi.', 'active'),
('a5555555-5555-5555-5555-555555555555', 'MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Konsentrasi tata kelola perkantoran, manajemen kearsipan, dan komunikasi bisnis.', 'active')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 5. MASTER KELAS / ROMBEL (Minimal 3 Rombel)
INSERT INTO public.classes (id, name, grade, major_id, academic_year, status) VALUES
('b1111111-1111-1111-1111-111111111111', 'X TJKT 1', 'X', 'a1111111-1111-1111-1111-111111111111', '2026/2027', 'active'),
('b2222222-2222-2222-2222-222222222222', 'XI TJKT 1', 'XI', 'a1111111-1111-1111-1111-111111111111', '2026/2027', 'active'),
('b3333333-3333-3333-3333-333333333333', 'XII TJKT 1', 'XII', 'a1111111-1111-1111-1111-111111111111', '2026/2027', 'active'),
('b4444444-4444-4444-4444-444444444444', 'XI TKRO 1', 'XI', 'a2222222-2222-2222-2222-222222222222', '2026/2027', 'active'),
('b5555555-5555-5555-5555-555555555555', 'XII TKRO 1', 'XII', 'a2222222-2222-2222-2222-222222222222', '2026/2027', 'active'),
('b6666666-6666-6666-6666-666666666666', 'XI AKL 1', 'XI', 'a3333333-3333-3333-3333-333333333333', '2026/2027', 'active')
ON CONFLICT (name) DO UPDATE SET grade = EXCLUDED.grade, major_id = EXCLUDED.major_id;

-- 6. MASTER MATA PELAJARAN (Minimal 3 Mapel)
INSERT INTO public.subjects (id, code, name, description, status) VALUES
('c1111111-1111-1111-1111-111111111111', 'MTK-SMK', 'Matematika Terapan Kejuruan', 'Logika matematika, aljabar linier, trigonometri, dan kalkulasi teknik industri.', 'active'),
('c4444444-4444-4444-4444-444444444444', 'KJ-TJKT', 'Administrasi Infrastruktur Jaringan', 'Routing dinamis OSPF/BGP, VLAN, firewalling MikroTik/Cisco, dan manajemen bandwidth.', 'active'),
('c5555555-5555-5555-5555-555555555555', 'KJ-TKRO', 'Pemeliharaan Mesin Kendaraan Ringan', 'Diagnosis sistem Electronic Fuel Injection (EFI), engine tune up, dan overhaul mesin.', 'active')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 7. DATA GURU (Minimal 3 Guru)
INSERT INTO public.teachers (id, nip, full_name, email, phone_number, status) VALUES
('d2222222-2222-2222-2222-222222222222', '198507142011011001', 'Karyono, S.Kom.', 'guru.tjkt@smk.id', '081234567891', 'active'),
('d3333333-3333-3333-3333-333333333333', '198203252009021003', 'Ahmad Hidayat, S.T.', 'guru.tkro@smk.id', '081234567892', 'active'),
('d4444444-4444-4444-4444-444444444444', '199011052016032002', 'Siti Nurhaliza, S.Pd.', 'guru.mtk@smk.id', '081234567893', 'active')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

-- 8. PENUGASAN MAPEL GURU (Minimal 3 Relasi)
INSERT INTO public.teacher_subjects (id, teacher_id, subject_id) VALUES
('aa111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222', 'c4444444-4444-4444-4444-444444444444'),
('aa222222-2222-2222-2222-222222222222', 'd3333333-3333-3333-3333-333333333333', 'c5555555-5555-5555-5555-555555555555'),
('aa333333-3333-3333-3333-333333333333', 'd4444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111')
ON CONFLICT (teacher_id, subject_id) DO NOTHING;

-- 9. DATA SISWA (Minimal 3 Siswa)
INSERT INTO public.students (id, nis, nisn, full_name, email, phone_number, class_id, major_id, status) VALUES
('e1111111-1111-1111-1111-111111111111', '20261001', '0071234561', 'Muhammad Fajar Pratama', 'siswa.fajar@smk.id', '089876543210', 'b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'active'),
('e2222222-2222-2222-2222-222222222222', '20261002', '0071234562', 'Siti Aisyah Lestari', 'siswa.aisyah@smk.id', '089876543211', 'b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'active'),
('e3333333-3333-3333-3333-333333333333', '20261003', '0071234563', 'Rizky Ramadhan', 'siswa.rizky@smk.id', '089876543212', 'b5555555-5555-5555-5555-555555555555', 'a2222222-2222-2222-2222-222222222222', 'active')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, class_id = EXCLUDED.class_id;

-- 10. BUTIR SOAL 4 MODEL TKA (Minimal 3 Soal)
-- Soal 1: Pilihan Ganda Biasa (Single Choice)
INSERT INTO public.questions (
    id, code, subject_id, teacher_id, grade, major_id, question_type, difficulty, points,
    question_text, explanation, status, scoring_method
) VALUES (
    'f1111111-1111-1111-1111-111111111111', 'TJKT-Q01', 'c4444444-4444-4444-4444-444444444444',
    'd2222222-2222-2222-2222-222222222222', 'XI', 'a1111111-1111-1111-1111-111111111111',
    'single_choice', 'medium', 10,
    'Pada arsitektur jaringan berbasis VLAN di lingkungan perkantoran, protokol standar IEEE yang digunakan untuk melakukan penandaan (tagging) frame Ethernet agar lalu lintas antar VLAN dapat melewati satu jalur trunk fisik adalah...',
    'Protokol IEEE 802.1Q merupakan standar industri untuk enkapsulasi VLAN tagging pada frame Ethernet di jalur trunk.',
    'active', 'exact_match'
) ON CONFLICT (code) DO NOTHING;

-- Opsi Soal 1
INSERT INTO public.question_options (question_id, option_key, option_text, is_correct, order_num) VALUES
('f1111111-1111-1111-1111-111111111111', 'A', 'IEEE 802.11ac', false, 1),
('f1111111-1111-1111-1111-111111111111', 'B', 'IEEE 802.3u', false, 2),
('f1111111-1111-1111-1111-111111111111', 'C', 'IEEE 802.1Q', true, 3),
('f1111111-1111-1111-1111-111111111111', 'D', 'IEEE 802.1X', false, 4),
('f1111111-1111-1111-1111-111111111111', 'E', 'IEEE 802.1D', false, 5)
ON CONFLICT (question_id, option_key) DO UPDATE SET is_correct = EXCLUDED.is_correct;

-- Soal 2: Pilihan Ganda Kompleks (Multi-Opsi)
INSERT INTO public.questions (
    id, code, subject_id, teacher_id, grade, major_id, question_type, difficulty, points,
    question_text, explanation, status, scoring_method
) VALUES (
    'f2222222-2222-2222-2222-222222222222', 'TJKT-Q02', 'c4444444-4444-4444-4444-444444444444',
    'd2222222-2222-2222-2222-222222222222', 'XI', 'a1111111-1111-1111-1111-111111111111',
    'complex_choice', 'hard', 10,
    'Seorang teknisi menemukan bahwa klien pada VLAN 20 gagal menerima IP dari server DHCP pusat. Manakah tindakan diagnostik yang valid dan tepat dilakukan? (Pilih semua yang benar)',
    'DHCP Relay agent pada interface VLAN gateway, izin port trunk, dan ketersediaan IP pool adalah penyebab paling umum.',
    'active', 'exact_match'
) ON CONFLICT (code) DO NOTHING;

-- Opsi Soal 2
INSERT INTO public.question_options (question_id, option_key, option_text, is_correct, order_num) VALUES
('f2222222-2222-2222-2222-222222222222', 'A', 'Memeriksa konfigurasi DHCP Relay Agent (IP Helper) pada interface router gateway', true, 1),
('f2222222-2222-2222-2222-222222222222', 'B', 'Memastikan trunk switch mengizinkan (allow) traffic VLAN 20 lewat', true, 2),
('f2222222-2222-2222-2222-222222222222', 'C', 'Menghapus seluruh tabel routing BGP pada border gateway', false, 3),
('f2222222-2222-2222-2222-222222222222', 'D', 'Mengecek ketersediaan IP Address pool yang belum teralokasi pada DHCP Server', true, 4),
('f2222222-2222-2222-2222-222222222222', 'E', 'Memotong kabel fiber optik utama', false, 5)
ON CONFLICT (question_id, option_key) DO UPDATE SET is_correct = EXCLUDED.is_correct;

-- Soal 3: Esai Singkat (Short Essay)
INSERT INTO public.questions (
    id, code, subject_id, teacher_id, grade, major_id, question_type, difficulty, points,
    question_text, explanation, status, scoring_method
) VALUES (
    'f3333333-3333-3333-3333-333333333333', 'TJKT-Q03', 'c4444444-4444-4444-4444-444444444444',
    'd2222222-2222-2222-2222-222222222222', 'XI', 'a1111111-1111-1111-1111-111111111111',
    'essay', 'medium', 10,
    'Jelaskan fungsi Link State Advertisement (LSA) pada protokol routing dinamis OSPF dan bagaimana algoritma Dijkstra SPF menentukan rute terbaik (best path)!',
    'LSA digunakan router untuk mendistribusikan informasi topologi dan cost interface. OSPF menghitung best path berdasarkan cost terendah.',
    'active', 'manual'
) ON CONFLICT (code) DO NOTHING;

-- Jawaban Acuan Esai Soal 3
INSERT INTO public.question_answers (question_id, reference_answer, keywords, sample_rubric) VALUES
(
    'f3333333-3333-3333-3333-333333333333',
    'LSA (Link State Advertisement) adalah paket data berisi status link, interface, dan metric/cost yang dikirimkan oleh setiap router OSPF. Router mengumpulkan LSA dalam LSDB (Link State Database), kemudian menjalankan algoritma Dijkstra Shortest Path First (SPF) untuk menghitung jalur dengan akumulasi total cost terkecil menuju network tujuan.',
    ARRAY['LSA', 'OSPF', 'Dijkstra', 'SPF', 'cost', 'LSDB', 'metric', 'jalur terbaik'],
    'Skor 10 jika menyebutkan definisi LSA, LSDB, dan algoritma Dijkstra/cost terkecil. Skor 5 jika menyebutkan sebagian.'
) ON CONFLICT (question_id) DO UPDATE SET reference_answer = EXCLUDED.reference_answer;

-- Soal 4: Menjodohkan (Matching Pairs)
INSERT INTO public.questions (
    id, code, subject_id, teacher_id, grade, major_id, question_type, difficulty, points,
    question_text, explanation, status, scoring_method
) VALUES (
    'f4444444-4444-4444-4444-444444444444', 'TJKT-Q04', 'c4444444-4444-4444-4444-444444444444',
    'd2222222-2222-2222-2222-222222222222', 'XI', 'a1111111-1111-1111-1111-111111111111',
    'matching', 'medium', 10,
    'Pasangkanlah lapisan OSI Layer pada kolom kiri dengan protokol atau fungsi utamanya yang bersesuaian pada kolom kanan:',
    'Setiap layer OSI memiliki protokol dan fungsi spesifik dalam pengiriman data.',
    'active', 'exact_match'
) ON CONFLICT (code) DO NOTHING;

-- Pasangan Menjodohkan Soal 4
INSERT INTO public.matching_pairs (question_id, left_item, right_item, correct_match_key, order_num) VALUES
('f4444444-4444-4444-4444-444444444444', 'Layer 7 - Application', 'HTTP, DNS, DHCP, SSH', 'pair_1', 1),
('f4444444-4444-4444-4444-444444444444', 'Layer 4 - Transport', 'TCP, UDP, Segmentasi & Port', 'pair_2', 2),
('f4444444-4444-4444-4444-444444444444', 'Layer 3 - Network', 'IP Addressing, Routing, ICMP', 'pair_3', 3),
('f4444444-4444-4444-4444-444444444444', 'Layer 2 - Data Link', 'MAC Address, Switching, 802.1Q', 'pair_4', 4)
ON CONFLICT DO NOTHING;

-- Soal 5: Pilihan Ganda Otomotif TKRO
INSERT INTO public.questions (
    id, code, subject_id, teacher_id, grade, major_id, question_type, difficulty, points,
    question_text, explanation, status, scoring_method
) VALUES (
    'f5555555-5555-5555-5555-555555555555', 'TKRO-Q01', 'c5555555-5555-5555-5555-555555555555',
    'd3333333-3333-3333-3333-333333333333', 'XII', 'a2222222-2222-2222-2222-222222222222',
    'single_choice', 'easy', 10,
    'Pada sistem Electronic Fuel Injection (EFI), sensor yang berfungsi mengukur suhu cairan pendingin mesin untuk menentukan rasio campuran bahan bakar saat start dingin adalah...',
    'ECT (Engine Coolant Temperature) sensor mengirimkan sinyal resistansi termistor ke ECU.',
    'active', 'exact_match'
) ON CONFLICT (code) DO NOTHING;

INSERT INTO public.question_options (question_id, option_key, option_text, is_correct, order_num) VALUES
('f5555555-5555-5555-5555-555555555555', 'A', 'Manifold Absolute Pressure (MAP) Sensor', false, 1),
('f5555555-5555-5555-5555-555555555555', 'B', 'Engine Coolant Temperature (ECT) Sensor', true, 2),
('f5555555-5555-5555-5555-555555555555', 'C', 'Throttle Position Sensor (TPS)', false, 3),
('f5555555-5555-5555-5555-555555555555', 'D', 'Oxygen (O2) Sensor', false, 4),
('f5555555-5555-5555-5555-555555555555', 'E', 'Crankshaft Position Sensor (CKP)', false, 5)
ON CONFLICT (question_id, option_key) DO UPDATE SET is_correct = EXCLUDED.is_correct;

-- Soal 6: Pilihan Ganda Matematika Terapan
INSERT INTO public.questions (
    id, code, subject_id, teacher_id, grade, major_id, question_type, difficulty, points,
    question_text, explanation, status, scoring_method
) VALUES (
    'f6666666-6666-6666-6666-666666666666', 'MTK-Q01', 'c1111111-1111-1111-1111-111111111111',
    'd4444444-4444-4444-4444-444444444444', 'XI', NULL,
    'single_choice', 'easy', 10,
    'Dua buah vektor gaya F1 = (3, 4) N dan F2 = (5, 2) N bekerja pada titik tangkap yang sama. Besar resultan vektor gaya F1 + F2 adalah...',
    'F_total = (3+5, 4+2) = (8, 6). Besar resultan = akar(8^2 + 6^2) = akar(64 + 36) = akar(100) = 10 N.',
    'active', 'exact_match'
) ON CONFLICT (code) DO NOTHING;

INSERT INTO public.question_options (question_id, option_key, option_text, is_correct, order_num) VALUES
('f6666666-6666-6666-6666-666666666666', 'A', '8 N', false, 1),
('f6666666-6666-6666-6666-666666666666', 'B', '10 N', true, 2),
('f6666666-6666-6666-6666-666666666666', 'C', '12 N', false, 3),
('f6666666-6666-6666-6666-666666666666', 'D', '14 N', false, 4),
('f6666666-6666-6666-6666-666666666666', 'E', '16 N', false, 5)
ON CONFLICT (question_id, option_key) DO UPDATE SET is_correct = EXCLUDED.is_correct;

-- 11. PAKET JADWAL UJIAN CBT (Minimal 3 Ujian)
INSERT INTO public.exams (
    id, title, description, subject_id, teacher_id, grade, major_id,
    start_at, end_at, duration_minutes, total_questions, instructions, status,
    randomize_questions, randomize_options, pass_score
) VALUES
(
    'g1111111-1111-1111-1111-111111111111',
    'TKA Asesmen 1 - Administrasi Infrastruktur Jaringan',
    'Ujian kompetensi kejuruan mencakup VLAN 802.1Q, DHCP Relay, OSPF Routing, dan OSI Layer.',
    'c4444444-4444-4444-4444-444444444444', 'd2222222-2222-2222-2222-222222222222', 'XI',
    'a1111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '3 hours', NOW() + INTERVAL '48 hours', 60, 4,
    'Kerjakan dengan cermat. Dilarang membuka tab browser lain selama pengerjaan berlangsung.',
    'open', true, true, 75.00
),
(
    'g2222222-2222-2222-2222-222222222222',
    'TKA Asesmen 1 - Pemeliharaan Mesin Otomotif TKRO',
    'Ujian kompetensi kejuruan pemeliharaan mesin, engine management EFI, dan tune up.',
    'c5555555-5555-5555-5555-555555555555', 'd3333333-3333-3333-3333-333333333333', 'XII',
    'a2222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '2 hours', NOW() + INTERVAL '48 hours', 90, 1,
    'Periksa kembali jawaban sebelum menekan tombol selesaikan ujian.',
    'open', true, true, 75.00
),
(
    'g3333333-3333-3333-3333-333333333333',
    'TKA Bersama - Matematika Terapan Kejuruan Tingkat XI',
    'Asesmen terstandar logika matematika dan kalkulasi vektor teknik.',
    'c1111111-1111-1111-1111-111111111111', 'd4444444-4444-4444-4444-444444444444', 'XI',
    NULL,
    NOW() - INTERVAL '1 hours', NOW() + INTERVAL '72 hours', 60, 1,
    'Siswa diperkenankan menggunakan kertas corat-coret buram.',
    'open', true, true, 75.00
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

-- 12. RELASI KELAS PESERTA UJIAN (Minimal 3 Relasi)
INSERT INTO public.exam_classes (exam_id, class_id) VALUES
('g1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222'), -- Ujian 1 ke XI TJKT 1
('g2222222-2222-2222-2222-222222222222', 'b5555555-5555-5555-5555-555555555555'), -- Ujian 2 ke XII TKRO 1
('g3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222'), -- Ujian 3 ke XI TJKT 1
('g3333333-3333-3333-3333-333333333333', 'b6666666-6666-6666-6666-666666666666')  -- Ujian 3 ke XI AKL 1
ON CONFLICT (exam_id, class_id) DO NOTHING;

-- 13. RELASI BUTIR SOAL UJIAN (Minimal 3 Relasi)
INSERT INTO public.exam_questions (exam_id, question_id, order_num, points, snapshot) VALUES
('g1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 1, 10, '{"type":"single_choice","title":"VLAN 802.1Q"}'::jsonb),
('g1111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222', 2, 10, '{"type":"complex_choice","title":"DHCP Relay Diagnostic"}'::jsonb),
('g1111111-1111-1111-1111-111111111111', 'f3333333-3333-3333-3333-333333333333', 3, 10, '{"type":"essay","title":"OSPF Dijkstra"}'::jsonb),
('g1111111-1111-1111-1111-111111111111', 'f4444444-4444-4444-4444-444444444444', 4, 10, '{"type":"matching","title":"OSI Layer Matching"}'::jsonb),
('g2222222-2222-2222-2222-222222222222', 'f5555555-5555-5555-5555-555555555555', 1, 10, '{"type":"single_choice","title":"ECT Sensor EFI"}'::jsonb),
('g3333333-3333-3333-3333-333333333333', 'f6666666-6666-6666-6666-666666666666', 1, 10, '{"type":"single_choice","title":"Resultan Vektor Gaya"}'::jsonb)
ON CONFLICT (exam_id, question_id) DO NOTHING;

-- 14. DATA HASIL & ATTEMPT PENGERJAAN SISWA (Minimal 3 Sesi Pengerjaan)
INSERT INTO public.exam_attempts (
    id, exam_id, student_id, started_at, deadline_at, submitted_at,
    status, score, total_points, maximum_points, has_pending_essay,
    question_order, option_order, doubtful_questions
) VALUES
-- Sesi Siswa 1: Fajar Pratama (Skor 92.50 / Tuntas)
(
    'h1111111-1111-1111-1111-111111111111',
    'g1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '50 minutes',
    NOW() + INTERVAL '10 minutes',
    NOW() - INTERVAL '5 minutes',
    'submitted', 92.50, 37.00, 40.00, false,
    '["f1111111-1111-1111-1111-111111111111", "f2222222-2222-2222-2222-222222222222", "f3333333-3333-3333-3333-333333333333", "f4444444-4444-4444-4444-444444444444"]'::jsonb,
    '{}'::jsonb,
    '[]'::jsonb
),
-- Sesi Siswa 2: Siti Aisyah Lestari (Skor 97.50 / Tuntas Sangat Baik)
(
    'h2222222-2222-2222-2222-222222222222',
    'g1111111-1111-1111-1111-111111111111',
    'e2222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '55 minutes',
    NOW() + INTERVAL '5 minutes',
    NOW() - INTERVAL '12 minutes',
    'submitted', 97.50, 39.00, 40.00, false,
    '["f1111111-1111-1111-1111-111111111111", "f2222222-2222-2222-2222-222222222222", "f3333333-3333-3333-3333-333333333333", "f4444444-4444-4444-4444-444444444444"]'::jsonb,
    '{}'::jsonb,
    '[]'::jsonb
),
-- Sesi Siswa 3: Rizky Ramadhan (Skor 100.00 / Tuntas)
(
    'h3333333-3333-3333-3333-333333333333',
    'g2222222-2222-2222-2222-222222222222',
    'e3333333-3333-3333-3333-333333333333',
    NOW() - INTERVAL '40 minutes',
    NOW() + INTERVAL '50 minutes',
    NOW() - INTERVAL '15 minutes',
    'submitted', 100.00, 10.00, 10.00, false,
    '["f5555555-5555-5555-5555-555555555555"]'::jsonb,
    '{}'::jsonb,
    '[]'::jsonb
)
ON CONFLICT (exam_id, student_id) DO UPDATE SET score = EXCLUDED.score, status = EXCLUDED.status;

-- 15. DATA JAWABAN BUTIR SOAL SISWA (Minimal 3 Butir Terjawab)
INSERT INTO public.student_answers (
    attempt_id, question_id, answer, is_doubtful, points_earned
) VALUES
-- Jawaban Siswa Fajar untuk Soal 1 (PG Benar)
(
    'h1111111-1111-1111-1111-111111111111',
    'f1111111-1111-1111-1111-111111111111',
    '{"selected_key":"C"}'::jsonb,
    false, 10.00
),
-- Jawaban Siswa Fajar untuk Soal 2 (Kompleks Benar Sebagian/Penuh)
(
    'h1111111-1111-1111-1111-111111111111',
    'f2222222-2222-2222-2222-222222222222',
    '{"selected_keys":["A","B","D"]}'::jsonb,
    false, 10.00
),
-- Jawaban Siswa Fajar untuk Soal 3 (Esai Ternilai)
(
    'h1111111-1111-1111-1111-111111111111',
    'f3333333-3333-3333-3333-333333333333',
    '{"text":"LSA adalah paket informasi link state dalam area OSPF. Setiap router mengumpulkannya di LSDB dan algoritma Dijkstra SPF menghitung jalur metric cost terendah."}'::jsonb,
    false, 8.50
),
-- Jawaban Siswa Fajar untuk Soal 4 (Menjodohkan Benar Sebagian/Penuh)
(
    'h1111111-1111-1111-1111-111111111111',
    'f4444444-4444-4444-4444-444444444444',
    '{"matches":{"pair_1":"HTTP, DNS, DHCP, SSH","pair_2":"TCP, UDP, Segmentasi & Port","pair_3":"IP Addressing, Routing, ICMP","pair_4":"MAC Address, Switching, 802.1Q"}}'::jsonb,
    false, 8.50
),
-- Jawaban Siswa Rizky untuk Soal 5 (PG Otomotif Benar)
(
    'h3333333-3333-3333-3333-333333333333',
    'f5555555-5555-5555-5555-555555555555',
    '{"selected_key":"B"}'::jsonb,
    false, 10.00
)
ON CONFLICT (attempt_id, question_id) DO UPDATE SET points_earned = EXCLUDED.points_earned;

-- Aktifkan kembali trigger integritas data setelah selesai seeding
ALTER TABLE IF EXISTS public.exam_attempts ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.student_answers ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.profiles ENABLE TRIGGER ALL;

