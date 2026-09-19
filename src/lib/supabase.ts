import { createClient } from '@supabase/supabase-js';
import type { UserProfile, UserRole } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mltysivggdshktbsrvtp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sdHlzaXZnZ2RzaGt0YnNydnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNjUyMDQsImV4cCI6MjEwNDk0MTIwNH0.42l9bZKjwIuKt00PuGWHJMp842qwBbEygv5jJOBFOrI';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here'
);

// Inisialisasi Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Client terisolasi tanpa persistensi sesi lokal (digunakan saat admin membuat akun siswa/guru baru)
export const createIsolatedAuthClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

// AKUN SEED / DEMO UNTUK PENGUJIAN INSTAN TKA
export const DEMO_USERS: Record<UserRole, { email: string; password: string; profile: UserProfile }> = {
  admin: {
    email: 'admin@smk.id',
    password: 'AdminTKA2026!',
    profile: {
      id: 'd1111111-1111-1111-1111-111111111111',
      email: 'admin@smk.id',
      full_name: 'M. Karyono, S.Kom. (Admin)',
      role: 'admin',
      phone_number: '0812-3456-7890',
      status: 'active',
      created_at: '2026-09-01T08:00:00Z',
    },
  },
  guru: {
    email: 'guru@smk.id',
    password: 'GuruTKA2026!',
    profile: {
      id: 'd2222222-2222-2222-2222-222222222222',
      email: 'guru@smk.id',
      full_name: 'Siti Aminah, S.Kom., Gr.',
      role: 'guru',
      nip: '198803152014022003',
      phone_number: '0857-1122-3344',
      subjects_taught: ['Administrasi Infrastruktur Jaringan', 'Dasar-Dasar Kejuruan TJKT'],
      status: 'active',
      created_at: '2026-09-02T08:00:00Z',
    },
  },
  siswa: {
    email: 'siswa@smk.id',
    password: 'SiswaTKA2026!',
    profile: {
      id: 'e1111111-1111-1111-1111-111111111111',
      email: 'siswa@smk.id',
      full_name: 'Muhammad Rizky Ramadhan',
      role: 'siswa',
      nis: '20241088',
      nisn: '0078129931',
      class_name: 'XI TJKT 1',
      major_name: 'Teknik Jaringan Komputer dan Telekomunikasi',
      phone_number: '0896-9988-7766',
      status: 'active',
      created_at: '2026-09-03T08:00:00Z',
    },
  },
};
