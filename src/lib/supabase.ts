import { createClient } from '@supabase/supabase-js';
import type { UserProfile, UserRole } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here'
);

// Inisialisasi Supabase client (jika belum diset, berikan dummy fallback agar tidak crash saat import)
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// AKUN SEED / DEMO UNTUK PENGUJIAN INSTAN FASE 1
export const DEMO_USERS: Record<UserRole, { email: string; password: string; profile: UserProfile }> = {
  admin: {
    email: 'admin@smk.id',
    password: 'password123',
    profile: {
      id: 'demo-admin-uuid-001',
      email: 'admin@smk.id',
      full_name: 'Drs. H. Mulyono, M.Pd (Administrator)',
      role: 'admin',
      phone_number: '0812-3456-7890',
      status: 'active',
      created_at: '2026-09-01T08:00:00Z',
    },
  },
  guru: {
    email: 'guru@smk.id',
    password: 'password123',
    profile: {
      id: 'demo-guru-uuid-002',
      email: 'guru@smk.id',
      full_name: 'Siti Aminah, S.Kom, Gr.',
      role: 'guru',
      nip: '198803152014022003',
      phone_number: '0857-1122-3344',
      subjects_taught: ['Dasar-Dasar Kejuruan TJKT', 'Pemrograman Web & Perangkat Bergerak'],
      status: 'active',
      created_at: '2026-09-02T08:00:00Z',
    },
  },
  siswa: {
    email: 'siswa@smk.id',
    password: 'password123',
    profile: {
      id: 'demo-siswa-uuid-003',
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
