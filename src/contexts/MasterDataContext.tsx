import React, { createContext, useContext, useState, useEffect } from 'react';
import { Major, SchoolClass, Subject, Teacher, Student } from '../types';
import { supabase, isSupabaseConfigured, createIsolatedAuthClient } from '../lib/supabase';
import { SIMULATION_10_STUDENTS } from '../data/simulationSeed';
import { generateUUID } from '../lib/utils';

interface MasterDataContextType {
  majors: Major[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  students: Student[];
  loading: boolean;
  // Jurusan
  addMajor: (data: Omit<Major, 'id' | 'created_at' | 'updated_at'>) => Promise<Major>;
  updateMajor: (id: string, data: Partial<Major>) => Promise<Major>;
  deleteMajor: (id: string) => Promise<{ success: boolean; message?: string }>;
  toggleMajorStatus: (id: string) => Promise<void>;
  // Kelas
  addClass: (data: Omit<SchoolClass, 'id' | 'created_at' | 'updated_at' | 'major'>) => Promise<SchoolClass>;
  updateClass: (id: string, data: Partial<SchoolClass>) => Promise<SchoolClass>;
  deleteClass: (id: string) => Promise<{ success: boolean; message?: string }>;
  toggleClassStatus: (id: string) => Promise<void>;
  // Mata Pelajaran
  addSubject: (data: Omit<Subject, 'id' | 'created_at' | 'updated_at'>) => Promise<Subject>;
  updateSubject: (id: string, data: Partial<Subject>) => Promise<Subject>;
  deleteSubject: (id: string) => Promise<{ success: boolean; message?: string }>;
  toggleSubjectStatus: (id: string) => Promise<void>;
  // Guru
  addTeacher: (data: { nip: string; full_name: string; email: string; phone_number?: string; subject_ids: string[]; initialPassword?: string }) => Promise<Teacher>;
  updateTeacher: (id: string, data: Partial<Teacher> & { subject_ids?: string[] }) => Promise<Teacher>;
  deleteTeacher: (id: string) => Promise<{ success: boolean; message?: string }>;
  toggleTeacherStatus: (id: string) => Promise<void>;
  resetTeacherPassword: (id: string, customPassword?: string) => Promise<string>;
  // Siswa
  addStudent: (data: { nis: string; nisn: string; full_name: string; email: string; class_id: string; major_id: string; phone_number?: string; initialPassword?: string }) => Promise<Student>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<Student>;
  deleteStudent: (id: string) => Promise<{ success: boolean; message?: string }>;
  toggleStudentStatus: (id: string) => Promise<void>;
  resetStudentPassword: (id: string, customPassword?: string) => Promise<string>;
  // Batch Imports (Fase 8)
  importStudentsBatch: (dataList: any[]) => Promise<{ imported: number; failed: number }>;
  importTeachersBatch: (dataList: any[]) => Promise<{ imported: number; failed: number }>;
  importAdminsBatch: (dataList: any[]) => Promise<{ imported: number; failed: number }>;
  importSubjectsBatch: (dataList: any[]) => Promise<{ imported: number; failed: number }>;
  importClassesBatch: (dataList: any[]) => Promise<{ imported: number; failed: number }>;
  importMajorsBatch: (dataList: any[]) => Promise<{ imported: number; failed: number }>;
  syncAllLoginAccounts: () => Promise<{
    success: boolean;
    students_synced: number;
    teachers_synced: number;
    profiles_synced: number;
    total_fixed: number;
    message: string;
  }>;
  refreshData: () => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

const INITIAL_MAJORS: Major[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    code: 'TJKT',
    name: 'Teknik Jaringan Komputer dan Telekomunikasi',
    description: 'Konsentrasi keahlian infrastruktur jaringan, administrasi server, fiber optic, dan cloud computing.',
    status: 'active',
    created_at: '2026-07-01T08:00:00Z',
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    code: 'TKRO',
    name: 'Teknik Kendaraan Ringan Otomotif',
    description: 'Konsentrasi keahlian sistem chasis, kelistrikan bodi otomotif, mesin EFI, dan pemeliharaan kendaraan.',
    status: 'active',
    created_at: '2026-07-01T08:00:00Z',
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    code: 'AKL',
    name: 'Akuntansi dan Keuangan Lembaga',
    description: 'Konsentrasi keahlian akuntansi perbankan, perpajakan, audit keuangan, dan sistem spreadsheet komputer.',
    status: 'active',
    created_at: '2026-07-01T08:00:00Z',
  },
  {
    id: 'a4444444-4444-4444-4444-444444444444',
    code: 'DKV',
    name: 'Desain Komunikasi Visual',
    description: 'Konsentrasi keahlian desain grafis, ilustrasi digital vektor, fotografi, videografi, dan UI/UX branding.',
    status: 'active',
    created_at: '2026-07-01T08:00:00Z',
  },
  {
    id: 'a5555555-5555-5555-5555-555555555555',
    code: 'MPLB',
    name: 'Manajemen Perkantoran dan Layanan Bisnis',
    description: 'Konsentrasi tata kelola kearsipan digital, otomasi perkantoran, hubungan masyarakat, dan administrasi bisnis.',
    status: 'active',
    created_at: '2026-07-01T08:00:00Z',
  },
];

const INITIAL_CLASSES: SchoolClass[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    name: 'X TJKT 1',
    grade: 'X',
    major_id: 'a1111111-1111-1111-1111-111111111111',
    academic_year: '2026/2027',
    status: 'active',
    created_at: '2026-07-10T08:00:00Z',
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    name: 'XI TJKT 1',
    grade: 'XI',
    major_id: 'a1111111-1111-1111-1111-111111111111',
    academic_year: '2026/2027',
    status: 'active',
    created_at: '2026-07-10T08:00:00Z',
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    name: 'XII TJKT 1',
    grade: 'XII',
    major_id: 'a1111111-1111-1111-1111-111111111111',
    academic_year: '2026/2027',
    status: 'active',
    created_at: '2026-07-10T08:00:00Z',
  },
  {
    id: 'b4444444-4444-4444-4444-444444444444',
    name: 'XI TKRO 1',
    grade: 'XI',
    major_id: 'a2222222-2222-2222-2222-222222222222',
    academic_year: '2026/2027',
    status: 'active',
    created_at: '2026-07-10T08:00:00Z',
  },
  {
    id: 'b5555555-5555-5555-5555-555555555555',
    name: 'XI AKL 1',
    grade: 'XI',
    major_id: 'a3333333-3333-3333-3333-333333333333',
    academic_year: '2026/2027',
    status: 'active',
    created_at: '2026-07-10T08:00:00Z',
  },
  {
    id: 'b6666666-6666-6666-6666-666666666666',
    name: 'XI DKV 1',
    grade: 'XI',
    major_id: 'a4444444-4444-4444-4444-444444444444',
    academic_year: '2026/2027',
    status: 'active',
    created_at: '2026-07-10T08:00:00Z',
  },
];

const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    code: 'MTK-SMK',
    name: 'Matematika Terapan Kejuruan',
    description: 'Logika matematika, aljabar linier, trigonometri terapan, dan statistika inferensial data teknik.',
    status: 'active',
    created_at: '2026-07-05T08:00:00Z',
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    code: 'BIND-01',
    name: 'Bahasa Indonesia Kejuruan',
    description: 'Literasi kritis, analisis teks teknis, pembuatan laporan kerja praktik, dan komunikasi profesional.',
    status: 'active',
    created_at: '2026-07-05T08:00:00Z',
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    code: 'BING-01',
    name: 'Bahasa Inggris Teknis & Vokasi',
    description: 'English for Vocational Studies: technical manuals, SOP troubleshooting, workplace dialogs.',
    status: 'active',
    created_at: '2026-07-05T08:00:00Z',
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    code: 'KJ-TJKT',
    name: 'Administrasi Infrastruktur Jaringan (TJKT)',
    description: 'Konfigurasi VLAN, dynamic routing OSPF/BGP, proxy server, Mikrotik RouterOS, dan firewall policy.',
    status: 'active',
    created_at: '2026-07-05T08:00:00Z',
  },
  {
    id: 'c5555555-5555-5555-5555-555555555555',
    code: 'KJ-TKRO',
    name: 'Pemeliharaan Mesin Kendaraan Ringan (TKRO)',
    description: 'Diagnosis Electronic Fuel Injection (EFI), scanner DTC, sistem pelumasan, dan overhaul engine.',
    status: 'active',
    created_at: '2026-07-05T08:00:00Z',
  },
  {
    id: 'c6666666-6666-6666-6666-666666666666',
    name: 'Praktikum Akuntansi Lembaga (AKL)',
    code: 'KJ-AKL',
    description: 'Siklus akuntansi dagang, manufaktur, neraca lajur, dan aplikasi komputer akuntansi MYOB/Accurate.',
    status: 'active',
    created_at: '2026-07-05T08:00:00Z',
  },
];

const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    nip: '198507122010011005',
    full_name: 'Budi Santoso, S.Kom., M.T.',
    email: 'budi.santoso@guru.smk.belajar.id',
    phone_number: '081234567891',
    status: 'active',
    subject_ids: ['c4444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111'],
    created_at: '2026-07-12T09:00:00Z',
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    nip: '197903152005012008',
    full_name: 'Siti Rahmawati, M.Pd.',
    email: 'siti.rahmawati@guru.smk.belajar.id',
    phone_number: '081398765432',
    status: 'active',
    subject_ids: ['c2222222-2222-2222-2222-222222222222'],
    created_at: '2026-07-12T09:00:00Z',
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    nip: '198211282008041003',
    full_name: 'Hendra Gunawan, S.T.',
    email: 'hendra.gunawan@guru.smk.belajar.id',
    phone_number: '082155667788',
    status: 'active',
    subject_ids: ['c5555555-5555-5555-5555-555555555555'],
    created_at: '2026-07-12T09:00:00Z',
  },
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    nip: '199004052015022001',
    full_name: 'Dewi Lestari, S.Pd.',
    email: 'dewi.lestari@guru.smk.belajar.id',
    phone_number: '085711223344',
    status: 'active',
    subject_ids: ['c3333333-3333-3333-3333-333333333333'],
    created_at: '2026-07-12T09:00:00Z',
  },
  {
    id: 'd5555555-5555-5555-5555-555555555555',
    nip: '198809182014011002',
    full_name: 'Arief Wicaksono, S.E., Ak.',
    email: 'arief.wicaksono@guru.smk.belajar.id',
    phone_number: '087833445566',
    status: 'active',
    subject_ids: ['c6666666-6666-6666-6666-666666666666', 'c1111111-1111-1111-1111-111111111111'],
    created_at: '2026-07-12T09:00:00Z',
  },
];

const INITIAL_STUDENTS: Student[] = SIMULATION_10_STUDENTS;

const LOCAL_STORAGE_KEY = 'tka_smkn1_songgom_master_store';

export const MasterDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [majors, setMajors] = useState<Major[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_majors`);
    return saved ? JSON.parse(saved) : INITIAL_MAJORS;
  });

  const [classes, setClasses] = useState<SchoolClass[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_classes`);
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_subjects`);
    return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_teachers`);
    return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_students`);
    if (saved) {
      try {
        const parsed: Student[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) {
          return parsed;
        }
        const existingIds = new Set(parsed.map((s) => s.id));
        const missing = SIMULATION_10_STUDENTS.filter((s) => !existingIds.has(s.id));
        return [...parsed, ...missing];
      } catch (e) {
        console.warn('Gagal membaca students dari localStorage:', e);
      }
    }
    return INITIAL_STUDENTS;
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_majors`, JSON.stringify(majors));
  }, [majors]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_classes`, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_subjects`, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_teachers`, JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_students`, JSON.stringify(students));
  }, [students]);

  // Load from Supabase if configured, with graceful fallback
  const refreshData = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setLoading(true);
      const { data: dbMajors, error: errMajors } = await supabase.from('majors').select('*');
      if (!errMajors && dbMajors && dbMajors.length > 0) {
        setMajors(dbMajors);
      }

      const { data: dbClasses, error: errClasses } = await supabase.from('classes').select('*');
      if (!errClasses && dbClasses && dbClasses.length > 0) {
        setClasses(dbClasses);
      }

      const { data: dbSubjects, error: errSubjects } = await supabase.from('subjects').select('*');
      if (!errSubjects && dbSubjects && dbSubjects.length > 0) {
        setSubjects(dbSubjects);
      }

      const { data: dbTeachers, error: errTeachers } = await supabase.from('teachers').select('*');
      if (!errTeachers && dbTeachers && dbTeachers.length > 0) {
        // get relations
        const { data: dbTS } = await supabase.from('teacher_subjects').select('*');
        const mappedTeachers = dbTeachers.map((t: any) => ({
          ...t,
          subject_ids: dbTS ? dbTS.filter((item: any) => item.teacher_id === t.id).map((item: any) => item.subject_id) : [],
        }));
        setTeachers(mappedTeachers);
      }

      const { data: dbStudents, error: errStudents } = await supabase.from('students').select('*');
      if (!errStudents && dbStudents && dbStudents.length > 0) {
        setStudents(dbStudents);
      }
    } catch (err) {
      console.warn('Supabase fetch notice (using local storage cache):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Enrich classes with major data
  const populatedClasses = classes.map((cls) => ({
    ...cls,
    major: majors.find((m) => m.id === cls.major_id),
  }));

  // Enrich teachers with subject objects
  const populatedTeachers = teachers.map((t) => ({
    ...t,
    subjects: subjects.filter((s) => t.subject_ids?.includes(s.id)),
  }));

  // Enrich students with class and major
  const populatedStudents = students.map((std) => {
    const cls = classes.find((c) => c.id === std.class_id);
    const mjr = majors.find((m) => m.id === std.major_id);
    return {
      ...std,
      class: cls,
      major: mjr,
    };
  });

  // ================= JURUSAN OPERATIONS =================
  const addMajor = async (data: Omit<Major, 'id' | 'created_at' | 'updated_at'>): Promise<Major> => {
    const newId = crypto.randomUUID();
    const newMajor: Major = {
      ...data,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('majors').insert([newMajor]);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }

    setMajors((prev) => [newMajor, ...prev]);
    return newMajor;
  };

  const updateMajor = async (id: string, updates: Partial<Major>): Promise<Major> => {
    const updated = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('majors').update(updated).eq('id', id);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }

    let resultMajor: Major | null = null;
    setMajors((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          resultMajor = { ...m, ...updated };
          return resultMajor;
        }
        return m;
      })
    );
    return resultMajor!;
  };

  const deleteMajor = async (id: string): Promise<{ success: boolean; message?: string }> => {
    // Safety check: is any class using this major?
    const hasClasses = classes.some((c) => c.major_id === id);
    if (hasClasses) {
      return {
        success: false,
        message: 'Tidak dapat menghapus jurusan ini karena masih ada rombongan belajar (kelas) yang menggunakannya.',
      };
    }
    // Safety check: is any student using this major?
    const hasStudents = students.some((s) => s.major_id === id);
    if (hasStudents) {
      return {
        success: false,
        message: 'Tidak dapat menghapus jurusan ini karena masih terdapat siswa terdaftar dalam konsentrasi ini.',
      };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('majors').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete notice:', e);
      }
    }

    setMajors((prev) => prev.filter((m) => m.id !== id));
    return { success: true };
  };

  const toggleMajorStatus = async (id: string) => {
    const current = majors.find((m) => m.id === id);
    if (!current) return;
    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    await updateMajor(id, { status: newStatus });
  };

  // ================= KELAS OPERATIONS =================
  const addClass = async (data: Omit<SchoolClass, 'id' | 'created_at' | 'updated_at' | 'major'>): Promise<SchoolClass> => {
    const newId = crypto.randomUUID();
    const newClass: SchoolClass = {
      ...data,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('classes').insert([newClass]);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }

    setClasses((prev) => [newClass, ...prev]);
    return newClass;
  };

  const updateClass = async (id: string, updates: Partial<SchoolClass>): Promise<SchoolClass> => {
    const updated = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('classes').update(updated).eq('id', id);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }

    let resultClass: SchoolClass | null = null;
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          resultClass = { ...c, ...updated };
          return resultClass;
        }
        return c;
      })
    );
    return resultClass!;
  };

  const deleteClass = async (id: string): Promise<{ success: boolean; message?: string }> => {
    // Safety check: are there students in this class?
    const hasStudents = students.some((s) => s.class_id === id);
    if (hasStudents) {
      return {
        success: false,
        message: 'Tidak dapat menghapus kelas ini karena masih ada data siswa aktif di dalamnya.',
      };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('classes').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete notice:', e);
      }
    }

    setClasses((prev) => prev.filter((c) => c.id !== id));
    return { success: true };
  };

  const toggleClassStatus = async (id: string) => {
    const current = classes.find((c) => c.id === id);
    if (!current) return;
    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    await updateClass(id, { status: newStatus });
  };

  // ================= MATA PELAJARAN OPERATIONS =================
  const addSubject = async (data: Omit<Subject, 'id' | 'created_at' | 'updated_at'>): Promise<Subject> => {
    const newId = crypto.randomUUID();
    const newSubject: Subject = {
      ...data,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('subjects').insert([newSubject]);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }

    setSubjects((prev) => [newSubject, ...prev]);
    return newSubject;
  };

  const updateSubject = async (id: string, updates: Partial<Subject>): Promise<Subject> => {
    const updated = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('subjects').update(updated).eq('id', id);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }

    let resultSubject: Subject | null = null;
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          resultSubject = { ...s, ...updated };
          return resultSubject;
        }
        return s;
      })
    );
    return resultSubject!;
  };

  const deleteSubject = async (id: string): Promise<{ success: boolean; message?: string }> => {
    // Safety check: is any teacher assigned to this subject?
    const hasTeachers = teachers.some((t) => t.subject_ids?.includes(id));
    if (hasTeachers) {
      return {
        success: false,
        message: 'Tidak dapat menghapus mata pelajaran ini karena masih ditugaskan kepada guru pengampu.',
      };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('subjects').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete notice:', e);
      }
    }

    setSubjects((prev) => prev.filter((s) => s.id !== id));
    return { success: true };
  };

  const toggleSubjectStatus = async (id: string) => {
    const current = subjects.find((s) => s.id === id);
    if (!current) return;
    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    await updateSubject(id, { status: newStatus });
  };

  // ================= GURU OPERATIONS =================
  const addTeacher = async (data: {
    nip: string;
    full_name: string;
    email: string;
    phone_number?: string;
    subject_ids: string[];
    initialPassword?: string;
  }): Promise<Teacher> => {
    const newId = crypto.randomUUID();
    const effectivePassword = data.initialPassword || `Guru123!`;
    const newTeacher: Teacher = {
      id: newId,
      nip: data.nip.trim(),
      full_name: data.full_name.trim(),
      email: data.email.trim().toLowerCase(),
      phone_number: data.phone_number?.trim(),
      status: 'active',
      subject_ids: data.subject_ids || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Coba panggil RPC admin_create_user (instan aktif, tanpa batasan rate limit email)
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_create_user', {
          p_email: newTeacher.email,
          p_password: effectivePassword,
          p_full_name: newTeacher.full_name,
          p_role: 'guru',
          p_phone: newTeacher.phone_number || null,
          p_nip: newTeacher.nip,
          p_subject_ids: data.subject_ids || [],
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          if (rpcRes.user_id) {
            newTeacher.id = rpcRes.user_id;
          }
        } else {
          console.warn('RPC admin_create_user guru notice, menggunakan fallback:', rpcErr?.message || rpcRes?.error);

          // Fallback dengan isolated client agar sesi admin tidak tertimpa
          try {
            const isolatedClient = createIsolatedAuthClient();
            await isolatedClient.auth.signUp({
              email: newTeacher.email,
              password: effectivePassword,
              options: {
                data: {
                  full_name: newTeacher.full_name,
                  role: 'guru',
                  nip: newTeacher.nip,
                },
              },
            });
          } catch (signupErr) {
            console.warn('Isolated signup guru notice:', signupErr);
          }

          // Simpan ke tabel teachers
          await supabase.from('teachers').upsert([
            {
              id: newId,
              nip: newTeacher.nip,
              full_name: newTeacher.full_name,
              email: newTeacher.email,
              phone_number: newTeacher.phone_number || null,
              status: 'active',
            },
          ]);

          // Simpan relasi mata pelajaran ke teacher_subjects
          if (data.subject_ids && data.subject_ids.length > 0) {
            await supabase.from('teacher_subjects').delete().eq('teacher_id', newId);
            const relationRows = data.subject_ids.map((subId) => ({
              teacher_id: newId,
              subject_id: subId,
            }));
            await supabase.from('teacher_subjects').insert(relationRows);
          }

          // Simpan ke tabel profiles
          await supabase.from('profiles').upsert([
            {
              id: newId,
              email: newTeacher.email,
              full_name: newTeacher.full_name,
              role: 'guru',
              nip: newTeacher.nip,
              phone_number: newTeacher.phone_number || null,
              status: 'active',
            },
          ]);
        }
      } catch (e) {
        console.warn('Supabase teacher creation notice:', e);
      }
    }

    setTeachers((prev) => [newTeacher, ...prev]);
    return newTeacher;
  };

  const updateTeacher = async (id: string, updates: Partial<Teacher> & { subject_ids?: string[] }): Promise<Teacher> => {
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { subject_ids, ...teacherFields } = updatedData;
        await supabase.from('teachers').update(teacherFields).eq('id', id);

        // Perbarui relasi mata pelajaran
        if (subject_ids !== undefined) {
          await supabase.from('teacher_subjects').delete().eq('teacher_id', id);
          if (subject_ids.length > 0) {
            const rows = subject_ids.map((subId) => ({
              teacher_id: id,
              subject_id: subId,
            }));
            await supabase.from('teacher_subjects').insert(rows);
          }
        }

        // Sinkronisasi profil
        if (teacherFields.full_name || teacherFields.email || teacherFields.phone_number) {
          await supabase.from('profiles').update({
            ...(teacherFields.full_name ? { full_name: teacherFields.full_name } : {}),
            ...(teacherFields.email ? { email: teacherFields.email } : {}),
            ...(teacherFields.phone_number ? { phone_number: teacherFields.phone_number } : {}),
            updated_at: new Date().toISOString(),
          }).eq('id', id);
        }
      } catch (e) {
        console.warn('Supabase update notice:', e);
      }
    }

    let resultTeacher: Teacher | null = null;
    setTeachers((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          resultTeacher = {
            ...t,
            ...updatedData,
            subject_ids: updates.subject_ids !== undefined ? updates.subject_ids : t.subject_ids,
          };
          return resultTeacher;
        }
        return t;
      })
    );
    return resultTeacher!;
  };

  const deleteTeacher = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('teacher_subjects').delete().eq('teacher_id', id);
        await supabase.from('teachers').delete().eq('id', id);
        await supabase.from('profiles').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete teacher notice:', e);
      }
    }

    setTeachers((prev) => prev.filter((t) => t.id !== id));
    return { success: true };
  };

  const toggleTeacherStatus = async (id: string) => {
    const current = teachers.find((t) => t.id === id);
    if (!current) return;
    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    await updateTeacher(id, { status: newStatus });
  };

  const resetTeacherPassword = async (id: string, customPassword?: string): Promise<string> => {
    const teacher = teachers.find((t) => t.id === id);
    const newPass = customPassword || `Guru123!`;

    if (isSupabaseConfigured && supabase && teacher) {
      try {
        // Coba panggil RPC reset password langsung
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_reset_user_password', {
          p_identifier: teacher.email || teacher.nip,
          p_new_password: newPass,
        });

        if (rpcErr && teacher.email) {
          await supabase.auth.resetPasswordForEmail(teacher.email, {
            redirectTo: `${window.location.origin}/login`,
          });
        }
      } catch (e) {
        console.warn('Supabase password reset notice:', e);
      }
    }

    return newPass;
  };

  // ================= SISWA OPERATIONS =================
  const addStudent = async (data: {
    nis: string;
    nisn: string;
    full_name: string;
    email: string;
    class_id: string;
    major_id?: string;
    phone_number?: string;
    initialPassword?: string;
  }): Promise<Student> => {
    const newId = crypto.randomUUID();
    const effectivePassword = data.initialPassword || `Siswa123!`;
    const selectedClass = classes.find((c) => c.id === data.class_id);
    const resolvedMajorId = data.major_id || selectedClass?.major_id || '';

    const newStudent: Student = {
      id: newId,
      nis: data.nis.trim(),
      nisn: data.nisn.trim(),
      full_name: data.full_name.trim(),
      email: data.email.trim().toLowerCase(),
      class_id: data.class_id,
      major_id: resolvedMajorId,
      phone_number: data.phone_number?.trim(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Coba panggil RPC admin_create_user (instan terkonfirmasi tanpa rate limit email)
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_create_user', {
          p_email: newStudent.email,
          p_password: effectivePassword,
          p_full_name: newStudent.full_name,
          p_role: 'siswa',
          p_phone: newStudent.phone_number || null,
          p_nis: newStudent.nis,
          p_nisn: newStudent.nisn,
          p_class_id: data.class_id,
          p_major_id: resolvedMajorId || null,
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          if (rpcRes.user_id) {
            newStudent.id = rpcRes.user_id;
          }
        } else {
          console.warn('RPC admin_create_user siswa notice, menggunakan fallback:', rpcErr?.message || rpcRes?.error);

          // Fallback isolated client agar sesi admin tidak tertimpa
          try {
            const isolatedClient = createIsolatedAuthClient();
            await isolatedClient.auth.signUp({
              email: newStudent.email,
              password: effectivePassword,
              options: {
                data: {
                  full_name: newStudent.full_name,
                  role: 'siswa',
                  nis: newStudent.nis,
                  nisn: newStudent.nisn,
                },
              },
            });
          } catch (signupErr) {
            console.warn('Isolated signup siswa notice:', signupErr);
          }

          // Simpan ke tabel students
          await supabase.from('students').upsert([
            {
              id: newId,
              nis: newStudent.nis,
              nisn: newStudent.nisn,
              full_name: newStudent.full_name,
              email: newStudent.email,
              phone_number: newStudent.phone_number || null,
              class_id: newStudent.class_id,
              major_id: newStudent.major_id || null,
              status: 'active',
            },
          ]);

          // Simpan ke tabel profiles
          await supabase.from('profiles').upsert([
            {
              id: newId,
              email: newStudent.email,
              full_name: newStudent.full_name,
              role: 'siswa',
              nis: newStudent.nis,
              nisn: newStudent.nisn,
              phone_number: newStudent.phone_number || null,
              status: 'active',
            },
          ]);
        }
      } catch (e) {
        console.warn('Supabase student creation notice:', e);
      }
    }

    setStudents((prev) => [newStudent, ...prev]);
    return newStudent;
  };

  const updateStudent = async (id: string, updates: Partial<Student>): Promise<Student> => {
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('students').update(updatedData).eq('id', id);

        // Perbarui juga data di profiles
        if (updates.full_name || updates.email || updates.phone_number || updates.nis || updates.nisn) {
          await supabase.from('profiles').update({
            ...(updates.full_name ? { full_name: updates.full_name } : {}),
            ...(updates.email ? { email: updates.email } : {}),
            ...(updates.phone_number ? { phone_number: updates.phone_number } : {}),
            ...(updates.nis ? { nis: updates.nis } : {}),
            ...(updates.nisn ? { nisn: updates.nisn } : {}),
            updated_at: new Date().toISOString(),
          }).eq('id', id);
        }
      } catch (e) {
        console.warn('Supabase student update notice:', e);
      }
    }

    let resultStudent: Student | null = null;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          resultStudent = { ...s, ...updatedData };
          return resultStudent;
        }
        return s;
      })
    );
    return resultStudent!;
  };

  const deleteStudent = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('students').delete().eq('id', id);
        await supabase.from('profiles').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete student notice:', e);
      }
    }

    setStudents((prev) => prev.filter((s) => s.id !== id));
    return { success: true };
  };

  const toggleStudentStatus = async (id: string) => {
    const current = students.find((s) => s.id === id);
    if (!current) return;
    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    await updateStudent(id, { status: newStatus });
  };

  const resetStudentPassword = async (id: string, customPassword?: string): Promise<string> => {
    const student = students.find((s) => s.id === id);
    const newPass = customPassword || `Siswa123!`;

    if (isSupabaseConfigured && supabase && student) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_reset_user_password', {
          p_identifier: student.email || student.nis,
          p_new_password: newPass,
        });

        if (rpcErr && student.email) {
          await supabase.auth.resetPasswordForEmail(student.email, {
            redirectTo: `${window.location.origin}/login`,
          });
        }
      } catch (e) {
        console.warn('Supabase password reset notice:', e);
      }
    }

    return newPass;
  };

  // -------------------------------------------------------------
  // BATCH IMPORTS (Fase 8: Import Master Data & Kredensial Login)
  // -------------------------------------------------------------
  const importStudentsBatch = async (dataList: any[]): Promise<{ imported: number; failed: number }> => {
    let imported = 0;
    let failed = 0;
    const newStudentsToAdd: Student[] = [];

    // Persiapkan data model siswa
    for (const item of dataList) {
      const newId = generateUUID();
      const studentObj: Student = {
        id: newId,
        nis: item.nis?.trim() || '',
        nisn: item.nisn?.trim() || '',
        full_name: item.full_name?.trim() || '',
        email: item.email?.trim().toLowerCase() || '',
        phone_number: item.phone_number || '',
        class_id: item.class_id,
        major_id: item.major_id,
        status: item.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newStudentsToAdd.push(studentObj);
    }

    if (isSupabaseConfigured && supabase && dataList.length > 0) {
      try {
        const BATCH_SIZE = 50;
        let batchRpcSuccess = false;

        // 1. Coba gunakan RPC admin_batch_create_users per batch
        for (let i = 0; i < dataList.length; i += BATCH_SIZE) {
          const chunk = dataList.slice(i, i + BATCH_SIZE).map((item) => ({
            role: 'siswa',
            email: item.email?.trim().toLowerCase(),
            password: item.initialPassword || 'Siswa123!',
            full_name: item.full_name?.trim(),
            phone_number: item.phone_number || null,
            nis: item.nis?.trim() || null,
            nisn: item.nisn?.trim() || null,
            class_id: item.class_id || null,
            major_id: item.major_id || null,
          }));

          const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_batch_create_users', {
            p_users: chunk,
          });

          if (!rpcErr && rpcRes && rpcRes.success) {
            batchRpcSuccess = true;
            imported += rpcRes.imported ?? chunk.length;
            failed += rpcRes.failed ?? 0;
          } else {
            console.warn('Batch RPC siswa belum tersedia atau gagal, beralih ke fallback individual:', rpcErr?.message);
            break;
          }
        }

        // 2. Fallback jika RPC batch belum terpasang di database
        if (!batchRpcSuccess) {
          imported = 0;
          failed = 0;
          for (const item of dataList) {
            try {
              const pass = item.initialPassword || 'Siswa123!';
              const { data: singleRes, error: singleErr } = await supabase.rpc('admin_create_user', {
                p_email: item.email?.trim().toLowerCase(),
                p_password: pass,
                p_full_name: item.full_name?.trim(),
                p_role: 'siswa',
                p_phone: item.phone_number || null,
                p_nis: item.nis?.trim() || null,
                p_nisn: item.nisn?.trim() || null,
                p_class_id: item.class_id || null,
                p_major_id: item.major_id || null,
              });

              if (!singleErr && singleRes?.success) {
                imported++;
              } else {
                // Upsert langsung ke tabel students & profiles
                const studentId = generateUUID();
                await supabase.from('students').upsert([
                  {
                    id: studentId,
                    nis: item.nis?.trim(),
                    nisn: item.nisn?.trim(),
                    full_name: item.full_name?.trim(),
                    email: item.email?.trim().toLowerCase(),
                    phone_number: item.phone_number || null,
                    class_id: item.class_id || null,
                    major_id: item.major_id || null,
                    status: 'active',
                  },
                ]);
                await supabase.from('profiles').upsert([
                  {
                    id: studentId,
                    email: item.email?.trim().toLowerCase(),
                    full_name: item.full_name?.trim(),
                    role: 'siswa',
                    nis: item.nis?.trim(),
                    nisn: item.nisn?.trim(),
                    status: 'active',
                  },
                ]);
                imported++;
              }
            } catch (itemErr) {
              console.warn('Gagal memproses siswa item:', itemErr);
              failed++;
            }
          }
        }
      } catch (e) {
        console.warn('Gagal memproses batch import siswa ke Supabase:', e);
      }
    } else {
      imported = newStudentsToAdd.length;
    }

    // Perbarui state lokal
    if (newStudentsToAdd.length > 0) {
      setStudents((prev) => {
        const existingEmails = new Set(prev.map((s) => s.email.toLowerCase()));
        const uniqueNew = newStudentsToAdd.filter((s) => !existingEmails.has(s.email.toLowerCase()));
        return [...uniqueNew, ...prev];
      });
    }

    if (isSupabaseConfigured && supabase) {
      await refreshData();
    }

    return { imported: imported || newStudentsToAdd.length, failed };
  };

  const importTeachersBatch = async (dataList: any[]): Promise<{ imported: number; failed: number }> => {
    let imported = 0;
    let failed = 0;
    const newTeachersToAdd: Teacher[] = [];

    for (const item of dataList) {
      const newId = generateUUID();
      const teacherObj: Teacher = {
        id: newId,
        nip: item.nip?.trim() || '',
        full_name: item.full_name?.trim() || '',
        email: item.email?.trim().toLowerCase() || '',
        phone_number: item.phone_number || '',
        subject_ids: item.subject_ids || [],
        status: item.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newTeachersToAdd.push(teacherObj);
    }

    if (isSupabaseConfigured && supabase && dataList.length > 0) {
      try {
        const BATCH_SIZE = 50;
        let batchRpcSuccess = false;

        for (let i = 0; i < dataList.length; i += BATCH_SIZE) {
          const chunk = dataList.slice(i, i + BATCH_SIZE).map((item) => ({
            role: 'guru',
            email: item.email?.trim().toLowerCase(),
            password: item.initialPassword || 'Guru123!',
            full_name: item.full_name?.trim(),
            phone_number: item.phone_number || null,
            nip: item.nip?.trim() || null,
            subject_ids: item.subject_ids || [],
          }));

          const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_batch_create_users', {
            p_users: chunk,
          });

          if (!rpcErr && rpcRes && rpcRes.success) {
            batchRpcSuccess = true;
            imported += rpcRes.imported ?? chunk.length;
            failed += rpcRes.failed ?? 0;
          } else {
            console.warn('Batch RPC guru belum tersedia atau gagal, beralih ke fallback individual:', rpcErr?.message);
            break;
          }
        }

        if (!batchRpcSuccess) {
          imported = 0;
          failed = 0;
          for (const item of dataList) {
            try {
              const pass = item.initialPassword || 'Guru123!';
              const { data: singleRes, error: singleErr } = await supabase.rpc('admin_create_user', {
                p_email: item.email?.trim().toLowerCase(),
                p_password: pass,
                p_full_name: item.full_name?.trim(),
                p_role: 'guru',
                p_phone: item.phone_number || null,
                p_nip: item.nip?.trim() || null,
                p_subject_ids: item.subject_ids || [],
              });

              if (!singleErr && singleRes?.success) {
                imported++;
              } else {
                const teacherId = generateUUID();
                await supabase.from('teachers').upsert([
                  {
                    id: teacherId,
                    nip: item.nip?.trim(),
                    full_name: item.full_name?.trim(),
                    email: item.email?.trim().toLowerCase(),
                    phone_number: item.phone_number || null,
                    status: 'active',
                  },
                ]);
                await supabase.from('profiles').upsert([
                  {
                    id: teacherId,
                    email: item.email?.trim().toLowerCase(),
                    full_name: item.full_name?.trim(),
                    role: 'guru',
                    nip: item.nip?.trim(),
                    status: 'active',
                  },
                ]);
                imported++;
              }
            } catch (itemErr) {
              console.warn('Gagal memproses guru item:', itemErr);
              failed++;
            }
          }
        }
      } catch (e) {
        console.warn('Gagal memproses batch import guru ke Supabase:', e);
      }
    } else {
      imported = newTeachersToAdd.length;
    }

    if (newTeachersToAdd.length > 0) {
      setTeachers((prev) => {
        const existingEmails = new Set(prev.map((t) => t.email.toLowerCase()));
        const uniqueNew = newTeachersToAdd.filter((t) => !existingEmails.has(t.email.toLowerCase()));
        return [...uniqueNew, ...prev];
      });
    }

    if (isSupabaseConfigured && supabase) {
      await refreshData();
    }

    return { imported: imported || newTeachersToAdd.length, failed };
  };

  const importAdminsBatch = async (dataList: any[]): Promise<{ imported: number; failed: number }> => {
    let imported = 0;
    let failed = 0;

    if (isSupabaseConfigured && supabase && dataList.length > 0) {
      try {
        const BATCH_SIZE = 50;
        let batchRpcSuccess = false;

        for (let i = 0; i < dataList.length; i += BATCH_SIZE) {
          const chunk = dataList.slice(i, i + BATCH_SIZE).map((item) => ({
            role: 'admin',
            email: item.email?.trim().toLowerCase(),
            password: item.initialPassword || 'Admin123!',
            full_name: item.full_name?.trim(),
            phone_number: item.phone_number || null,
            nip: item.nip?.trim() || null,
          }));

          const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_batch_create_users', {
            p_users: chunk,
          });

          if (!rpcErr && rpcRes && rpcRes.success) {
            batchRpcSuccess = true;
            imported += rpcRes.imported ?? chunk.length;
            failed += rpcRes.failed ?? 0;
          } else {
            console.warn('Batch RPC admin belum tersedia, beralih ke fallback individual:', rpcErr?.message);
            break;
          }
        }

        if (!batchRpcSuccess) {
          imported = 0;
          failed = 0;
          for (const item of dataList) {
            try {
              const pass = item.initialPassword || 'Admin123!';
              const { data: singleRes, error: singleErr } = await supabase.rpc('admin_create_user', {
                p_email: item.email?.trim().toLowerCase(),
                p_password: pass,
                p_full_name: item.full_name?.trim(),
                p_role: 'admin',
                p_phone: item.phone_number || null,
                p_nip: item.nip?.trim() || null,
              });

              if (!singleErr && singleRes?.success) {
                imported++;
              } else {
                const adminId = generateUUID();
                await supabase.from('profiles').upsert([
                  {
                    id: adminId,
                    email: item.email?.trim().toLowerCase(),
                    full_name: item.full_name?.trim(),
                    role: 'admin',
                    nip: item.nip?.trim() || null,
                    phone_number: item.phone_number || null,
                    status: 'active',
                  },
                ]);
                imported++;
              }
            } catch (err) {
              console.warn('Gagal import admin item:', err);
              failed++;
            }
          }
        }
      } catch (e) {
        console.warn('Gagal memproses batch import admin ke Supabase:', e);
      }
    } else {
      imported = dataList.length;
    }

    return { imported, failed };
  };

  const syncAllLoginAccounts = async (): Promise<{
    success: boolean;
    students_synced: number;
    teachers_synced: number;
    profiles_synced: number;
    total_fixed: number;
    message: string;
  }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        students_synced: 0,
        teachers_synced: 0,
        profiles_synced: 0,
        total_fixed: 0,
        message: 'Koneksi Supabase belum aktif atau URL/Key belum terisi.',
      };
    }

    try {
      const { data, error } = await supabase.rpc('sync_unregistered_logins', {
        p_default_student_pass: 'Siswa123!',
        p_default_teacher_pass: 'Guru123!',
        p_default_admin_pass: 'Admin123!',
      });

      if (error) {
        throw new Error(error.message);
      }

      await refreshData();

      return {
        success: data?.success ?? true,
        students_synced: data?.students_synced ?? 0,
        teachers_synced: data?.teachers_synced ?? 0,
        profiles_synced: data?.profiles_synced ?? 0,
        total_fixed: data?.total_fixed ?? 0,
        message: data?.message || 'Sinkronisasi akun login berhasil dilakukan.',
      };
    } catch (err: any) {
      console.error('Error saat sync_unregistered_logins:', err);
      return {
        success: false,
        students_synced: 0,
        teachers_synced: 0,
        profiles_synced: 0,
        total_fixed: 0,
        message: `Gagal menyinkronkan: ${err.message}. Pastikan file SQL add_admin_user_functions.sql telah dijalankan di Supabase SQL Editor.`,
      };
    }
  };

  const importSubjectsBatch = async (dataList: any[]): Promise<{ imported: number; failed: number }> => {
    let imported = 0;
    const newSubjectsToAdd: Subject[] = [];

    for (const item of dataList) {
      const newId = generateUUID();
      const subjectObj: Subject = {
        id: newId,
        code: item.code.toUpperCase(),
        name: item.name,
        description: item.description || '',
        status: item.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newSubjectsToAdd.push(subjectObj);
      imported++;
    }

    if (newSubjectsToAdd.length > 0) {
      setSubjects((prev) => [...newSubjectsToAdd, ...prev]);
    }
    return { imported, failed: 0 };
  };

  const importClassesBatch = async (dataList: any[]): Promise<{ imported: number; failed: number }> => {
    let imported = 0;
    const newClassesToAdd: SchoolClass[] = [];

    for (const item of dataList) {
      const newId = generateUUID();
      const classObj: SchoolClass = {
        id: newId,
        name: item.name,
        grade: item.grade,
        major_id: item.major_id,
        academic_year: item.academic_year || '2026/2027',
        status: item.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newClassesToAdd.push(classObj);
      imported++;
    }

    if (newClassesToAdd.length > 0) {
      setClasses((prev) => [...newClassesToAdd, ...prev]);
    }
    return { imported, failed: 0 };
  };

  const importMajorsBatch = async (dataList: any[]): Promise<{ imported: number; failed: number }> => {
    let imported = 0;
    const newMajorsToAdd: Major[] = [];

    for (const item of dataList) {
      const newId = generateUUID();
      const majorObj: Major = {
        id: newId,
        code: item.code.toUpperCase(),
        name: item.name,
        description: item.description || '',
        status: item.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newMajorsToAdd.push(majorObj);
      imported++;
    }

    if (newMajorsToAdd.length > 0) {
      setMajors((prev) => [...newMajorsToAdd, ...prev]);
    }
    return { imported, failed: 0 };
  };

  return (
    <MasterDataContext.Provider
      value={{
        majors,
        classes: populatedClasses,
        subjects,
        teachers: populatedTeachers,
        students: populatedStudents,
        loading,
        addMajor,
        updateMajor,
        deleteMajor,
        toggleMajorStatus,
        addClass,
        updateClass,
        deleteClass,
        toggleClassStatus,
        addSubject,
        updateSubject,
        deleteSubject,
        toggleSubjectStatus,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        toggleTeacherStatus,
        resetTeacherPassword,
        addStudent,
        updateStudent,
        deleteStudent,
        toggleStudentStatus,
        resetStudentPassword,
        importStudentsBatch,
        importTeachersBatch,
        importAdminsBatch,
        importSubjectsBatch,
        importClassesBatch,
        importMajorsBatch,
        syncAllLoginAccounts,
        refreshData,
      }}
    >
      {children}
    </MasterDataContext.Provider>
  );
};

export const useMasterData = () => {
  const context = useContext(MasterDataContext);
  if (!context) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
};
