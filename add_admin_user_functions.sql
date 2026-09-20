-- ==============================================================================
-- SKRIP PERBAIKAN TOTAL OTENTIKASI SUPABASE & PEMBUATAN AKUN ADMIN TKA
-- Mengatasi tuntas:
-- 1. Siswa / Guru yang ditambahkan admin di aplikasi TKA TIDAK BISA LOGIN
-- 2. "Invalid login credentials" karena tabel auth.identities belum terisi oleh RPC
-- 3. Akun belum terkonfirmasi otomatis (email_confirmed_at = NOW())
-- 4. Siswa / Guru login dengan NIS atau NIP terhalang RLS anon (Fungsi get_email_by_identifier)
-- 5. Auto-Repair: Menyinkronkan dan memperbaiki semua akun lama yang pernah dibuat admin
-- Jalankan skrip ini langsung di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HAPUS FUNGSI LAMA AGAR TIDAK ADA KONFLIK OVERLOAD PARAMETER
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID[]);
DROP FUNCTION IF EXISTS public.admin_create_user;
DROP FUNCTION IF EXISTS public.admin_reset_user_password;
DROP FUNCTION IF EXISTS public.get_email_by_identifier;

-- ==============================================================================
-- 3. FUNGSI RESOLUSI EMAIL BERDASARKAN NIS / NIP (SECURITY DEFINER untuk Login Bebas RLS)
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

    -- Jika input sudah berupa format email, kembalikan langsung dalam huruf kecil
    IF v_clean_id LIKE '%@%' THEN
        RETURN LOWER(v_clean_id);
    END IF;

    -- 1. Cari berdasarkan NIS di tabel profiles
    SELECT email INTO v_email
    FROM public.profiles
    WHERE nis = v_clean_id OR LOWER(email) = LOWER(v_clean_id)
    LIMIT 1;

    IF v_email IS NOT NULL THEN
        RETURN LOWER(v_email);
    END IF;

    -- 2. Cari berdasarkan NIP di tabel profiles
    SELECT email INTO v_email
    FROM public.profiles
    WHERE nip = v_clean_id
    LIMIT 1;

    IF v_email IS NOT NULL THEN
        RETURN LOWER(v_email);
    END IF;

    -- 3. Cari di tabel students (NIS atau NISN)
    SELECT email INTO v_email
    FROM public.students
    WHERE nis = v_clean_id OR nisn = v_clean_id
    LIMIT 1;

    IF v_email IS NOT NULL THEN
        RETURN LOWER(v_email);
    END IF;

    -- 4. Cari di tabel teachers (NIP)
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

-- Berikan izin akses eksekusi ke anonim (sebelum login) dan terotentikasi
GRANT EXECUTE ON FUNCTION public.get_email_by_identifier(TEXT) TO anon, authenticated, service_role;


-- ==============================================================================
-- 4. FUNGSI UTAMA ADMIN: MEMBUAT / MEMPERBARUI PENGGUNA SISWA ATAU GURU
-- Memasukkan data ke auth.users, auth.identities, profiles, serta tabel students/teachers
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
    p_subject_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_major_id UUID := p_major_id;
    v_class_name TEXT := NULL;
    v_major_name TEXT := NULL;
    v_existing_student_id UUID;
    v_existing_teacher_id UUID;
    v_has_provider_id BOOLEAN;
BEGIN
    -- Validasi data dasar
    IF p_email IS NULL OR trim(p_email) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email wajib diisi.');
    END IF;

    IF p_password IS NULL OR length(trim(p_password)) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kata sandi minimal 6 karakter.');
    END IF;

    p_email := LOWER(trim(p_email));
    p_full_name := trim(p_full_name);
    p_role := LOWER(trim(p_role));

    -- Ambil nama kelas & jurusan jika p_class_id disediakan
    IF p_class_id IS NOT NULL THEN
        SELECT c.name, m.name, COALESCE(v_major_id, c.major_id)
        INTO v_class_name, v_major_name, v_major_id
        FROM public.classes c
        LEFT JOIN public.majors m ON m.id = c.major_id
        WHERE c.id = p_class_id;
    END IF;

    -- 1. Periksa apakah akun sudah ada di auth.users berdasarkan email
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = p_email LIMIT 1;

    IF v_user_id IS NULL THEN
        -- Buat UUID baru untuk user
        v_user_id := gen_random_uuid();

        -- Bersihkan data profil yatim jika ada yang menggunakan email ini dengan ID lain
        DELETE FROM public.profiles WHERE LOWER(email) = p_email;

        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            p_email,
            crypt(p_password, gen_salt('bf')),
            NOW(), -- LANGSUNG DIKONFIRMASI SEHINGGA BISA LOGIN INSTAN
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', p_full_name, 'role', p_role, 'nis', p_nis, 'nip', p_nip),
            NOW(), NOW(), '', '', '', ''
        );
    ELSE
        -- Jika akun sudah ada di auth.users, perbarui kata sandi dan metadata
        UPDATE auth.users 
        SET encrypted_password = crypt(p_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'role', p_role, 'nis', p_nis, 'nip', p_nip),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- 2. WAJIB UNTUK SUPABASE GOTRUE: SINKRONKAN KE auth.identities
    -- Tanpa auth.identities, signInWithPassword akan gagal dengan 'Invalid login credentials'
    BEGIN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
        ) INTO v_has_provider_id;

        -- Hapus identitas email lama milik user ini untuk mencegah konflik constraint
        DELETE FROM auth.identities WHERE user_id = v_user_id AND provider = 'email';

        IF v_has_provider_id THEN
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id,
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                v_user_id::text,
                v_user_id,
                jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
                'email',
                v_user_id::text,
                NOW(), NOW(), NOW()
            );
        ELSE
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider,
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                v_user_id::text,
                v_user_id,
                jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
                'email',
                NOW(), NOW(), NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice saat mengisi auth.identities: %', SQLERRM;
    END;

    -- 3. UPSERT KE public.profiles
    -- Bersihkan jika ada row profil dengan email sama tapi ID beda
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

    -- 4. ENTRI KE TABEL SPESIFIK (students atau teachers)
    IF p_role = 'siswa' THEN
        -- Cari data siswa yang sudah ada berdasarkan email atau NIS
        SELECT id INTO v_existing_student_id 
        FROM public.students 
        WHERE LOWER(email) = p_email OR (p_nis IS NOT NULL AND nis = p_nis)
        LIMIT 1;

        IF v_existing_student_id IS NOT NULL THEN
            UPDATE public.students SET
                user_id = v_user_id,
                full_name = p_full_name,
                email = p_email,
                phone_number = COALESCE(p_phone, phone_number),
                nis = COALESCE(p_nis, nis),
                nisn = COALESCE(p_nisn, nisn),
                class_id = COALESCE(p_class_id, class_id),
                major_id = COALESCE(v_major_id, major_id),
                status = 'active',
                updated_at = NOW()
            WHERE id = v_existing_student_id;
        ELSE
            INSERT INTO public.students (
                id, user_id, nis, nisn, full_name, email, phone_number, class_id, major_id, status, created_at, updated_at
            ) VALUES (
                v_user_id, v_user_id,
                COALESCE(p_nis, 'S-' || substr(v_user_id::text, 1, 6)),
                COALESCE(p_nisn, '00' || substr(v_user_id::text, 1, 8)),
                p_full_name, p_email, p_phone, p_class_id, v_major_id, 'active', NOW(), NOW()
            );
        END IF;

    ELSIF p_role = 'guru' THEN
        -- Cari data guru yang sudah ada berdasarkan email atau NIP
        SELECT id INTO v_existing_teacher_id
        FROM public.teachers
        WHERE LOWER(email) = p_email OR (p_nip IS NOT NULL AND nip = p_nip)
        LIMIT 1;

        IF v_existing_teacher_id IS NOT NULL THEN
            UPDATE public.teachers SET
                user_id = v_user_id,
                full_name = p_full_name,
                email = p_email,
                phone_number = COALESCE(p_phone, phone_number),
                nip = COALESCE(p_nip, nip),
                status = 'active',
                updated_at = NOW()
            WHERE id = v_existing_teacher_id;
        ELSE
            INSERT INTO public.teachers (
                id, user_id, nip, full_name, email, phone_number, status, created_at, updated_at
            ) VALUES (
                v_user_id, v_user_id,
                COALESCE(p_nip, 'G-' || substr(v_user_id::text, 1, 8)),
                p_full_name, p_email, p_phone, 'active', NOW(), NOW()
            );
        END IF;

        -- Update relasi mata pelajaran yang diampu guru
        IF p_subject_ids IS NOT NULL AND array_length(p_subject_ids, 1) > 0 THEN
            DELETE FROM public.teacher_subjects WHERE teacher_id = v_user_id OR teacher_id = v_existing_teacher_id;
            INSERT INTO public.teacher_subjects (teacher_id, subject_id)
            SELECT COALESCE(v_existing_teacher_id, v_user_id), unnest(p_subject_ids)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', p_email,
        'role', p_role,
        'message', 'Akun berhasil dibuat dan langsung aktif.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_user TO anon, authenticated, service_role;


-- ==============================================================================
-- 5. FUNGSI ADMIN: RESET KATA SANDI PENGGUNA (DENGAN SINKRONISASI IDENTITIES)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_identifier TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_has_provider_id BOOLEAN;
BEGIN
    IF p_new_password IS NULL OR length(trim(p_new_password)) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kata sandi baru minimal 6 karakter.');
    END IF;

    p_identifier := trim(p_identifier);

    -- Cari user_id berdasarkan email atau UUID di auth.users
    SELECT id, email INTO v_user_id, v_email FROM auth.users 
    WHERE LOWER(email) = LOWER(p_identifier) OR id::text = p_identifier
    LIMIT 1;

    -- Jika belum ketemu, cari via profiles (NIS atau NIP)
    IF v_user_id IS NULL THEN
        SELECT id, email INTO v_user_id, v_email FROM public.profiles 
        WHERE nis = p_identifier OR nip = p_identifier
        LIMIT 1;
    END IF;

    -- Jika belum ketemu, cari via students (NIS)
    IF v_user_id IS NULL THEN
        SELECT user_id, email INTO v_user_id, v_email FROM public.students
        WHERE nis = p_identifier OR nisn = p_identifier
        LIMIT 1;
    END IF;

    -- Jika belum ketemu, cari via teachers (NIP)
    IF v_user_id IS NULL THEN
        SELECT user_id, email INTO v_user_id, v_email FROM public.teachers
        WHERE nip = p_identifier
        LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Akun tidak ditemukan untuk: ' || p_identifier);
    END IF;

    -- Update kata sandi di auth.users dan pastikan email terkonfirmasi
    UPDATE auth.users 
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Pastikan auth.identities ada
    BEGIN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
        ) INTO v_has_provider_id;

        DELETE FROM auth.identities WHERE user_id = v_user_id AND provider = 'email';

        IF v_has_provider_id THEN
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id,
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                v_user_id::text, v_user_id,
                jsonb_build_object('sub', v_user_id::text, 'email', LOWER(v_email), 'email_verified', true),
                'email', v_user_id::text,
                NOW(), NOW(), NOW()
            );
        ELSE
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider,
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                v_user_id::text, v_user_id,
                jsonb_build_object('sub', v_user_id::text, 'email', LOWER(v_email), 'email_verified', true),
                'email',
                NOW(), NOW(), NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice identities reset: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', v_email,
        'message', 'Kata sandi berhasil diperbarui.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password TO anon, authenticated, service_role;


-- ==============================================================================
-- 6. AUTO-REPAIR SINKRONISASI SEMUA AKUN YANG SUDAH ADA DI DATABASE
-- Skrip ini otomatis mengecek semua akun di auth.users dan memperbaikinya
-- agar langsung memiliki auth.identities, email_confirmed_at, dan profil aktif
-- ==============================================================================
DO $$
DECLARE
    u RECORD;
    v_has_provider_id BOOLEAN;
    v_prof RECORD;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
    ) INTO v_has_provider_id;

    -- 1. Loop perbaiki auth.users dan buatkan auth.identities
    FOR u IN SELECT id, email FROM auth.users WHERE email IS NOT NULL LOOP
        -- Pastikan email_confirmed_at tidak NULL
        UPDATE auth.users 
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
        WHERE id = u.id;

        -- Bersihkan & Masukkan identitas email
        DELETE FROM auth.identities WHERE user_id = u.id AND provider = 'email';

        IF v_has_provider_id THEN
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id,
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                u.id::text, u.id,
                jsonb_build_object('sub', u.id::text, 'email', LOWER(u.email), 'email_verified', true),
                'email', u.id::text,
                NOW(), NOW(), NOW()
            );
        ELSE
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider,
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                u.id::text, u.id,
                jsonb_build_object('sub', u.id::text, 'email', LOWER(u.email), 'email_verified', true),
                'email',
                NOW(), NOW(), NOW()
            );
        END IF;

        -- Sambungkan ke students jika email cocok
        UPDATE public.students SET user_id = u.id WHERE LOWER(email) = LOWER(u.email) AND (user_id IS NULL OR user_id <> u.id);

        -- Sambungkan ke teachers jika email cocok
        UPDATE public.teachers SET user_id = u.id WHERE LOWER(email) = LOWER(u.email) AND (user_id IS NULL OR user_id <> u.id);

        -- Pastikan profiles memiliki NIS/NIP jika ada di tabel students/teachers
        UPDATE public.profiles p
        SET nis = s.nis, nisn = s.nisn
        FROM public.students s
        WHERE p.id = u.id AND LOWER(s.email) = LOWER(u.email) AND p.nis IS NULL;

        UPDATE public.profiles p
        SET nip = t.nip
        FROM public.teachers t
        WHERE p.id = u.id AND LOWER(t.email) = LOWER(u.email) AND p.nip IS NULL;
    END LOOP;

    RAISE NOTICE 'Selesai: Semua akun Supabase Auth dan Identities telah disinkronkan.';
END $$;


-- ==============================================================================
-- 7. FUNGSI RPC: sync_unregistered_logins
-- Menyinkronkan semua siswa, guru, dan admin di tabel database lokal/aplikasi
-- yang belum memiliki akun di auth.users Supabase, sehingga langsung bisa login.
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
    v_has_provider_id BOOLEAN;
    v_new_user_id UUID;
    v_students_synced INT := 0;
    v_teachers_synced INT := 0;
    v_profiles_synced INT := 0;
    v_total_fixed INT := 0;
    s RECORD;
    t RECORD;
    p RECORD;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
    ) INTO v_has_provider_id;

    -- 1. SINKRONKAN SEMUA SISWA DI TABEL students YANG BELUM TERDAFTAR DI auth.users
    FOR s IN 
        SELECT s.id, s.email, s.full_name, s.nis, s.nisn, s.class_id, s.major_id, s.phone_number
        FROM public.students s
        WHERE s.email IS NOT NULL AND trim(s.email) <> ''
          AND NOT EXISTS (
              SELECT 1 FROM auth.users u WHERE LOWER(u.email) = LOWER(trim(s.email))
          )
    LOOP
        v_new_user_id := gen_random_uuid();
        
        -- Insert ke auth.users
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

        -- Insert ke auth.identities
        IF v_has_provider_id THEN
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
            ) VALUES (
                v_new_user_id::text, v_new_user_id,
                jsonb_build_object('sub', v_new_user_id::text, 'email', LOWER(trim(s.email)), 'email_verified', true),
                'email', v_new_user_id::text, NOW(), NOW(), NOW()
            );
        ELSE
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
            ) VALUES (
                v_new_user_id::text, v_new_user_id,
                jsonb_build_object('sub', v_new_user_id::text, 'email', LOWER(trim(s.email)), 'email_verified', true),
                'email', NOW(), NOW(), NOW()
            );
        END IF;

        -- Sinkronkan user_id ke tabel students
        UPDATE public.students SET user_id = v_new_user_id WHERE id = s.id;

        -- Pastikan profiles ada
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

    -- 2. SINKRONKAN SEMUA GURU DI TABEL teachers YANG BELUM TERDAFTAR DI auth.users
    FOR t IN 
        SELECT t.id, t.email, t.full_name, t.nip, t.phone_number
        FROM public.teachers t
        WHERE t.email IS NOT NULL AND trim(t.email) <> ''
          AND NOT EXISTS (
              SELECT 1 FROM auth.users u WHERE LOWER(u.email) = LOWER(trim(t.email))
          )
    LOOP
        v_new_user_id := gen_random_uuid();
        
        -- Insert ke auth.users
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

        -- Insert ke auth.identities
        IF v_has_provider_id THEN
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
            ) VALUES (
                v_new_user_id::text, v_new_user_id,
                jsonb_build_object('sub', v_new_user_id::text, 'email', LOWER(trim(t.email)), 'email_verified', true),
                'email', v_new_user_id::text, NOW(), NOW(), NOW()
            );
        ELSE
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
            ) VALUES (
                v_new_user_id::text, v_new_user_id,
                jsonb_build_object('sub', v_new_user_id::text, 'email', LOWER(trim(t.email)), 'email_verified', true),
                'email', NOW(), NOW(), NOW()
            );
        END IF;

        -- Sinkronkan user_id ke tabel teachers
        UPDATE public.teachers SET user_id = v_new_user_id WHERE id = t.id;

        -- Pastikan profiles ada
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

    -- 3. PERBAIKI SEMUA AKUN YANG SUDAH DI auth.users TAPI IDENTITIES-NYA BELUM LENGKAP
    FOR p IN SELECT id, email FROM auth.users WHERE email IS NOT NULL LOOP
        UPDATE auth.users 
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
        WHERE id = p.id;

        DELETE FROM auth.identities WHERE user_id = p.id AND provider = 'email';

        IF v_has_provider_id THEN
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
            ) VALUES (
                p.id::text, p.id,
                jsonb_build_object('sub', p.id::text, 'email', LOWER(p.email), 'email_verified', true),
                'email', p.id::text, NOW(), NOW(), NOW()
            );
        ELSE
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
            ) VALUES (
                p.id::text, p.id,
                jsonb_build_object('sub', p.id::text, 'email', LOWER(p.email), 'email_verified', true),
                'email', NOW(), NOW(), NOW()
            );
        END IF;

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

GRANT EXECUTE ON FUNCTION public.sync_unregistered_logins TO anon, authenticated, service_role;


-- ==============================================================================
-- 8. FUNGSI RPC: admin_batch_create_users
-- Memproses masal data impor Excel (hingga ratusan pengguna per transaksi)
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
    v_subj_array UUID[];
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_users) LOOP
        BEGIN
            v_role := COALESCE(v_item->>'role', 'siswa');
            v_email := v_item->>'email';
            v_password := COALESCE(v_item->>'password', 'Siswa123!');
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

GRANT EXECUTE ON FUNCTION public.admin_batch_create_users TO anon, authenticated, service_role;
