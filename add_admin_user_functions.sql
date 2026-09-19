-- ==============================================================================
-- FUNGSI ADMINISTRATOR TKA: MEMBUAT DAN MERESET AKUN SISWA & GURU LANGSUNG
-- Jalankan skrip ini di Supabase SQL Editor untuk mengaktifkan pembuatan user
-- tanpa batasan rate limit email dan langsung aktif (email_confirmed_at = NOW())
-- ==============================================================================

-- 1. FUNGSI ADMIN: BUAT ATAU PERBARUI PENGGUNA SISWA / GURU (SECURITY DEFINER)
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
AS $$
DECLARE
    v_user_id UUID;
    v_major_id UUID := p_major_id;
    v_class_name TEXT := NULL;
    v_major_name TEXT := NULL;
BEGIN
    -- Validasi input dasar
    IF p_email IS NULL OR p_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email tidak boleh kosong');
    END IF;

    IF p_password IS NULL OR length(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kata sandi minimal 6 karakter');
    END IF;

    -- Ambil nama kelas & jurusan jika ada class_id
    IF p_class_id IS NOT NULL THEN
        SELECT c.name, m.name, c.major_id 
        INTO v_class_name, v_major_name, v_major_id
        FROM public.classes c
        LEFT JOIN public.majors m ON m.id = c.major_id
        WHERE c.id = p_class_id;
    END IF;

    -- 1. Cek apakah pengguna sudah terdaftar di auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(p_email);

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            LOWER(p_email),
            crypt(p_password, gen_salt('bf')),
            NOW(), -- Langsung dikonfirmasi tanpa perlu kirim email verifikasi
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', p_full_name, 'role', p_role, 'nis', p_nis, 'nip', p_nip),
            NOW(), NOW(), '', '', '', ''
        );
    ELSE
        -- Jika sudah ada, update password dan konfirmasi
        UPDATE auth.users 
        SET encrypted_password = crypt(p_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'role', p_role, 'nis', p_nis, 'nip', p_nip),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- 2. Upsert ke public.profiles
    INSERT INTO public.profiles (
        id, email, full_name, role, phone_number,
        nis, nisn, nip, class_name, major_name, status, updated_at
    ) VALUES (
        v_user_id, LOWER(p_email), p_full_name, p_role, p_phone,
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

    -- 3. Entri ke tabel peran spesifik (students atau teachers)
    IF p_role = 'siswa' THEN
        INSERT INTO public.students (
            id, user_id, nis, nisn, full_name, email, phone_number, class_id, major_id, status
        ) VALUES (
            v_user_id, v_user_id, COALESCE(p_nis, 'S-' || substr(v_user_id::text, 1, 6)),
            COALESCE(p_nisn, '00' || substr(v_user_id::text, 1, 8)),
            p_full_name, LOWER(p_email), p_phone, p_class_id, v_major_id, 'active'
        )
        ON CONFLICT (id) DO UPDATE SET
            user_id = v_user_id,
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            class_id = COALESCE(EXCLUDED.class_id, public.students.class_id),
            major_id = COALESCE(EXCLUDED.major_id, public.students.major_id),
            phone_number = COALESCE(EXCLUDED.phone_number, public.students.phone_number),
            status = 'active';

        -- Jika ada baris student dengan email yang sama tapi ID beda, perbarui user_id
        UPDATE public.students SET user_id = v_user_id WHERE LOWER(email) = LOWER(p_email) AND id <> v_user_id;

    ELSIF p_role = 'guru' THEN
        INSERT INTO public.teachers (
            id, user_id, nip, full_name, email, phone_number, status
        ) VALUES (
            v_user_id, v_user_id, COALESCE(p_nip, 'G-' || substr(v_user_id::text, 1, 8)),
            p_full_name, LOWER(p_email), p_phone, 'active'
        )
        ON CONFLICT (id) DO UPDATE SET
            user_id = v_user_id,
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            phone_number = COALESCE(EXCLUDED.phone_number, public.teachers.phone_number),
            status = 'active';

        -- Update teacher_subjects jika ada
        IF p_subject_ids IS NOT NULL AND array_length(p_subject_ids, 1) > 0 THEN
            DELETE FROM public.teacher_subjects WHERE teacher_id = v_user_id;
            INSERT INTO public.teacher_subjects (teacher_id, subject_id)
            SELECT v_user_id, unnest(p_subject_ids)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', LOWER(p_email),
        'role', p_role
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. FUNGSI ADMIN: RESET KATA SANDI SECARA LANGSUNG
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_identifier TEXT, -- Email, NIS, NIP, atau User ID
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
BEGIN
    IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kata sandi baru minimal 6 karakter');
    END IF;

    -- Cari user_id berdasarkan email atau UUID
    SELECT id, email INTO v_user_id, v_email FROM auth.users 
    WHERE LOWER(email) = LOWER(p_identifier) OR id::text = p_identifier
    LIMIT 1;

    -- Jika belum ketemu, cari via profiles berdasarkan NIS atau NIP
    IF v_user_id IS NULL THEN
        SELECT id, email INTO v_user_id, v_email FROM public.profiles 
        WHERE nis = p_identifier OR nip = p_identifier
        LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Akun tidak ditemukan untuk: ' || p_identifier);
    END IF;

    -- Update kata sandi langsung di auth.users
    UPDATE auth.users 
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', v_email,
        'message', 'Kata sandi berhasil diperbarui'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Berikan izin akses eksekusi ke anon dan authenticated
GRANT EXECUTE ON FUNCTION public.admin_create_user TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password TO anon, authenticated, service_role;
