import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Question,
  QuestionOption,
  EssayAnswer,
  MatchingPair,
  QuestionFilterParams
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useMasterData } from './MasterDataContext';
import { GENERATED_MATH_QUESTIONS_50 } from '../data/mathQuestionsSeed';
import { ALL_SIMULATION_QUESTIONS } from '../data/simulationSeed';

interface QuestionBankContextType {
  questions: Question[];
  loading: boolean;
  addQuestion: (data: Omit<Question, 'id' | 'created_at' | 'updated_at'>) => Promise<Question>;
  updateQuestion: (id: string, data: Partial<Question>) => Promise<Question>;
  deleteQuestion: (id: string) => Promise<{ success: boolean; message?: string }>;
  duplicateQuestion: (id: string) => Promise<Question>;
  toggleQuestionStatus: (id: string) => Promise<void>;
  getQuestionById: (id: string) => Question | undefined;
  exportQuestions: (format: 'json' | 'csv', filteredQuestions?: Question[]) => void;
  importQuestionsBatch: (dataList: any[]) => Promise<{ imported: number; failed: number }>;
  syncWithSupabase: () => Promise<void>;
}

const QuestionBankContext = createContext<QuestionBankContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'tka_question_bank_data_v4';

// SEED SOAL AWAL (8 Soal Multi-tipe + 50 Soal Matematika Terapan Kejuruan untuk Pengujian Ujian 50 Soal)
const INITIAL_QUESTIONS: Question[] = [
  // 1. PG Biasa 1: Matematika Terapan Kejuruan
  {
    id: 'q1111111-1111-1111-1111-111111111111',
    code: 'SOAL-MTK-001',
    subject_id: 'c1111111-1111-1111-1111-111111111111', // MTK-SMK
    teacher_id: 'demo-guru-uuid-002', // Siti Aminah
    grade: 'XI',
    major_id: 'a1111111-1111-1111-1111-111111111111', // TJKT
    question_type: 'single_choice',
    difficulty: 'medium',
    points: 10,
    question_text: 'Diberikan fungsi kuadrat <b>f(x) = 2x² - 8x + 6</b> yang memodelkan laju transmisi bandwidth. Tentukan koordinat titik balik minimum (titik optimum) dari fungsi tersebut!',
    explanation: 'Sumbu simetri x = -b/(2a) = -(-8)/(2×2) = 8/4 = 2. Nilai optimum y = f(2) = 2(2)² - 8(2) + 6 = 8 - 16 + 6 = -2. Jadi titik optimum minimumnya adalah (2, -2).',
    status: 'active',
    scoring_method: 'exact_match',
    options: [
      { id: 'opt-1-1', question_id: 'q1111111-1111-1111-1111-111111111111', option_key: 'A', option_text: '(2, -2)', is_correct: true, order_num: 1 },
      { id: 'opt-1-2', question_id: 'q1111111-1111-1111-1111-111111111111', option_key: 'B', option_text: '(2, 2)', is_correct: false, order_num: 2 },
      { id: 'opt-1-3', question_id: 'q1111111-1111-1111-1111-111111111111', option_key: 'C', option_text: '(-2, 6)', is_correct: false, order_num: 3 },
      { id: 'opt-1-4', question_id: 'q1111111-1111-1111-1111-111111111111', option_key: 'D', option_text: '(4, -2)', is_correct: false, order_num: 4 },
      { id: 'opt-1-5', question_id: 'q1111111-1111-1111-1111-111111111111', option_key: 'E', option_text: '(1, 0)', is_correct: false, order_num: 5 },
    ],
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  // 2. PG Biasa 2: Administrasi Infrastruktur Jaringan (TJKT)
  {
    id: 'q2222222-2222-2222-2222-222222222222',
    code: 'SOAL-TJKT-001',
    subject_id: 'c4444444-4444-4444-4444-444444444444', // KJ-TJKT
    teacher_id: 'demo-guru-uuid-002',
    grade: 'XI',
    major_id: 'a1111111-1111-1111-1111-111111111111', // TJKT
    question_type: 'single_choice',
    difficulty: 'hard',
    points: 10,
    question_text: 'Sebuah laboratorium komputer SMKN 1 Songgom mendapat alokasi subnet IPv4 <b>192.168.10.0/28</b>. Berapakah jumlah host yang valid (usable host) dan alamat IP Broadcast dari subnet tersebut?',
    explanation: 'Prefiks /28 memiliki subnet mask 255.255.255.240. Jumlah total IP = 2^(32-28) = 16 IP (rentang .0 s/d .15). IP Network = .0, IP Broadcast = .15. Jumlah host valid = 16 - 2 = 14 host (dari .1 s/d .14).',
    status: 'active',
    scoring_method: 'exact_match',
    options: [
      { id: 'opt-2-1', question_id: 'q2222222-2222-2222-2222-222222222222', option_key: 'A', option_text: '16 host dan IP Broadcast 192.168.10.16', is_correct: false, order_num: 1 },
      { id: 'opt-2-2', question_id: 'q2222222-2222-2222-2222-222222222222', option_key: 'B', option_text: '14 host dan IP Broadcast 192.168.10.15', is_correct: true, order_num: 2 },
      { id: 'opt-2-3', question_id: 'q2222222-2222-2222-2222-222222222222', option_key: 'C', option_text: '30 host dan IP Broadcast 192.168.10.31', is_correct: false, order_num: 3 },
      { id: 'opt-2-4', question_id: 'q2222222-2222-2222-2222-222222222222', option_key: 'D', option_text: '14 host dan IP Broadcast 192.168.10.16', is_correct: false, order_num: 4 },
      { id: 'opt-2-5', question_id: 'q2222222-2222-2222-2222-222222222222', option_key: 'E', option_text: '12 host dan IP Broadcast 192.168.10.14', is_correct: false, order_num: 5 },
    ],
    created_at: '2026-09-02T08:00:00Z',
    updated_at: '2026-09-02T08:00:00Z',
  },
  // 3. PG Kompleks 1: Keamanan Router Jaringan (TJKT)
  {
    id: 'q3333333-3333-3333-3333-333333333333',
    code: 'SOAL-TJKT-002',
    subject_id: 'c4444444-4444-4444-4444-444444444444', // KJ-TJKT
    teacher_id: 'demo-guru-uuid-002',
    grade: 'XI',
    major_id: 'a1111111-1111-1111-1111-111111111111',
    question_type: 'complex_choice',
    difficulty: 'hard',
    points: 15,
    question_text: 'Untuk mengamankan router MikroTik di SMKN 1 Songgom dari upaya login ilegal (brute force attack) melalui interface publik/WAN, manakah langkah pengamanan firewall yang <b>BENAR dan TEPAT</b>? <i>(Pilih semua jawaban yang benar)</i>',
    explanation: 'Pengamanan router meliputi penggantian nomor port service manajemen (B), pembuatan dynamic address-list blacklist brute force dengan action drop (D), dan pembatasan Available From IP untuk admin (E).',
    status: 'active',
    scoring_method: 'exact_match',
    options: [
      { id: 'opt-3-1', question_id: 'q3333333-3333-3333-3333-333333333333', option_key: 'A', option_text: 'Menutup semua port interface LAN internal tanpa terkecuali', is_correct: false, order_num: 1 },
      { id: 'opt-3-2', question_id: 'q3333333-3333-3333-3333-333333333333', option_key: 'B', option_text: 'Mengubah nomor port default manajemen (misal port Winbox dari 8291 dan SSH dari 22 ke port acak aman)', is_correct: true, order_num: 2 },
      { id: 'opt-3-3', question_id: 'q3333333-3333-3333-3333-333333333333', option_key: 'C', option_text: 'Menonaktifkan fitur DHCP Server pada antarmuka hotspot siswa', is_correct: false, order_num: 3 },
      { id: 'opt-3-4', question_id: 'q3333333-3333-3333-3333-333333333333', option_key: 'D', option_text: 'Menerapkan rule IP Firewall Filter untuk mendeteksi connection failure berulang lalu memasukkan IP penyerang ke Address-List blacklist', is_correct: true, order_num: 4 },
      { id: 'opt-3-5', question_id: 'q3333333-3333-3333-3333-333333333333', option_key: 'E', option_text: 'Membatasi parameter "Available From" pada daftar IP Services hanya untuk subnet IP Administrator', is_correct: true, order_num: 5 },
    ],
    created_at: '2026-09-03T08:00:00Z',
    updated_at: '2026-09-03T08:00:00Z',
  },
  // 4. PG Kompleks 2: Pemeliharaan Mesin Kendaraan Ringan (TKRO)
  {
    id: 'q4444444-4444-4444-4444-444444444444',
    code: 'SOAL-TKRO-001',
    subject_id: 'c5555555-5555-5555-5555-555555555555', // KJ-TKRO
    teacher_id: 'demo-guru-uuid-002',
    grade: 'XI',
    major_id: 'a2222222-2222-2222-2222-222222222222', // TKRO
    question_type: 'complex_choice',
    difficulty: 'medium',
    points: 15,
    question_text: 'Sebuah mobil penumpang mengalami indikasi suhu mesin naik ekstrem (overheating) saat dikendarai pada kecepatan konstan di jalur menanjak. Manakah faktor penyebab pada sistem pendingin berikut yang <b>BENAR</b>? <i>(Pilih lebih dari satu opsi)</i>',
    explanation: 'Overheating diakibatkan malfungsi pendingin: thermostat macet menutup (A), extra fan mati / v-belt kendor (C), dan kisi-kisi radiator tersumbat kerak/kotoran (D).',
    status: 'active',
    scoring_method: 'exact_match',
    options: [
      { id: 'opt-4-1', question_id: 'q4444444-4444-4444-4444-444444444444', option_key: 'A', option_text: 'Katup Thermostat macet dalam kondisi tertutup sehingga sirkulasi air panas ke radiator terhambat', is_correct: true, order_num: 1 },
      { id: 'opt-4-2', question_id: 'q4444444-4444-4444-4444-444444444444', option_key: 'B', option_text: 'Tekanan udara pada ban roda penggerak belakang melebihi batas standar pabrikan', is_correct: false, order_num: 2 },
      { id: 'opt-4-3', question_id: 'q4444444-4444-4444-4444-444444444444', option_key: 'C', option_text: 'Motor kipas pendingin radiator (electric cooling fan) tidak berputar saat temperatur kerja tercapai', is_correct: true, order_num: 3 },
      { id: 'opt-4-4', question_id: 'q4444444-4444-4444-4444-444444444444', option_key: 'D', option_text: 'Kisi-kisi atau sirip pendingin radiator tersumbat debu dan lumpur tebal sehingga pelepasan kalor menurun', is_correct: true, order_num: 4 },
      { id: 'opt-4-5', question_id: 'q4444444-4444-4444-4444-444444444444', option_key: 'E', option_text: 'Kanvas rem tromol mengalami keausan tidak merata', is_correct: false, order_num: 5 },
    ],
    created_at: '2026-09-04T08:00:00Z',
    updated_at: '2026-09-04T08:00:00Z',
  },
  // 5. Esai 1: Trunking 802.1Q dan PVID (TJKT)
  {
    id: 'q5555555-5555-5555-5555-555555555555',
    code: 'SOAL-TJKT-ESAI-01',
    subject_id: 'c4444444-4444-4444-4444-444444444444', // KJ-TJKT
    teacher_id: 'demo-guru-uuid-002',
    grade: 'XI',
    major_id: 'a1111111-1111-1111-1111-111111111111',
    question_type: 'essay',
    difficulty: 'hard',
    points: 25,
    question_text: 'Jelaskan prinsip kerja <b>VLAN Trunking standar IEEE 802.1Q</b> pada switch terkelola! Apa perbedaan antara frame <b>Tagged</b> dan <b>Untagged</b>, serta jelaskan fungsi dari <b>PVID (Port VLAN ID)</b> pada port mode access!',
    explanation: 'Trunking memungkinkan pengiriman traffic multi-VLAN dalam 1 media fisik dengan menyematkan header 802.1Q 4-byte (tag). Frame untagged tidak memiliki tag; PVID menyematkan VLAN ID default saat frame untagged masuk port access.',
    status: 'active',
    scoring_method: 'manual',
    essay_answer: {
      id: 'ans-5',
      question_id: 'q5555555-5555-5555-5555-555555555555',
      reference_answer: 'Standar IEEE 802.1Q menyisipkan 4 byte tag ke dalam header frame Ethernet untuk mengidentifikasi VLAN ID (1-4094). Frame Tagged membawa tag identitas saat melewati link trunk antar-switch. Frame Untagged adalah frame standar tanpa tag untuk perangkat end-user (PC/Laptop). PVID (Port VLAN ID) adalah pengenal VLAN default pada port access: setiap frame untagged yang diterima port access akan otomatis ditempatkan ke VLAN yang sesuai dengan PVID tersebut.',
      keywords: ['802.1Q', 'Trunk', 'Tagged', 'Untagged', 'PVID', 'VLAN ID', 'Port Access'],
      sample_rubric: 'Maksimal 25 Poin: Definisi 802.1Q (8 poin), Perbedaan Tagged vs Untagged (10 poin), Fungsi PVID (7 poin).',
      created_at: '2026-09-05T08:00:00Z',
    },
    created_at: '2026-09-05T08:00:00Z',
    updated_at: '2026-09-05T08:00:00Z',
  },
  // 6. Esai 2: Jurnal Penyesuaian Beban Dibayar di Muka (AKL)
  {
    id: 'q6666666-6666-6666-6666-666666666666',
    code: 'SOAL-AKL-ESAI-01',
    subject_id: 'c1111111-1111-1111-1111-111111111111', // MTK/Umum atau AKL
    teacher_id: 'demo-guru-uuid-002',
    grade: 'XI',
    major_id: 'a3333333-3333-3333-3333-333333333333', // AKL
    question_type: 'essay',
    difficulty: 'medium',
    points: 20,
    question_text: 'Pada tanggal 1 Agustus 2026, perusahaan membayar premi asuransi perlindungan gedung sebesar Rp 24.000.000 untuk masa 1 tahun dan dicatat dengan pendekatan Harta (Asuransi Dibayar di Muka). Buatlah ayat <b>Jurnal Penyesuaian</b> per 31 Desember 2026 serta jelaskan pengaruhnya terhadap Laporan Laba Rugi!',
    explanation: 'Periode 1 Agustus - 31 Desember = 5 bulan. Beban yang telah lewat waktu = (5/12) × 24.000.000 = Rp 10.000.000. Jurnal: (D) Beban Asuransi Rp 10.000.000, (K) Asuransi Dibayar di Muka Rp 10.000.000.',
    status: 'active',
    scoring_method: 'manual',
    essay_answer: {
      id: 'ans-6',
      question_id: 'q6666666-6666-6666-6666-666666666666',
      reference_answer: 'Perhitungan: Masa yang telah kadaluwarsa dari 1 Agustus s.d. 31 Desember 2026 adalah 5 bulan. Nilai Beban Asuransi = (5 / 12) × Rp 24.000.000 = Rp 10.000.000.\nJurnal Penyesuaian (31 Des 2026):\n- (Debit) Beban Asuransi : Rp 10.000.000\n- (Kredit) Asuransi Dibayar di Muka : Rp 10.000.000\nPengaruh: Beban asuransi bertambah Rp 10.000.000 pada Laporan Laba Rugi, sehingga laba bersih dilaporkan secara akurat sesuai periode akuntansi yang berjalan.',
      keywords: ['Rp 10.000.000', 'Beban Asuransi', 'Asuransi Dibayar di Muka', '5 bulan', 'Laba Rugi', 'Laba Bersih'],
      sample_rubric: 'Maksimal 20 Poin: Perhitungan tepat (6 poin), Jurnal Debit-Kredit benar (8 poin), Analisis Laporan Laba Rugi tepat (6 poin).',
      created_at: '2026-09-06T08:00:00Z',
    },
    created_at: '2026-09-06T08:00:00Z',
    updated_at: '2026-09-06T08:00:00Z',
  },
  // 7. Menjodohkan 1: Protokol Jaringan & Port (TJKT)
  {
    id: 'q7777777-7777-7777-7777-777777777777',
    code: 'SOAL-TJKT-MATCH-01',
    subject_id: 'c4444444-4444-4444-4444-444444444444', // KJ-TJKT
    teacher_id: 'demo-guru-uuid-002',
    grade: 'XI',
    major_id: 'a1111111-1111-1111-1111-111111111111', // TJKT
    question_type: 'matching',
    difficulty: 'medium',
    points: 20,
    question_text: 'Jodohkan nama <b>Protokol Jaringan</b> di sebelah kiri dengan <b>Nomor Port Standar (Well-Known Port)</b> yang benar di sebelah kanan!',
    explanation: 'Nomor port standar ditetapkan oleh IANA: HTTP=80, HTTPS=443, SSH=22, DNS=53, FTP=21.',
    status: 'active',
    scoring_method: 'exact_match',
    matching_pairs: [
      { id: 'match-1-1', question_id: 'q7777777-7777-7777-7777-777777777777', left_item: 'HTTP (Hypertext Transfer Protocol)', right_item: 'Port 80 (TCP)', correct_match_key: 'right-1', order_num: 1 },
      { id: 'match-1-2', question_id: 'q7777777-7777-7777-7777-777777777777', left_item: 'HTTPS (HTTP Secure / SSL-TLS)', right_item: 'Port 443 (TCP)', correct_match_key: 'right-2', order_num: 2 },
      { id: 'match-1-3', question_id: 'q7777777-7777-7777-7777-777777777777', left_item: 'SSH (Secure Shell Remote CLI)', right_item: 'Port 22 (TCP)', correct_match_key: 'right-3', order_num: 3 },
      { id: 'match-1-4', question_id: 'q7777777-7777-7777-7777-777777777777', left_item: 'DNS (Domain Name System Resolver)', right_item: 'Port 53 (UDP / TCP)', correct_match_key: 'right-4', order_num: 4 },
      { id: 'match-1-5', question_id: 'q7777777-7777-7777-7777-777777777777', left_item: 'FTP (File Transfer Protocol Control)', right_item: 'Port 21 (TCP)', correct_match_key: 'right-5', order_num: 5 },
    ],
    created_at: '2026-09-07T08:00:00Z',
    updated_at: '2026-09-07T08:00:00Z',
  },
  // 8. Menjodohkan 2: Komponen Mesin Otomotif & Fungsinya (TKRO)
  {
    id: 'q8888888-8888-8888-8888-888888888888',
    code: 'SOAL-TKRO-MATCH-01',
    subject_id: 'c5555555-5555-5555-5555-555555555555', // KJ-TKRO
    teacher_id: 'demo-guru-uuid-002',
    grade: 'XI',
    major_id: 'a2222222-2222-2222-2222-222222222222', // TKRO
    question_type: 'matching',
    difficulty: 'medium',
    points: 20,
    question_text: 'Pasangkan komponen <b>Mekanisme Mesin 4-Langkah</b> di kolom kiri dengan <b>Peran / Fungsi Kerjanya</b> yang sesuai di kolom kanan!',
    explanation: 'Piston menerima tekanan ledakan, Crankshaft merubah gerak translasi ke rotasi, Camshaft menggerakkan klep intake-exhaust, dan Busi menyulut campuran bahan bakar.',
    status: 'active',
    scoring_method: 'exact_match',
    matching_pairs: [
      { id: 'match-2-1', question_id: 'q8888888-8888-8888-8888-888888888888', left_item: 'Piston (Torak)', right_item: 'Menerima gaya ekspansi pembakaran gas dan meneruskannya ke batang torak', correct_match_key: 'right-1', order_num: 1 },
      { id: 'match-2-2', question_id: 'q8888888-8888-8888-8888-888888888888', left_item: 'Crankshaft (Kruk As / Poros Engkol)', right_item: 'Mengubah gerak bolak-balik (translasi) torak menjadi gerak putar roda penerus', correct_match_key: 'right-2', order_num: 2 },
      { id: 'match-2-3', question_id: 'q8888888-8888-8888-8888-888888888888', left_item: 'Camshaft (Noken As / Poros Nok)', right_item: 'Mengatur waktu pembukaan dan penutupan katup hisap (in) dan katup buang (ex)', correct_match_key: 'right-3', order_num: 3 },
      { id: 'match-2-4', question_id: 'q8888888-8888-8888-8888-888888888888', left_item: 'Busi (Spark Plug)', right_item: 'Memercikkan bunga api listrik tegangan tinggi untuk menyulut gas di ruang bakar', correct_match_key: 'right-4', order_num: 4 },
    ],
    created_at: '2026-09-08T08:00:00Z',
    updated_at: '2026-09-08T08:00:00Z',
  },
];

const ALL_INITIAL_QUESTIONS: Question[] = [
  ...INITIAL_QUESTIONS,
  ...GENERATED_MATH_QUESTIONS_50,
  ...ALL_SIMULATION_QUESTIONS,
];

export const QuestionBankProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { subjects, teachers, classes, majors } = useMasterData();
  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 8) {
          const existingIds = new Set(parsed.map((q: Question) => q.id));
          const missingSimulation = ALL_SIMULATION_QUESTIONS.filter((q) => !existingIds.has(q.id));
          const missingMath50 = GENERATED_MATH_QUESTIONS_50.filter((q) => !existingIds.has(q.id));
          if (missingSimulation.length === 0 && missingMath50.length === 0) {
            return parsed;
          }
          return [...parsed, ...missingMath50, ...missingSimulation];
        }
      } catch (e) {
        console.warn('Gagal membaca saved questions dari localStorage:', e);
      }
    }
    return ALL_INITIAL_QUESTIONS;
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Simpan ke localStorage setiap kali state questions berubah
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(questions));
    } catch (e) {
      console.warn('Gagal menyimpan questions ke localStorage:', e);
    }
  }, [questions]);

  // Sinkronisasi dengan Supabase jika aktif
  const syncWithSupabase = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      setLoading(true);
      const { data: dbQuestions, error } = await supabase
        .from('questions')
        .select(`
          *,
          question_options (*),
          question_answers (*),
          matching_pairs (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch questions notice:', error.message);
        return;
      }

      if (dbQuestions && dbQuestions.length > 0) {
        const mapped: Question[] = dbQuestions.map((q: any) => ({
          id: q.id,
          code: q.code,
          subject_id: q.subject_id,
          teacher_id: q.teacher_id,
          class_id: q.class_id || undefined,
          grade: q.grade,
          major_id: q.major_id || undefined,
          question_type: q.question_type,
          difficulty: q.difficulty,
          points: Number(q.points),
          question_text: q.question_text,
          image_url: q.image_url || undefined,
          explanation: q.explanation || undefined,
          status: q.status,
          scoring_method: q.scoring_method,
          created_at: q.created_at,
          updated_at: q.updated_at,
          options: (q.question_options || []).sort((a: any, b: any) => a.order_num - b.order_num),
          essay_answer: q.question_answers?.[0] || undefined,
          matching_pairs: (q.matching_pairs || []).sort((a: any, b: any) => a.order_num - b.order_num),
        }));
        setQuestions(mapped);
      }
    } catch (e) {
      console.warn('Sync questions error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured) {
      syncWithSupabase();
    }
  }, []);

  // Relasi populated questions dengan master data
  const populatedQuestions: Question[] = questions.map((q) => {
    const sub = subjects.find((s) => s.id === q.subject_id);
    const tch = teachers.find((t) => t.id === q.teacher_id || t.email === q.teacher_id);
    const cls = q.class_id ? classes.find((c) => c.id === q.class_id) : undefined;
    const maj = q.major_id ? majors.find((m) => m.id === q.major_id) : undefined;

    return {
      ...q,
      subject: sub,
      teacher: tch,
      school_class: cls,
      major: maj,
    };
  });

  // Tambah Soal
  const addQuestion = async (data: Omit<Question, 'id' | 'created_at' | 'updated_at'>): Promise<Question> => {
    const newId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const created: Question = {
      ...data,
      id: newId,
      created_at: now,
      updated_at: now,
      options: data.options?.map((opt, idx) => ({
        ...opt,
        id: opt.id || `opt-${Date.now()}-${idx}`,
        question_id: newId,
        order_num: idx + 1,
      })),
      essay_answer: data.essay_answer
        ? {
            ...data.essay_answer,
            id: data.essay_answer.id || `ans-${Date.now()}`,
            question_id: newId,
            created_at: now,
          }
        : undefined,
      matching_pairs: data.matching_pairs?.map((pair, idx) => ({
        ...pair,
        id: pair.id || `pair-${Date.now()}-${idx}`,
        question_id: newId,
        order_num: idx + 1,
      })),
    };

    // Push ke Supabase jika aktif
    if (isSupabaseConfigured && supabase) {
      try {
        const { error: qError } = await supabase.from('questions').insert({
          id: newId,
          code: created.code,
          subject_id: created.subject_id,
          teacher_id: created.teacher_id,
          class_id: created.class_id || null,
          grade: created.grade,
          major_id: created.major_id || null,
          question_type: created.question_type,
          difficulty: created.difficulty,
          points: created.points,
          question_text: created.question_text,
          image_url: created.image_url || null,
          explanation: created.explanation || null,
          status: created.status,
          scoring_method: created.scoring_method,
        });

        if (!qError) {
          if (created.options && created.options.length > 0) {
            await supabase.from('question_options').insert(
              created.options.map((o) => ({
                id: o.id,
                question_id: newId,
                option_key: o.option_key,
                option_text: o.option_text,
                image_url: o.image_url || null,
                is_correct: o.is_correct,
                order_num: o.order_num,
              }))
            );
          }
          if (created.essay_answer) {
            await supabase.from('question_answers').insert({
              id: created.essay_answer.id,
              question_id: newId,
              reference_answer: created.essay_answer.reference_answer,
              keywords: created.essay_answer.keywords,
              sample_rubric: created.essay_answer.sample_rubric || null,
            });
          }
          if (created.matching_pairs && created.matching_pairs.length > 0) {
            await supabase.from('matching_pairs').insert(
              created.matching_pairs.map((m) => ({
                id: m.id,
                question_id: newId,
                left_item: m.left_item,
                right_item: m.right_item,
                correct_match_key: m.correct_match_key,
                order_num: m.order_num,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Supabase insert question fallback to local:', err);
      }
    }

    setQuestions((prev) => [created, ...prev]);
    return created;
  };

  // Update Soal
  const updateQuestion = async (id: string, data: Partial<Question>): Promise<Question> => {
    const existing = questions.find((q) => q.id === id);
    if (!existing) throw new Error('Soal tidak ditemukan');

    const updated: Question = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('questions')
          .update({
            code: updated.code,
            subject_id: updated.subject_id,
            class_id: updated.class_id || null,
            grade: updated.grade,
            major_id: updated.major_id || null,
            question_type: updated.question_type,
            difficulty: updated.difficulty,
            points: updated.points,
            question_text: updated.question_text,
            image_url: updated.image_url || null,
            explanation: updated.explanation || null,
            status: updated.status,
            scoring_method: updated.scoring_method,
          })
          .eq('id', id);

        // Update options
        if (updated.options) {
          await supabase.from('question_options').delete().eq('question_id', id);
          if (updated.options.length > 0) {
            await supabase.from('question_options').insert(
              updated.options.map((o) => ({
                question_id: id,
                option_key: o.option_key,
                option_text: o.option_text,
                image_url: o.image_url || null,
                is_correct: o.is_correct,
                order_num: o.order_num,
              }))
            );
          }
        }

        // Update essay answer
        if (updated.essay_answer) {
          await supabase.from('question_answers').delete().eq('question_id', id);
          await supabase.from('question_answers').insert({
            question_id: id,
            reference_answer: updated.essay_answer.reference_answer,
            keywords: updated.essay_answer.keywords,
            sample_rubric: updated.essay_answer.sample_rubric || null,
          });
        }

        // Update matching pairs
        if (updated.matching_pairs) {
          await supabase.from('matching_pairs').delete().eq('question_id', id);
          if (updated.matching_pairs.length > 0) {
            await supabase.from('matching_pairs').insert(
              updated.matching_pairs.map((m) => ({
                question_id: id,
                left_item: m.left_item,
                right_item: m.right_item,
                correct_match_key: m.correct_match_key,
                order_num: m.order_num,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Supabase update question fallback:', err);
      }
    }

    setQuestions((prev) => prev.map((q) => (q.id === id ? updated : q)));
    return updated;
  };

  // Hapus Soal
  const deleteQuestion = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('questions').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete question fallback:', err);
      }
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    return { success: true, message: 'Soal berhasil dihapus.' };
  };

  // Duplikasi Soal (Mandatory requirement: ID baru & kode unik)
  const duplicateQuestion = async (id: string): Promise<Question> => {
    const target = questions.find((q) => q.id === id);
    if (!target) throw new Error('Soal yang akan diduplikasi tidak ditemukan.');

    const newId = `q-copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newCode = `${target.code}-SALINAN-${randomSuffix}`;

    const duplicated: Question = {
      ...target,
      id: newId,
      code: newCode,
      status: 'draft', // Set default draf setelah duplikasi agar aman
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      options: target.options?.map((opt, idx) => ({
        ...opt,
        id: `opt-${newId}-${idx}`,
        question_id: newId,
      })),
      essay_answer: target.essay_answer
        ? {
            ...target.essay_answer,
            id: `ans-${newId}`,
            question_id: newId,
          }
        : undefined,
      matching_pairs: target.matching_pairs?.map((m, idx) => ({
        ...m,
        id: `match-${newId}-${idx}`,
        question_id: newId,
      })),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('questions').insert({
          id: newId,
          code: duplicated.code,
          subject_id: duplicated.subject_id,
          teacher_id: duplicated.teacher_id,
          class_id: duplicated.class_id || null,
          grade: duplicated.grade,
          major_id: duplicated.major_id || null,
          question_type: duplicated.question_type,
          difficulty: duplicated.difficulty,
          points: duplicated.points,
          question_text: duplicated.question_text,
          image_url: duplicated.image_url || null,
          explanation: duplicated.explanation || null,
          status: duplicated.status,
          scoring_method: duplicated.scoring_method,
        });

        if (duplicated.options && duplicated.options.length > 0) {
          await supabase.from('question_options').insert(
            duplicated.options.map((o) => ({
              question_id: newId,
              option_key: o.option_key,
              option_text: o.option_text,
              image_url: o.image_url || null,
              is_correct: o.is_correct,
              order_num: o.order_num,
            }))
          );
        }
      } catch (err) {
        console.warn('Supabase duplicate fallback:', err);
      }
    }

    setQuestions((prev) => [duplicated, ...prev]);
    return duplicated;
  };

  // Toggle Status Aktif / Nonaktif
  const toggleQuestionStatus = async (id: string): Promise<void> => {
    const target = questions.find((q) => q.id === id);
    if (!target) return;

    const newStatus = target.status === 'active' ? 'inactive' : 'active';
    await updateQuestion(id, { status: newStatus });
  };

  const getQuestionById = (id: string) => {
    return populatedQuestions.find((q) => q.id === id);
  };

  // Fitur Export Soal (JSON / CSV)
  const exportQuestions = (format: 'json' | 'csv', filteredQuestions?: Question[]) => {
    const dataToExport = filteredQuestions || populatedQuestions;

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `bank_soal_tka_smkn1songgom_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      // CSV Format
      const headers = ['Kode Soal', 'Mata Pelajaran', 'Tipe Soal', 'Tingkat', 'Bobot', 'Tingkat Kesulitan', 'Status', 'Teks Soal'];
      const rows = dataToExport.map((q) => [
        `"${q.code}"`,
        `"${q.subject?.name || q.subject_id}"`,
        `"${q.question_type}"`,
        `"${q.grade}"`,
        q.points,
        `"${q.difficulty}"`,
        `"${q.status}"`,
        `"${q.question_text.replace(/"/g, '""').replace(/<[^>]*>/g, '')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', encodeURI(csvContent));
      downloadAnchor.setAttribute('download', `bank_soal_tka_smkn1songgom_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  const importQuestionsBatch = async (dataList: any[]): Promise<{ imported: number; failed: number }> => {
    let imported = 0;
    const newQuestionsToAdd: Question[] = [];

    for (const item of dataList) {
      const newId = `q-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const questionObj: Question = {
        id: newId,
        code: item.code || `SOAL-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
        subject_id: item.subject_id,
        teacher_id: item.teacher_id || 'demo-guru-uuid-002',
        grade: item.grade,
        major_id: item.major_id,
        question_type: item.question_type,
        difficulty: item.difficulty || 'medium',
        points: item.points || 10,
        question_text: item.question_text,
        explanation: item.explanation || '',
        status: item.status || 'active',
        scoring_method: item.scoring_method || 'exact_match',
        options: item.options,
        matching_pairs: item.matching_pairs,
        essay_answer: item.essay_answer,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newQuestionsToAdd.push(questionObj);
      imported++;
    }

    if (newQuestionsToAdd.length > 0) {
      setQuestions((prev) => {
        const updated = [...newQuestionsToAdd, ...prev];
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save imported questions to local storage:', e);
        }
        return updated;
      });
    }

    return { imported, failed: 0 };
  };

  return (
    <QuestionBankContext.Provider
      value={{
        questions: populatedQuestions,
        loading,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        duplicateQuestion,
        toggleQuestionStatus,
        getQuestionById,
        exportQuestions,
        importQuestionsBatch,
        syncWithSupabase,
      }}
    >
      {children}
    </QuestionBankContext.Provider>
  );
};

export const useQuestionBank = () => {
  const context = useContext(QuestionBankContext);
  if (!context) {
    throw new Error('useQuestionBank must be used within a QuestionBankProvider');
  }
  return context;
};
