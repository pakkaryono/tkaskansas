import { ExamAttempt, ExamQuestion, Question } from '../types';
import { evaluateAttempt, DEFAULT_GRADE_CATEGORIES } from '../lib/gradingEngine';

export function createInitialGradingSnapshots(questions: Question[]): ExamQuestion[] {
  // Ambil 6 soal multi-tipe representatif untuk ujian standar 100 poin
  const qIds = [
    'q1111111-1111-1111-1111-111111111111', // PG Biasa 1 (10 pt)
    'q2222222-2222-2222-2222-222222222222', // PG Biasa 2 (10 pt)
    'q3333333-3333-3333-3333-333333333333', // PG Kompleks (15 pt)
    'q7777777-7777-7777-7777-777777777777', // Menjodohkan (20 pt - 5 pasang)
    'q5555555-5555-5555-5555-555555555555', // Esai 1 Jaringan (25 pt)
    'q6666666-6666-6666-6666-666666666666', // Esai 2 Akuntansi (20 pt)
  ];

  const matched = questions.filter((q) => qIds.includes(q.id));
  if (matched.length === 0) return [];

  return matched.map((q, idx) => ({
    id: `eq-closed-${idx + 1}`,
    exam_id: 'exam-tjkt-xii-closed',
    question_id: q.id,
    order_num: idx + 1,
    points: q.points || 10,
    snapshot: JSON.parse(JSON.stringify(q)),
    created_at: '2026-09-08T08:00:00Z',
  }));
}

export function createInitialSeedAttempts(examQuestions: ExamQuestion[]): ExamAttempt[] {
  const baseDate = '2026-09-08';

  // 1. Attempt 1: Muhammad Rizky Ramadhan (demo-siswa-uuid-003) - XI TJKT 1
  // Skenario: Menjodohkan 4/5 benar, Esai sudah dinilai (23/25 & 18/20), Total 92 (A)
  const rawAttempt1: ExamAttempt = {
    id: 'att-seed-001',
    exam_id: 'exam-tjkt-xii-closed',
    student_id: 'demo-siswa-uuid-003',
    start_time: `${baseDate}T06:05:00Z`,
    deadline_time: `${baseDate}T07:20:00Z`,
    end_time: `${baseDate}T06:53:30Z`,
    status: 'submitted',
    question_order: [
      'q1111111-1111-1111-1111-111111111111',
      'q2222222-2222-2222-2222-222222222222',
      'q3333333-3333-3333-3333-333333333333',
      'q7777777-7777-7777-7777-777777777777',
      'q5555555-5555-5555-5555-555555555555',
      'q6666666-6666-6666-6666-666666666666',
    ],
    option_order: {},
    answers: {
      'q1111111-1111-1111-1111-111111111111': 'A', // Benar (10)
      'q2222222-2222-2222-2222-222222222222': 'B', // Benar (10)
      'q3333333-3333-3333-3333-333333333333': ['B', 'D', 'E'], // Benar Exact Match (15)
      'q7777777-7777-7777-7777-777777777777': {
        // Menjodohkan: 4 pasang benar, 1 salah
        'match-1-1': 'Port 80 (TCP)', // Benar
        'match-1-2': 'Port 443 (TCP)', // Benar
        'match-1-3': 'Port 22 (TCP)', // Benar
        'match-1-4': 'Port 53 (UDP / TCP)', // Benar
        'match-1-5': 'Port 8080 (Proxy)', // Salah (kunci: Port 21)
      }, // 4/5 * 20 = 16 poin
      'q5555555-5555-5555-5555-555555555555':
        'VLAN Trunking standar IEEE 802.1Q bekerja dengan menyematkan header 4-byte VLAN ID ke dalam frame ethernet sehingga satu link fisik dapat dilewati multi-VLAN. Frame tagged membawa informasi VLAN ID untuk switch-to-switch, sedangkan untagged adalah frame standar untuk client. PVID berfungsi menentukan VLAN default bagi frame untagged saat memasuki port access.',
      'q6666666-6666-6666-6666-666666666666':
        'Masa yang telah lewat waktu dari 1 Agustus s.d. 31 Des 2026 adalah 5 bulan. Nilai Beban Asuransi = (5 / 12) × Rp 24.000.000 = Rp 10.000.000. Jurnal Penyesuaian: (D) Beban Asuransi Rp 10.000.000, (K) Asuransi Dibayar di Muka Rp 10.000.000. Pengaruhnya laba bersih berkurang Rp 10.000.000 pada periode berjalan.',
    },
    essay_gradings: {
      'q5555555-5555-5555-5555-555555555555': {
        score: 23,
        feedback:
          'Penjelasan mekanisme VLAN Trunking 802.1Q, perbedaan tagged/untagged, serta fungsi PVID sangat komprehensif dan tepat.',
        grader: 'Siti Aminah, S.Kom, Gr.',
        graded_at: `${baseDate}T08:30:00Z`,
      },
      'q6666666-6666-6666-6666-666666666666': {
        score: 18,
        feedback: 'Perhitungan 5 bulan tepat dan ayat jurnal penyesuaian seimbang.',
        grader: 'Siti Aminah, S.Kom, Gr.',
        graded_at: `${baseDate}T08:35:00Z`,
      },
    },
    created_at: `${baseDate}T06:05:00Z`,
    updated_at: `${baseDate}T08:35:00Z`,
  };

  // 2. Attempt 2: Nurul Hidayah (e2222222-2222-2222-2222-222222222222)
  // Skenario: Esai BELUM dinilai (Pending Grading), PG Kompleks salah (hanya pilih B, D tanpa E -> 0 poin exact match)
  const rawAttempt2: ExamAttempt = {
    id: 'att-seed-002',
    exam_id: 'exam-tjkt-xii-closed',
    student_id: 'e2222222-2222-2222-2222-222222222222',
    start_time: `${baseDate}T06:10:00Z`,
    deadline_time: `${baseDate}T07:25:00Z`,
    end_time: `${baseDate}T07:05:00Z`,
    status: 'submitted',
    question_order: [
      'q1111111-1111-1111-1111-111111111111',
      'q2222222-2222-2222-2222-222222222222',
      'q3333333-3333-3333-3333-333333333333',
      'q7777777-7777-7777-7777-777777777777',
      'q5555555-5555-5555-5555-555555555555',
      'q6666666-6666-6666-6666-666666666666',
    ],
    option_order: {},
    answers: {
      'q1111111-1111-1111-1111-111111111111': 'A', // Benar (10)
      'q2222222-2222-2222-2222-222222222222': 'A', // Salah (0)
      'q3333333-3333-3333-3333-333333333333': ['B', 'D'], // Kurang opsi E -> Exact match = 0
      'q7777777-7777-7777-7777-777777777777': {
        // Menjodohkan: 5/5 Benar
        'match-1-1': 'Port 80 (TCP)',
        'match-1-2': 'Port 443 (TCP)',
        'match-1-3': 'Port 22 (TCP)',
        'match-1-4': 'Port 53 (UDP / TCP)',
        'match-1-5': 'Port 21 (TCP)',
      }, // 20 poin
      'q5555555-5555-5555-5555-555555555555':
        'VLAN Trunking digunakan untuk menghubungkan dua switch agar VLAN yang sama pada switch berbeda bisa saling terhubung. Menggunakan standar 802.1Q.',
      'q6666666-6666-6666-6666-666666666666':
        'Jurnal: Beban asuransi Rp 10.000.000 pada Asuransi dibayar di muka Rp 10.000.000.',
    },
    essay_gradings: {}, // Belum dinilai -> Pending Grading!
    created_at: `${baseDate}T06:10:00Z`,
    updated_at: `${baseDate}T07:05:00Z`,
  };

  // 3. Attempt 3: Rian Saputra (e3333333-3333-3333-3333-333333333333)
  // Skenario: Menjodohkan 3/5 benar (12 pt), Esai dinilai (18 & 16), Total 71 (Cukup / C)
  const rawAttempt3: ExamAttempt = {
    id: 'att-seed-003',
    exam_id: 'exam-tjkt-xii-closed',
    student_id: 'e3333333-3333-3333-3333-333333333333',
    start_time: `${baseDate}T06:15:00Z`,
    deadline_time: `${baseDate}T07:30:00Z`,
    end_time: `${baseDate}T07:18:00Z`,
    status: 'submitted',
    question_order: [
      'q1111111-1111-1111-1111-111111111111',
      'q2222222-2222-2222-2222-222222222222',
      'q3333333-3333-3333-3333-333333333333',
      'q7777777-7777-7777-7777-777777777777',
      'q5555555-5555-5555-5555-555555555555',
      'q6666666-6666-6666-6666-666666666666',
    ],
    option_order: {},
    answers: {
      'q1111111-1111-1111-1111-111111111111': 'C', // Salah (0)
      'q2222222-2222-2222-2222-222222222222': 'B', // Benar (10)
      'q3333333-3333-3333-3333-333333333333': ['B', 'D', 'E'], // Benar Exact (15)
      'q7777777-7777-7777-7777-777777777777': {
        'match-1-1': 'Port 80 (TCP)', // Benar
        'match-1-2': 'Port 443 (TCP)', // Benar
        'match-1-3': 'Port 22 (TCP)', // Benar
        'match-1-4': 'Port 21 (TCP)', // Salah
        'match-1-5': 'Port 53 (UDP / TCP)', // Salah
      }, // 3/5 * 20 = 12 poin
      'q5555555-5555-5555-5555-555555555555':
        'VLAN Trunking 802.1Q menambahkan tag identifikasi VLAN pada paket data.',
      'q6666666-6666-6666-6666-666666666666':
        'Penyesuaian asuransi 5 bulan = 10 juta rupiah.',
    },
    essay_gradings: {
      'q5555555-5555-5555-5555-555555555555': {
        score: 18,
        feedback: 'Jawaban cukup baik namun penjelasan PVID belum lengkap.',
        grader: 'Siti Aminah, S.Kom, Gr.',
        graded_at: `${baseDate}T08:40:00Z`,
      },
      'q6666666-6666-6666-6666-666666666666': {
        score: 16,
        feedback: 'Hasil benar, format penjurnalan perlu dirapikan.',
        grader: 'Siti Aminah, S.Kom, Gr.',
        graded_at: `${baseDate}T08:42:00Z`,
      },
    },
    created_at: `${baseDate}T06:15:00Z`,
    updated_at: `${baseDate}T08:42:00Z`,
  };

  // 4. Attempt 4: Dinda Ayu Lestari (e4444444-4444-4444-4444-444444444444)
  // Skenario: Total 85 (Baik / B)
  const rawAttempt4: ExamAttempt = {
    id: 'att-seed-004',
    exam_id: 'exam-tjkt-xii-closed',
    student_id: 'e4444444-4444-4444-4444-444444444444',
    start_time: `${baseDate}T06:08:00Z`,
    deadline_time: `${baseDate}T07:23:00Z`,
    end_time: `${baseDate}T06:58:00Z`,
    status: 'submitted',
    question_order: [
      'q1111111-1111-1111-1111-111111111111',
      'q2222222-2222-2222-2222-222222222222',
      'q3333333-3333-3333-3333-333333333333',
      'q7777777-7777-7777-7777-777777777777',
      'q5555555-5555-5555-5555-555555555555',
      'q6666666-6666-6666-6666-666666666666',
    ],
    option_order: {},
    answers: {
      'q1111111-1111-1111-1111-111111111111': 'A', // Benar (10)
      'q2222222-2222-2222-2222-222222222222': 'B', // Benar (10)
      'q3333333-3333-3333-3333-333333333333': ['B', 'D', 'E'], // Benar Exact (15)
      'q7777777-7777-7777-7777-777777777777': {
        'match-1-1': 'Port 80 (TCP)',
        'match-1-2': 'Port 443 (TCP)',
        'match-1-3': 'Port 22 (TCP)',
        'match-1-4': 'Port 53 (UDP / TCP)',
        'match-1-5': 'Port 21 (TCP)',
      }, // 5/5 Benar (20)
      'q5555555-5555-5555-5555-555555555555':
        'VLAN Trunking memungkinkan banyak VLAN lewat 1 kabel dengan tag 802.1Q. PVID untuk vlan default pada port access.',
      'q6666666-6666-6666-6666-666666666666':
        'Beban asuransi 5 bulan = 5/12 x 24.000.000 = Rp 10.000.000. Jurnal: Beban Asuransi di debit, Asuransi dibayar di muka di kredit.',
    },
    essay_gradings: {
      'q5555555-5555-5555-5555-555555555555': {
        score: 20,
        feedback: 'Penguasaan konsep baik.',
        grader: 'Siti Aminah, S.Kom, Gr.',
        graded_at: `${baseDate}T08:45:00Z`,
      },
      'q6666666-6666-6666-6666-666666666666': {
        score: 10,
        feedback: 'Jurnal benar namun analisis laporan keuangan belum disertakan.',
        grader: 'Siti Aminah, S.Kom, Gr.',
        graded_at: `${baseDate}T08:46:00Z`,
      },
    },
    created_at: `${baseDate}T06:08:00Z`,
    updated_at: `${baseDate}T08:46:00Z`,
  };

  const rawList = [rawAttempt1, rawAttempt2, rawAttempt3, rawAttempt4];

  // Evaluasi lengkap melalui centralized gradingEngine
  return rawList.map((raw) => {
    const summary = evaluateAttempt(raw, examQuestions, DEFAULT_GRADE_CATEGORIES);
    return {
      ...raw,
      score: summary.nilai,
      total_points: summary.skor,
      maximum_points: summary.maximum_score,
      has_pending_essay: summary.pending_essay > 0,
      result_summary: summary,
    };
  });
}
