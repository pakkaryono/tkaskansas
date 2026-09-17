import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured, DEMO_USERS } from '../lib/supabase';
import { AuditLogger } from '../lib/auditLogger';
import { maskSensitiveError } from '../lib/securitySanitizer';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  loginAsDemo: (role: UserRole) => void;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = 'tka_smk_demo_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Inisialisasi auth state
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      // 1. Cek apakah ada demo session di localStorage
      const savedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
      if (savedDemo) {
        try {
          const parsed = JSON.parse(savedDemo) as UserProfile;
          if (mounted) {
            setProfile(parsed);
            setUser({ id: parsed.id, email: parsed.email });
            setIsDemoMode(true);
            setLoading(false);
          }
          return;
        } catch {
          localStorage.removeItem(DEMO_STORAGE_KEY);
        }
      }

      // 2. Jika Supabase dikonfigurasi, coba ambil session Supabase
      if (isSupabaseConfigured) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;

          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id, session.user.email);
          }
        } catch (err: any) {
          console.error('Gagal mengambil sesi Supabase:', err.message);
        } finally {
          if (mounted) setLoading(false);
        }

        // Listener perubahan Auth Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id, session.user.email);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } else {
        // Jika Supabase belum dikonfigurasi dan tidak ada demo session, set loading selesai
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch profil dari tabel public.profiles di Supabase
  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.warn('Gagal membaca profil Supabase:', profileError.message);
        // Fallback jika baris profil belum dibuat oleh trigger
        if (userEmail) {
          const fallbackProfile: UserProfile = {
            id: userId,
            email: userEmail,
            full_name: userEmail.split('@')[0],
            role: 'siswa',
            status: 'active',
          };
          setProfile(fallbackProfile);
        }
        return;
      }

      if (data) {
        setProfile(data as UserProfile);
      }
    } catch (err: any) {
      console.error('Error saat fetchProfile:', err);
    }
  };

  // Login Handler (Mendukung Supabase Auth nyata + Fallback Demo)
  const login = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    setError(null);
    setLoading(true);

    try {
      // Cek apakah akun cocok dengan demo credentials
      const matchingDemo = Object.values(DEMO_USERS).find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );

      if (matchingDemo && (!isSupabaseConfigured || email.endsWith('@smk.id'))) {
        // Login sebagai demo
        loginAsDemo(matchingDemo.profile.role);
        setLoading(false);
        return { success: true, role: matchingDemo.profile.role };
      }

      if (!isSupabaseConfigured) {
        const msg = 'Supabase belum dikonfigurasi. Gunakan tombol Akun Demo atau atur VITE_SUPABASE_URL di Settings.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      // Login nyata ke Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        let indonesianMessage = authError.message;
        if (authError.message.includes('Invalid login credentials')) {
          indonesianMessage = 'Email atau password yang Anda masukkan salah.';
        } else if (authError.message.includes('Email not confirmed')) {
          indonesianMessage = 'Email belum diverifikasi. Silakan cek inbox email Anda.';
        }
        setError(indonesianMessage);
        setLoading(false);
        return { success: false, error: indonesianMessage };
      }

      if (data.user) {
        setUser(data.user);
        setIsDemoMode(false);
        localStorage.removeItem(DEMO_STORAGE_KEY);

        // Ambil profil untuk menentukan role
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const userRole: UserRole = profileData?.role || 'siswa';
        setProfile(profileData || {
          id: data.user.id,
          email: data.user.email || '',
          full_name: data.user.email?.split('@')[0] || 'User',
          role: userRole,
          status: 'active',
        });

        AuditLogger.log({
          action: 'LOGIN',
          entity: 'AuthSystem',
          userId: data.user.id,
          userEmail: data.user.email || '',
          userRole,
          details: { method: 'email_password', status: 'success' },
          status: 'SUCCESS',
        });

        setLoading(false);
        return { success: true, role: userRole };
      }

      setLoading(false);
      return { success: false, error: 'Terjadi kesalahan autentikasi' };
    } catch (err: any) {
      const errMsg = maskSensitiveError(err.message || 'Gagal masuk. Silakan periksa kredensial Anda.');
      setError(errMsg);
      setLoading(false);
      AuditLogger.log({
        action: 'LOGIN',
        entity: 'AuthSystem',
        userEmail: email,
        details: { method: 'email_password', error: errMsg },
        status: 'BLOCKED',
      });
      return { success: false, error: errMsg };
    }
  };

  // Login Demo Cepat untuk Evaluasi & Pengujian
  const loginAsDemo = (roleChoice: UserRole) => {
    const demo = DEMO_USERS[roleChoice];
    if (demo) {
      setUser({ id: demo.profile.id, email: demo.profile.email });
      setProfile(demo.profile);
      setIsDemoMode(true);
      setError(null);
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demo.profile));

      AuditLogger.log({
        action: 'LOGIN',
        entity: 'AuthSystem',
        userId: demo.profile.id,
        userEmail: demo.profile.email,
        userRole: roleChoice,
        details: { method: 'demo_preset', role: roleChoice },
        status: 'SUCCESS',
      });
    }
  };

  // Logout Handler
  const logout = async () => {
    setLoading(true);
    const prevUser = user;
    const prevRole = profile?.role;
    try {
      if (isDemoMode) {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      } else if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      console.error('Error saat logout:', err.message);
    } finally {
      if (prevUser) {
        AuditLogger.log({
          action: 'LOGOUT',
          entity: 'AuthSystem',
          userId: prevUser.id,
          userEmail: prevUser.email,
          userRole: prevRole,
          details: { message: 'Sesi pengguna berhasil diakhiri secara aman' },
          status: 'SUCCESS',
        });
      }
      setUser(null);
      setProfile(null);
      setIsDemoMode(false);
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setLoading(false);
    }
  };

  // Reset Password Handler
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetErr) throw resetErr;
      }

      AuditLogger.log({
        action: 'PASSWORD_RESET_REQUEST',
        entity: 'AuthSystem',
        userEmail: email.trim(),
        details: { clientTimestamp: new Date().toISOString() },
        status: 'SUCCESS',
      });

      setLoading(false);
      return {
        success: true,
        message: `Instruksi pemulihan kata sandi telah dikirim ke ${email}. Silakan periksa kotak masuk atau spam email Anda.`,
      };
    } catch (err: any) {
      const errMsg = maskSensitiveError(err.message || 'Gagal memproses permohonan reset password.');
      setLoading(false);
      return {
        success: false,
        message: errMsg,
      };
    }
  };

  // Update profil
  const updateProfile = async (updatedData: Partial<UserProfile>): Promise<boolean> => {
    if (!profile) return false;
    try {
      if (isDemoMode) {
        const newProfile = { ...profile, ...updatedData };
        setProfile(newProfile);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(newProfile));
        return true;
      }

      if (isSupabaseConfigured) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            ...updatedData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        if (updateError) throw updateError;

        setProfile({ ...profile, ...updatedData });
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Gagal memperbarui profil:', err);
      return false;
    }
  };

  const clearError = () => setError(null);

  const role = profile?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        error,
        isDemoMode,
        login,
        loginAsDemo,
        logout,
        updateProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
};
