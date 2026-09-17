import { supabase, isSupabaseConfigured } from './supabase';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_RESET_REQUEST'
  | 'UNAUTHORIZED_ACCESS_BLOCKED'
  | 'IDOR_PREVENTION_BLOCKED'
  | 'EXAM_STARTED'
  | 'EXAM_SUBMITTED'
  | 'ANSWER_SAVED'
  | 'ESSAY_GRADED'
  | 'EXAM_REGRADED'
  | 'QUESTION_MUTATED'
  | 'DATA_IMPORTED'
  | 'DATA_EXPORTED'
  | 'SECURITY_TEST_EXECUTED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: AuditAction;
  entity: string;
  details: Record<string, any>;
  ipAddress?: string;
  status: 'SUCCESS' | 'WARNING' | 'BLOCKED' | 'ERROR';
}

const AUDIT_STORAGE_KEY = 'tka_smk_audit_logs';

export const AuditLogger = {
  // Catat log aktivitas
  async log(params: {
    action: AuditAction;
    entity: string;
    details?: Record<string, any>;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    status?: 'SUCCESS' | 'WARNING' | 'BLOCKED' | 'ERROR';
  }): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      action: params.action,
      entity: params.entity,
      details: params.details || {},
      ipAddress: '127.0.0.1 (Client/Local)',
      status: params.status || 'SUCCESS',
    };

    // 1. Simpan ke local storage (selalu ada, termasuk offline & demo)
    try {
      const existing = localStorage.getItem(AUDIT_STORAGE_KEY);
      const logs: AuditLogEntry[] = existing ? JSON.parse(existing) : [];
      logs.unshift(entry);
      // Batasi max 200 entri terakhir
      if (logs.length > 200) {
        logs.length = 200;
      }
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('Gagal menyimpan audit log ke localStorage:', e);
    }

    // 2. Jika Supabase aktif, kirim ke tabel audit_logs
    if (isSupabaseConfigured) {
      try {
        await supabase.from('audit_logs').insert({
          user_id: params.userId,
          user_email: params.userEmail,
          action: params.action,
          entity: params.entity,
          details: params.details,
          created_at: entry.timestamp,
        });
      } catch (err) {
        // Silent failover agar tidak mengganggu flow utama
        console.debug('Supabase audit_logs sync skipped/failed:', err);
      }
    }

    return entry;
  },

  // Ambil semua audit logs
  getLogs(): AuditLogEntry[] {
    try {
      const existing = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (!existing) {
        // Seed default initial logs jika belum ada
        const initialLogs: AuditLogEntry[] = [
          {
            id: 'audit-init-001',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            userEmail: 'system@smk.id',
            userRole: 'admin',
            action: 'LOGIN',
            entity: 'AuthSystem',
            details: { message: 'Inisialisasi sistem keamanan TKA SMK' },
            status: 'SUCCESS',
          },
          {
            id: 'audit-init-002',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            userEmail: 'siswa@smk.id',
            userRole: 'siswa',
            action: 'EXAM_STARTED',
            entity: 'exam-mtk-xi-50',
            details: { student: 'Budi Siswa Pratama', nis: '21001' },
            status: 'SUCCESS',
          },
        ];
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(initialLogs));
        return initialLogs;
      }
      return JSON.parse(existing);
    } catch {
      return [];
    }
  },

  // Bersihkan log
  clearLogs(): void {
    localStorage.removeItem(AUDIT_STORAGE_KEY);
  },
};
