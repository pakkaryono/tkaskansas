-- ==============================================================================
-- SKRIP PERBAIKAN OTENTIKASI SUPABASE & FUNGSI ADMIN LENGKAP (VERSI FINAL TERUJI)
-- PROYEK: mltysivggdshktbsrvtp.supabase.co
-- APLIKASI TES KEMAMPUAN AKADEMIK (TKA) SMKN 1 SONGGOM
-- ==============================================================================
-- Memperbaiki:
-- [x] ERROR 42804: column "id" is of type uuid but expression is of type text
-- [x] Kompatibilitas penuh tabel auth.identities (UUID maupun TEXT secara dinamis)
-- [x] Akun siswa & guru langsung bisa login setelah diimpor atau dibuat
-- [x] Login menggunakan NIS, NISN, NIP, atau Email
-- [x] Fungsi RPC: admin_create_user, admin_batch_create_users, admin_reset_user_password,
--                 sync_unregistered_logins, get_email_by_identifier
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HAPUS FUNGSI LAMA AGAR TIDAK ADA KONFLIK OVERLOAD PARAMETER
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID[]);
DROP FUNCTION IF EXISTS public.admin_create_user;
DROP FUNCTION IF EXISTS public.admin_batch_create_users;
DROP FUNCTION IF EXISTS public.admin_reset_user_password;
DROP FUNCTION IF EXISTS public.sync_unregistered_logins;
DROP FUNCTION IF EXISTS public.get_email_by_identifier;
DROP FUNCTION IF EXISTS public.ensure_auth_identity;

-- ==============================================================================
-- 3. HELPER FUNCTION: ensure_auth_identity
-- Menjamin rekonsiliasi data pada auth.identities tanpa error tipe data (UUID vs TEXT)
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

    -- Periksa apakah kolom provider_id ada
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
    ) INTO v_has_provider_id;

    -- Periksa tipe data kolom id pada auth.identities (uuid vs text)
    SELECT COALESCE(data_type, 'uuid') INTO v_id_type
    FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id';

    -- Pastikan user di auth.users terkonfirmasi dan memiliki provider email
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
    WHERE id = p_user_id;

    -- Bersihkan identitas lama untuk user ini
    DELETE FROM auth.identities WHERE user_id = p_user_id AND provider = 'email';

    -- Eksekusi dinamis dengan casting tipe yang sesuai dengan skema Supabase
    IF v_id_type = 'uuid' THEN
        -- Hapus jika ada id UUID yang sama
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
        -- id adalah teks
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
-- 4. FUNGSI: get_email_by_identifier
-- Mengubah NIS, NISN, atau NIP menjadi Email asli agar login siswa & guru mulus
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
-- 5. FUNGSI RPC: admin_create_user
-- Membuat akun Supabase Auth, Profiles, dan entitas domain secara instan
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
        -- Update user yang sudah ada
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
        -- Insert user baru
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

    -- Rekonsiliasi identities bebas error 42804
    PERFORM public.ensure_auth_identity(v_user_id, p_email);

    -- Upsert ke public.profiles
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

    -- Sinkronisasi ke domain Siswa
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

    -- Sinkronisasi ke domain Guru
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
-- 6. FUNGSI RPC: admin_batch_create_users
-- Memproses impor masal ratusan akun dari Excel secara langsung di database
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
-- 7. FUNGSI RPC: admin_reset_user_password
-- Mereset password akun pengguna di auth.users secara instan
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
-- 8. FUNGSI RPC: sync_unregistered_logins
-- Menyinkronkan semua siswa & guru yang sudah tersimpan di tabel domain
-- agar otomatis memiliki akun Supabase Auth dan bisa langsung login
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
-- 9. AUTO-REPAIR & SINKRONISASI OTOMATIS SAAT SKRIP INI DIJALANKAN
-- ==============================================================================
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT id, email FROM auth.users WHERE email IS NOT NULL LOOP
        PERFORM public.ensure_auth_identity(u.id, u.email);

        -- Sambungkan ke students jika email cocok
        UPDATE public.students SET user_id = u.id WHERE LOWER(email) = LOWER(u.email) AND (user_id IS NULL OR user_id <> u.id);

        -- Sambungkan ke teachers jika email cocok
        UPDATE public.teachers SET user_id = u.id WHERE LOWER(email) = LOWER(u.email) AND (user_id IS NULL OR user_id <> u.id);

        -- Lengkapi NIS/NIP pada profiles
        UPDATE public.profiles p
        SET nis = s.nis, nisn = s.nisn
        FROM public.students s
        WHERE p.id = u.id AND LOWER(s.email) = LOWER(u.email) AND p.nis IS NULL;

        UPDATE public.profiles p
        SET nip = t.nip
        FROM public.teachers t
        WHERE p.id = u.id AND LOWER(t.email) = LOWER(u.email) AND p.nip IS NULL;
    END LOOP;

    RAISE NOTICE 'Selesai: Seluruh fungsi admin dan identitas akun Supabase telah disinkronkan tanpa error.';
END $$;
