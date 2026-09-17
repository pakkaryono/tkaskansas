import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Save, ShieldCheck, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const ProfilePage: React.FC = () => {
  const { profile, updateProfile, isDemoMode } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);

    const success = await updateProfile({
      full_name: fullName,
      phone_number: phoneNumber,
    });

    setSavingProfile(false);
    if (success) {
      setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
    } else {
      setMessage({ type: 'error', text: 'Gagal memperbarui profil. Periksa koneksi Anda.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi password tidak cocok.' });
      return;
    }

    setSavingPassword(true);
    setMessage(null);

    try {
      if (isDemoMode) {
        setSavingPassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ type: 'success', text: 'Password simulasi akun demo berhasil diperbarui!' });
        return;
      }

      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) throw error;

        setSavingPassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ type: 'success', text: 'Password akun Supabase berhasil diubah!' });
      }
    } catch (err: any) {
      setSavingPassword(false);
      setMessage({ type: 'error', text: err.message || 'Gagal mengubah password.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Profil & Pengaturan Akun</h2>
        <p className="text-xs text-slate-500">Kelola identitas dan keamanan kata sandi akun Anda</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Summary Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white text-2xl font-black flex items-center justify-center shadow-md mb-4">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <h3 className="font-bold text-slate-900 text-base">{profile?.full_name}</h3>
          <span className="mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-800">
            Peran: {profile?.role}
          </span>
          <div className="mt-4 w-full text-left space-y-2 text-xs border-t border-slate-100 pt-4 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Email Terdaftar</span>
              <span className="font-medium text-slate-800">{profile?.email}</span>
            </div>
            {profile?.nip && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">NIP / NUPTK</span>
                <span className="font-medium text-slate-800">{profile.nip}</span>
              </div>
            )}
            {profile?.nis && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">NIS / NISN</span>
                <span className="font-medium text-slate-800">{profile.nis} / {profile.nisn || '-'}</span>
              </div>
            )}
            {profile?.class_name && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Kelas & Rombel</span>
                <span className="font-medium text-slate-800">{profile.class_name}</span>
              </div>
            )}
            {profile?.major_name && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Konsentrasi Keahlian</span>
                <span className="font-medium text-slate-800">{profile.major_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Form Biodata */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Informasi Personal</span>
            </h4>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </form>
          </div>

          {/* Form Password */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Ubah Password (Supabase Auth)</span>
            </h4>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{savingPassword ? 'Mengubah...' : 'Perbarui Password'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
