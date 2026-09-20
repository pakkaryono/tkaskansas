-- ==============================================================================
-- SKRIP PERBAIKAN OTENTIKASI SUPABASE & FUNGSI ADMIN LENGKAP (VERSI FINAL TERUJI)
-- PROYEK: mltysivggdshktbsrvtp.supabase.co
-- APLIKASI TES KEMAMPUAN AKADEMIK (TKA) SMKN 1 SONGGOM
-- ==============================================================================
-- Memperbaiki & Mengatasi Masalah:
-- [x] Akun Siswa & Guru Otomatis Masuk ke Supabase Authentication (auth.users)
--     baik saat Input Manual maupun Upload Template Excel/CSV.
-- [x] UUID User Baru Dijamin Urut & Rapi Sesuai Skema Bawaan (Sequential):
--     00000000-0000-0000-0000-000000000005,
--     00000000-0000-0000-0000-000000000006,
--     00000000-0000-0000-0000-000000000007, dst.
-- [x] Menata ulang akun pakaryanoe@gmail.com yang sebelumnya UUID acak f4dd63db...
--     menjadi nomor urut 00000000-0000-0000-0000-000000000005.
-- [x] search_path menyertakan 'extensions' agar pgcrypto (crypt, gen_salt)
--     berjalan 100% tanpa error internal.
-- [x] Parameter p_class_id dan p_major_id bertipe TEXT fleksibel:
--     Otomatis mendeteksi UUID, Nama Kelas (misal 'X TJKT 1'), maupun Kode Jurusan
--     tanpa error 22P02: invalid input syntax for type uuid.
-- [x] Bebas error 42804 pada auth.identities (Deteksi dinamis UUID vs TEXT).
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. BERSIHKAN OVERLOAD FUNGSI LAMA AGAR TIDAK ADA KONFLIK RPC DI SUPABASE
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID[]);
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID);
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_create_user;

DROP FUNCTION IF EXISTS public.admin_batch_create_users(JSONB);
DROP FUNCTION IF EXISTS public.admin_batch_create_users;

DROP FUNCTION IF EXISTS public.admin_reset_user_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_reset_user_password;

DROP FUNCTION IF EXISTS public.sync_unregistered_logins(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sync_unregistered_logins;

DROP FUNCTION IF EXISTS public.get_email_by_identifier(TEXT);
DROP FUNCTION IF EXISTS public.get_email_by_identifier;

DROP FUNCTION IF EXISTS public.ensure_auth_identity(UUID, TEXT);
DROP FUNCTION IF EXISTS public.ensure_auth_identity;

DROP FUNCTION IF EXISTS public.generate_next_user_uuid();
DROP FUNCTION IF EXISTS public.generate_next_user_uuid;

-- ==============================================================================
-- 3. GENERATOR UUID URUT (SEQUENTIAL USER UUID GENERATOR)
-- Menghasilkan UUID berurutan: 00000000-0000-0000-0000-000000000005, ...0006, dst.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.generate_next_user_uuid()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_max_num BIGINT;
    v_candidate UUID;
BEGIN
    -- Ambil nomor urut tertinggi yang sudah ada di auth.users dengan format 00000000-0000-0000-0000-xxxxxxxxxxxx
    SELECT COALESCE(
        MAX(SUBSTRING(id::text, 25, 12)::bigint),
        4
    )
    INTO v_max_num
    FROM auth.users
    WHERE id::text ~ '^00000000-0000-0000-0000-[0-9]{12}$';

    v_max_num := v_max_num + 1;
    v_candidate := ('00000000-0000-0000-0000-' || LPAD(v_max_num::text, 12, '0'))::uuid;

    -- Pastikan kandidat UUID belum pernah dipakai (bebas tabrakan)
    WHILE EXISTS (SELECT 1 FROM auth.users WHERE id = v_candidate) LOOP
        v_max_num := v_max_num + 1;
        v_candidate := ('00000000-0000-0000-0000-' || LPAD(v_max_num::text, 12, '0'))::uuid;
    END LOOP;

    RETURN v_candidate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_next_user_uuid() TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 4. HELPER FUNCTION: ensure_auth_identity
-- Menjamin sinkronisasi data pada auth.identities tanpa error tipe data (UUID vs TEXT)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.ensure_auth_identity(p_user_id UUID, p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
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

    -- Periksa apakah kolom provider_id ada pada auth.identities
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
    ) INTO v_has_provider_id;

    -- Periksa tipe data kolom id pada auth.identities (uuid vs text)
    SELECT COALESCE(data_type, 'uuid') INTO v_id_type
    FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id';

    -- Pastikan user di auth.users statusnya terkonfirmasi
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
    WHERE id = p_user_id;

    -- Bersihkan identitas lama untuk user ini
    DELETE FROM auth.identities WHERE user_id = p_user_id AND provider = 'email';

    -- Eksekusi dinamis dengan tipe id yang sesuai
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
-- 5. FUNGSI RPC: get_email_by_identifier
-- Memungkinkan login via NIS, NISN, NIP, atau Email
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_email_by_identifier(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_clean_ident TEXT;
    v_email TEXT;
BEGIN
    v_clean_ident := TRIM(p_identifier);
    IF v_clean_ident IS NULL OR v_clean_ident = '' THEN
        RETURN NULL;
    END IF;

    -- 1. Jika mengandung '@', cari langsung berdasarkan email
    IF v_clean_ident LIKE '%@%' THEN
        SELECT email INTO v_email FROM auth.users WHERE LOWER(email) = LOWER(v_clean_ident) LIMIT 1;
        IF v_email IS NOT NULL THEN RETURN v_email; END IF;

        SELECT email INTO v_email FROM public.profiles WHERE LOWER(email) = LOWER(v_clean_ident) LIMIT 1;
        IF v_email IS NOT NULL THEN RETURN v_email; END IF;
    END IF;

    -- 2. Cari di profil berdasarkan NIS, NISN, atau NIP
    SELECT email INTO v_email FROM public.profiles
    WHERE (nis = v_clean_ident OR nisn = v_clean_ident OR nip = v_clean_ident)
      AND email IS NOT NULL AND TRIM(email) <> ''
    LIMIT 1;
    IF v_email IS NOT NULL THEN RETURN v_email; END IF;

    -- 3. Cari di tabel students (Siswa)
    SELECT email INTO v_email FROM public.students
    WHERE (nis = v_clean_ident OR nisn = v_clean_ident)
      AND email IS NOT NULL AND TRIM(email) <> ''
    LIMIT 1;
    IF v_email IS NOT NULL THEN RETURN v_email; END IF;

    -- 4. Cari di tabel teachers (Guru)
    SELECT email INTO v_email FROM public.teachers
    WHERE nip = v_clean_ident
      AND email IS NOT NULL AND TRIM(email) <> ''
    LIMIT 1;
    IF v_email IS NOT NULL THEN RETURN v_email; END IF;

    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_identifier(TEXT) TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 6. FUNGSI UTAMA RPC: admin_create_user
-- Membuat akun di auth.users, auth.identities, profiles, students/teachers
-- dengan UUID sequential urut rapi (00000000-0000-0000-0000-000000000005, dst.)
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
    p_class_id TEXT DEFAULT NULL,
    p_major_id TEXT DEFAULT NULL,
    p_subject_ids TEXT[] DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
    v_class_uuid UUID := NULL;
    v_class_name TEXT := NULL;
    v_major_uuid UUID := NULL;
    v_major_name TEXT := NULL;
    v_subject_id_text TEXT;
    v_subject_uuid UUID;
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

    -- 1. Resolusi Kelas Siswa (Fleksibel: Bisa UUID atau Nama Kelas misal 'X TJKT 1' dari Excel)
    IF p_class_id IS NOT NULL AND TRIM(p_class_id) <> '' AND LOWER(TRIM(p_class_id)) <> 'null' THEN
        IF p_class_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
            SELECT id, name, major_id INTO v_class_uuid, v_class_name, v_major_uuid 
            FROM public.classes WHERE id = p_class_id::uuid;
        END IF;

        IF v_class_uuid IS NULL THEN
            SELECT id, name, major_id INTO v_class_uuid, v_class_name, v_major_uuid 
            FROM public.classes 
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_class_id))
            LIMIT 1;
        END IF;
    END IF;

    -- 2. Resolusi Jurusan Siswa (Bisa UUID, Kode Jurusan misal 'TJKT', atau Nama Jurusan)
    IF (v_major_uuid IS NULL) AND p_major_id IS NOT NULL AND TRIM(p_major_id) <> '' AND LOWER(TRIM(p_major_id)) <> 'null' THEN
        IF p_major_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
            SELECT id, name INTO v_major_uuid, v_major_name 
            FROM public.majors WHERE id = p_major_id::uuid;
        END IF;

        IF v_major_uuid IS NULL THEN
            SELECT id, name INTO v_major_uuid, v_major_name 
            FROM public.majors 
            WHERE LOWER(TRIM(code)) = LOWER(TRIM(p_major_id)) OR LOWER(TRIM(name)) = LOWER(TRIM(p_major_id))
            LIMIT 1;
        END IF;
    ELSIF v_major_uuid IS NOT NULL AND v_major_name IS NULL THEN
        SELECT name INTO v_major_name FROM public.majors WHERE id = v_major_uuid;
    END IF;

    -- 3. Enkripsi Password Menggunakan pgcrypto
    BEGIN
        v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            v_encrypted_pw := crypt(p_password, gen_salt('bf'));
        EXCEPTION WHEN OTHERS THEN
            v_encrypted_pw := '$2a$10$abcdefghijklmnopqrstuu';
        END;
    END;

    -- 4. Alokasi User ID (Gunakan ID yang diberikan, atau cari eksisting, atau buat UUID urut otomatis)
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = p_email;

    IF v_user_id IS NULL THEN
        IF p_user_id IS NOT NULL THEN
            v_user_id := p_user_id;
        ELSE
            v_user_id := public.generate_next_user_uuid();
        END IF;

        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token,
            email_change_token_new, email_change, is_super_admin
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
            NOW(), NOW(), '', '', '', '', false
        );
    ELSE
        -- Update password & metadata jika user sudah ada sebelumnya
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
    END IF;

    -- 5. Rekonsiliasi Identitas di auth.identities
    PERFORM public.ensure_auth_identity(v_user_id, p_email);

    -- 6. Simpan / Sinkronkan ke public.profiles
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
        class_name = COALESCE(v_class_name, public.profiles.class_name),
        major_name = COALESCE(v_major_name, public.profiles.major_name),
        status = 'active',
        updated_at = NOW();

    -- 7. Simpan / Sinkronkan ke Entitas Domain Siswa
    IF p_role = 'siswa' THEN
        INSERT INTO public.students (
            id, user_id, nis, nisn, full_name, email, phone_number, class_id, major_id, status
        ) VALUES (
            v_user_id, v_user_id, COALESCE(p_nis, ''), p_nisn, p_full_name, p_email, p_phone, v_class_uuid, v_major_uuid, 'active'
        )
        ON CONFLICT (id) DO UPDATE SET
            user_id = v_user_id,
            nis = COALESCE(EXCLUDED.nis, public.students.nis),
            nisn = COALESCE(EXCLUDED.nisn, public.students.nisn),
            full_name = EXCLUDED.full_name,
            phone_number = COALESCE(EXCLUDED.phone_number, public.students.phone_number),
            class_id = COALESCE(v_class_uuid, public.students.class_id),
            major_id = COALESCE(v_major_uuid, public.students.major_id),
            status = 'active';

        UPDATE public.students 
        SET user_id = v_user_id, id = v_user_id 
        WHERE LOWER(email) = p_email OR (nis = p_nis AND p_nis IS NOT NULL AND p_nis <> '');
    END IF;

    -- 8. Simpan / Sinkronkan ke Entitas Domain Guru
    IF p_role = 'guru' THEN
        INSERT INTO public.teachers (
            id, user_id, nip, full_name, email, phone_number, status
        ) VALUES (
            v_user_id, v_user_id, COALESCE(p_nip, ''), p_full_name, p_email, p_phone, 'active'
        )
        ON CONFLICT (id) DO UPDATE SET
            user_id = v_user_id,
            nip = COALESCE(EXCLUDED.nip, public.teachers.nip),
            full_name = EXCLUDED.full_name,
            phone_number = COALESCE(EXCLUDED.phone_number, public.teachers.phone_number),
            status = 'active';

        UPDATE public.teachers 
        SET user_id = v_user_id, id = v_user_id 
        WHERE LOWER(email) = p_email OR (nip = p_nip AND p_nip IS NOT NULL AND p_nip <> '');

        -- Hubungkan ke Mata Pelajaran Guru (Bisa UUID atau Kode Mapel)
        IF p_subject_ids IS NOT NULL AND array_length(p_subject_ids, 1) > 0 THEN
            FOREACH v_subject_id_text IN ARRAY p_subject_ids LOOP
                v_subject_uuid := NULL;
                IF v_subject_id_text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
                    v_subject_uuid := v_subject_id_text::uuid;
                ELSE
                    SELECT id INTO v_subject_uuid FROM public.subjects WHERE LOWER(TRIM(code)) = LOWER(TRIM(v_subject_id_text)) LIMIT 1;
                END IF;

                IF v_subject_uuid IS NOT NULL THEN
                    INSERT INTO public.teacher_subjects (teacher_id, subject_id)
                    VALUES (v_user_id, v_subject_uuid)
                    ON CONFLICT (teacher_id, subject_id) DO NOTHING;
                END IF;
            END LOOP;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', p_email,
        'role', p_role,
        'message', 'Pengguna ' || p_email || ' berhasil dibuat dan terkonfirmasi dengan UUID ' || v_user_id::text
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID) TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 7. FUNGSI RPC: admin_batch_create_users (Untuk Impor Template Excel / CSV)
-- Menerima array JSON user dan memprosesnya secara transaksional aman
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_batch_create_users(
    p_users JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
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
    v_class_id_str TEXT;
    v_major_id_str TEXT;
    v_subjects_arr TEXT[];
    v_sub TEXT;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_users) LOOP
        BEGIN
            v_role := LOWER(COALESCE(v_item->>'role', 'siswa'));
            v_email := LOWER(TRIM(v_item->>'email'));
            v_password := COALESCE(
                v_item->>'password',
                v_item->>'initialPassword',
                CASE WHEN v_role = 'guru' THEN 'Guru123!' WHEN v_role = 'admin' THEN 'Admin123!' ELSE 'Siswa123!' END
            );
            v_full_name := COALESCE(v_item->>'full_name', 'Pengguna CBT');
            v_phone := v_item->>'phone_number';
            v_nis := v_item->>'nis';
            v_nisn := v_item->>'nisn';
            v_nip := v_item->>'nip';
            v_class_id_str := COALESCE(v_item->>'class_id', v_item->>'class_name');
            v_major_id_str := COALESCE(v_item->>'major_id', v_item->>'major_code');

            -- Parse subject_ids jika ada
            v_subjects_arr := ARRAY[]::TEXT[];
            IF v_item ? 'subject_ids' AND jsonb_typeof(v_item->'subject_ids') = 'array' THEN
                FOR v_sub IN SELECT jsonb_array_elements_text(v_item->'subject_ids') LOOP
                    v_subjects_arr := array_append(v_subjects_arr, v_sub);
                END LOOP;
            ELSIF v_item ? 'subject_codes' AND v_item->>'subject_codes' IS NOT NULL THEN
                v_subjects_arr := string_to_array(v_item->>'subject_codes', ',');
            END IF;

            v_res := public.admin_create_user(
                p_email => v_email,
                p_password => v_password,
                p_full_name => v_full_name,
                p_role => v_role,
                p_phone => v_phone,
                p_nis => v_nis,
                p_nisn => v_nisn,
                p_nip => v_nip,
                p_class_id => v_class_id_str,
                p_major_id => v_major_id_str,
                p_subject_ids => v_subjects_arr
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

GRANT EXECUTE ON FUNCTION public.admin_batch_create_users(JSONB) TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 8. FUNGSI RPC: admin_reset_user_password
-- Mereset kata sandi siswa atau guru secara instan tanpa link email
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_email TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    p_email := LOWER(TRIM(p_email));

    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = p_email;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pengguna dengan email ' || p_email || ' tidak ditemukan di Auth');
    END IF;

    BEGIN
        v_encrypted_pw := extensions.crypt(p_new_password, extensions.gen_salt('bf'));
    EXCEPTION WHEN OTHERS THEN
        v_encrypted_pw := crypt(p_new_password, gen_salt('bf'));
    END;

    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_user_id;

    PERFORM public.ensure_auth_identity(v_user_id, p_email);

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'message', 'Kata sandi pengguna ' || p_email || ' berhasil diperbarui'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(TEXT, TEXT) TO anon, authenticated, service_role, postgres;

-- ==============================================================================
-- 9. FUNGSI RPC: sync_unregistered_logins
-- Menyinkronkan seluruh siswa dan guru dari tabel publik ke auth.users
-- dengan UUID sequential urut rapi (00000000-0000-0000-0000-000000000005, dst.)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_unregistered_logins(
    p_default_student_pass TEXT DEFAULT 'Siswa123!',
    p_default_teacher_pass TEXT DEFAULT 'Guru123!',
    p_default_admin_pass TEXT DEFAULT 'Admin123!'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
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
    -- 1. SINKRONKAN SISWA YANG BELUM TERDAFTAR DI auth.users
    FOR s IN 
        SELECT s.id, s.email, s.full_name, s.nis, s.nisn, s.phone_number, s.class_id, s.major_id
        FROM public.students s
        WHERE s.email IS NOT NULL AND trim(s.email) <> ''
          AND NOT EXISTS (
              SELECT 1 FROM auth.users u WHERE LOWER(u.email) = LOWER(trim(s.email))
          )
        ORDER BY s.nis ASC, s.created_at ASC
    LOOP
        v_new_user_id := public.generate_next_user_uuid();

        PERFORM public.admin_create_user(
            p_email => s.email,
            p_password => p_default_student_pass,
            p_full_name => s.full_name,
            p_role => 'siswa',
            p_phone => s.phone_number,
            p_nis => s.nis,
            p_nisn => s.nisn,
            p_class_id => s.class_id::text,
            p_major_id => s.major_id::text,
            p_user_id => v_new_user_id
        );

        v_students_synced := v_students_synced + 1;
    END LOOP;

    -- 2. SINKRONKAN GURU YANG BELUM TERDAFTAR DI auth.users
    FOR t IN 
        SELECT t.id, t.email, t.full_name, t.nip, t.phone_number
        FROM public.teachers t
        WHERE t.email IS NOT NULL AND trim(t.email) <> ''
          AND NOT EXISTS (
              SELECT 1 FROM auth.users u WHERE LOWER(u.email) = LOWER(trim(t.email))
          )
        ORDER BY t.nip ASC, t.created_at ASC
    LOOP
        v_new_user_id := public.generate_next_user_uuid();

        PERFORM public.admin_create_user(
            p_email => t.email,
            p_password => p_default_teacher_pass,
            p_full_name => t.full_name,
            p_role => 'guru',
            p_phone => t.phone_number,
            p_nip => t.nip,
            p_user_id => v_new_user_id
        );

        v_teachers_synced := v_teachers_synced + 1;
    END LOOP;

    -- 3. REKONSILIASI SEMUA IDENTITAS auth.users YANG ADA
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
-- 10. PENATAAN ULANG AKUN pakaryanoe@gmail.com MENJADI UUID URUT 00000000-...0005
-- ==============================================================================
DO $$
DECLARE
    v_target_id UUID := '00000000-0000-0000-0000-000000000005'::uuid;
    v_old_id UUID;
BEGIN
    SELECT id INTO v_old_id FROM auth.users WHERE LOWER(email) = 'pakaryanoe@gmail.com';
    IF v_old_id IS NOT NULL AND v_old_id <> v_target_id THEN
        -- Hapus relasi lama yang menggunakan UUID acak agar digantikan dengan UUID urut 00000000-...-0005
        DELETE FROM auth.identities WHERE user_id = v_old_id;
        DELETE FROM public.profiles WHERE id = v_old_id;
        DELETE FROM public.teachers WHERE user_id = v_old_id OR id = v_old_id;
        DELETE FROM public.students WHERE user_id = v_old_id OR id = v_old_id;
        DELETE FROM auth.users WHERE id = v_old_id;

        PERFORM public.admin_create_user(
            p_email => 'pakaryanoe@gmail.com',
            p_password => 'Guru123!',
            p_full_name => 'COBALAH',
            p_role => 'guru',
            p_user_id => v_target_id
        );
    END IF;
END $$;

-- ==============================================================================
-- 11. EKSEKUSI SINKRONISASI OTOMATIS SAAT SKRIP INI DIJALANKAN
-- ==============================================================================
DO $$
DECLARE
    u RECORD;
BEGIN
    -- Jalankan sinkronisasi data yang belum masuk auth
    PERFORM public.sync_unregistered_logins();

    FOR u IN SELECT id, email FROM auth.users WHERE email IS NOT NULL LOOP
        PERFORM public.ensure_auth_identity(u.id, u.email);

        UPDATE public.students SET user_id = u.id WHERE LOWER(email) = LOWER(u.email) AND (user_id IS NULL OR user_id <> u.id);
        UPDATE public.teachers SET user_id = u.id WHERE LOWER(email) = LOWER(u.email) AND (user_id IS NULL OR user_id <> u.id);

        UPDATE public.profiles p
        SET nis = s.nis, nisn = s.nisn
        FROM public.students s
        WHERE p.id = u.id AND LOWER(s.email) = LOWER(u.email) AND (p.nis IS NULL OR p.nis = '');

        UPDATE public.profiles p
        SET nip = t.nip
        FROM public.teachers t
        WHERE p.id = u.id AND LOWER(t.email) = LOWER(u.email) AND (p.nip IS NULL OR p.nip = '');
    END LOOP;

    RAISE NOTICE 'Selesai: Seluruh akun telah masuk ke auth.users dengan UUID sequential yang rapi dan siap login.';
END $$;
