import {
  ExamAttempt,
  ExamQuestion,
  GradeCategoryConfig,
  ExamResultSummary,
  QuestionResultDetail,
  EssayGrading,
  ItemResultStatus,
} from '../types';

export const DEFAULT_GRADE_CATEGORIES: GradeCategoryConfig[] = [
  {
    id: 'cat-a',
    min_score: 90,
    max_score: 100,
    code: 'A',
    label: 'Sangat Baik',
    badge_class: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Tuntas dengan penguasaan kompetensi sangat tinggi.',
  },
  {
    id: 'cat-b',
    min_score: 80,
    max_score: 89.99,
    code: 'B',
    label: 'Baik',
    badge_class: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Tuntas dengan penguasaan kompetensi baik.',
  },
  {
    id: 'cat-c',
    min_score: 70,
    max_score: 79.99,
    code: 'C',
    label: 'Cukup',
    badge_class: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Mencapai batas KKM minimal penguasaan materi.',
  },
  {
    id: 'cat-d',
    min_score: 0,
    max_score: 69.99,
    code: 'D',
    label: 'Perlu Bimbingan',
    badge_class: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Belum mencapai KKM dan memerlukan remedial/pembimbingan khusus.',
  },
];

/**
 * Mendapatkan Kategori Nilai Berdasarkan Skor Dinamis (Configurable)
 */
export function getGradeCategory(
  score: number,
  categories: GradeCategoryConfig[] = DEFAULT_GRADE_CATEGORIES
): GradeCategoryConfig {
  const sorted = [...categories].sort((a, b) => b.min_score - a.min_score);
  for (const cat of sorted) {
    if (score >= cat.min_score) {
      return cat;
    }
  }
  return sorted[sorted.length - 1] || DEFAULT_GRADE_CATEGORIES[3];
}

/**
 * Format durasi dari detik menjadi teks ramah pengguna
 */
export function formatDurationSeconds(seconds: number): string {
  if (seconds <= 0) return '0 Detik';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} Jam`);
  if (minutes > 0) parts.push(`${minutes} Menit`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} Detik`);

  return parts.join(' ');
}

export interface GradingOptions {
  complexScoringMethod?: 'exact_match' | 'partial_credit';
  canceledQuestionIds?: string[];
  cancelAction?: 'full_points' | 'exclude_from_max';
}

/**
 * ENGINE EVALUASI PENILAIAN TKA (CENTRALIZED / SERVER-SIDE SIMULATED)
 *
 * Mengimplementasikan seluruh aturan spesifikasi:
 * 1. PG Biasa: jawaban sama = bobot, salah = 0
 * 2. PG Kompleks: default exact_match (semua benar & tidak ada salah = bobot penuh, selain itu 0). Siap partial_credit.
 * 3. Menjodohkan: skor = (jumlah pasangan benar / total pasangan) × bobot
 * 4. Esai: pending_grading kecuali sudah dinilai manual guru (nilai, komentar, grader, graded_at)
 * 5. Total: total_score, maximum_score, nilai = (total_score / maximum_score) * 100
 * 6. Hasil: jumlah soal, benar, salah, kosong, partial, pending_essay, skor, nilai, waktu, durasi
 */
export function evaluateAttempt(
  attempt: ExamAttempt,
  examQuestions: ExamQuestion[],
  categories: GradeCategoryConfig[] = DEFAULT_GRADE_CATEGORIES,
  options?: GradingOptions
): ExamResultSummary {
  const complexMethod = options?.complexScoringMethod || 'exact_match';
  const canceledIds = options?.canceledQuestionIds || [];
  const cancelAction = options?.cancelAction || 'full_points';

  const relevantQuestions = examQuestions
    .filter((eq) => eq.exam_id === attempt.exam_id)
    .sort((a, b) => a.order_num - b.order_num);

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let partialCount = 0;
  let pendingEssayCount = 0;
  let totalEarnedScore = 0;
  let totalMaximumScore = 0;

  const itemDetails: QuestionResultDetail[] = [];

  for (const eq of relevantQuestions) {
    const q = eq.snapshot;
    const maxPoints = eq.points || q.points || 10;
    const isCanceled = canceledIds.includes(q.id);

    // Jawaban siswa dari attempt.answers
    const studentAns = attempt.answers ? attempt.answers[q.id] : undefined;

    let earnedPoints = 0;
    let status: ItemResultStatus = 'unanswered';
    let correctAnswerDisplay: string | string[] = '';
    let matchingDetail: { total_pairs: number; correct_pairs: number } | undefined;
    let essayGrading: EssayGrading | undefined;

    if (isCanceled) {
      // Perlakuan jika soal dibatalkan / dianulir saat regrading
      if (cancelAction === 'full_points') {
        earnedPoints = maxPoints;
        totalMaximumScore += maxPoints;
        status = 'correct';
        correctCount++;
      } else {
        // exclude_from_max
        earnedPoints = 0;
        status = 'correct';
      }
      correctAnswerDisplay = 'Soal Dianulir / Dibatalkan (Poin Penuh Diberikan)';
    } else {
      totalMaximumScore += maxPoints;

      // 1. EVALUASI PILIHAN GANDA BIASA (single_choice)
      if (q.question_type === 'single_choice') {
        const correctOpt = q.options?.find((o) => o.is_correct);
        correctAnswerDisplay = correctOpt
          ? `${correctOpt.option_key}. ${correctOpt.option_text}`
          : 'Kunci belum diset';

        if (!studentAns || studentAns === '') {
          status = 'unanswered';
          earnedPoints = 0;
          unansweredCount++;
        } else if (correctOpt && studentAns === correctOpt.option_key) {
          status = 'correct';
          earnedPoints = maxPoints;
          correctCount++;
        } else {
          status = 'incorrect';
          earnedPoints = 0;
          incorrectCount++;
        }
      }

      // 2. EVALUASI PILIHAN GANDA KOMPLEKS (complex_choice)
      else if (q.question_type === 'complex_choice') {
        const correctOptions = q.options?.filter((o) => o.is_correct) || [];
        const correctKeys = correctOptions.map((o) => o.option_key).sort();
        const allKeys = (q.options || []).map((o) => o.option_key);
        const incorrectKeys = allKeys.filter((k) => !correctKeys.includes(k));

        correctAnswerDisplay = correctOptions.map((o) => `${o.option_key}. ${o.option_text}`);

        const studentKeys = Array.isArray(studentAns) ? [...studentAns].sort() : [];

        if (studentKeys.length === 0) {
          status = 'unanswered';
          earnedPoints = 0;
          unansweredCount++;
        } else if (complexMethod === 'exact_match') {
          // Aturan Exact Match: Semua benar dipilih DAN tidak ada salah dipilih
          const isExact =
            studentKeys.length === correctKeys.length &&
            correctKeys.every((k) => studentKeys.includes(k));

          if (isExact) {
            status = 'correct';
            earnedPoints = maxPoints;
            correctCount++;
          } else {
            status = 'incorrect';
            earnedPoints = 0;
            incorrectCount++;
          }
        } else {
          // Struktur Partial Credit (Mendukung proporsional)
          const tp = studentKeys.filter((k) => correctKeys.includes(k)).length;
          const fp = studentKeys.filter((k) => incorrectKeys.includes(k)).length;
          const ratio = Math.max(0, (tp - fp) / Math.max(1, correctKeys.length));

          earnedPoints = Math.round(ratio * maxPoints * 100) / 100;
          if (ratio >= 0.99) {
            status = 'correct';
            correctCount++;
          } else if (ratio > 0) {
            status = 'partial';
            partialCount++;
          } else {
            status = 'incorrect';
            incorrectCount++;
          }
        }
      }

      // 3. EVALUASI MENJODOHKAN (matching)
      // Hitung berdasarkan jumlah pasangan benar: score = (jumlah pasangan benar / total pasangan) × bobot
      else if (q.question_type === 'matching') {
        const pairs = q.matching_pairs || [];
        const totalPairs = pairs.length;

        correctAnswerDisplay = pairs.map(
          (p) => `${p.left_item} ➔ ${p.right_item}`
        );

        if (
          !studentAns ||
          typeof studentAns !== 'object' ||
          Object.keys(studentAns).length === 0
        ) {
          status = 'unanswered';
          earnedPoints = 0;
          unansweredCount++;
          matchingDetail = { total_pairs: totalPairs, correct_pairs: 0 };
        } else {
          let correctPairs = 0;
          pairs.forEach((p) => {
            const studentPairAns = studentAns[p.id];
            // Siswa bisa memilih label teks right_item atau key match
            if (
              studentPairAns === p.right_item ||
              studentPairAns === p.correct_match_key
            ) {
              correctPairs++;
            }
          });

          matchingDetail = { total_pairs: totalPairs, correct_pairs: correctPairs };

          if (totalPairs > 0) {
            const ratio = correctPairs / totalPairs;
            earnedPoints = Math.round(ratio * maxPoints * 100) / 100;

            if (correctPairs === totalPairs) {
              status = 'correct';
              correctCount++;
            } else if (correctPairs > 0) {
              status = 'partial';
              partialCount++;
            } else {
              status = 'incorrect';
              incorrectCount++;
            }
          } else {
            status = 'correct';
            earnedPoints = maxPoints;
            correctCount++;
          }
        }
      }

      // 4. EVALUASI ESAI (essay)
      // Status pending_grading kecuali sudah ada penilaian manual guru/admin
      else if (q.question_type === 'essay') {
        correctAnswerDisplay = q.essay_answer?.reference_answer || 'Pedoman Kunci Jawaban Tersedia';

        const existingGrading = attempt.essay_gradings
          ? attempt.essay_gradings[q.id]
          : undefined;

        if (existingGrading && typeof existingGrading.score === 'number') {
          essayGrading = existingGrading;
          earnedPoints = Math.min(maxPoints, Math.max(0, existingGrading.score));

          if (earnedPoints === maxPoints) {
            status = 'correct';
            correctCount++;
          } else if (earnedPoints > 0) {
            status = 'partial';
            partialCount++;
          } else {
            status = 'incorrect';
            incorrectCount++;
          }
        } else {
          // Belum dinilai guru
          earnedPoints = 0;
          if (!studentAns || String(studentAns).trim() === '') {
            status = 'unanswered';
            unansweredCount++;
          } else {
            status = 'pending_grading';
            pendingEssayCount++;
          }
        }
      }
    }

    totalEarnedScore += earnedPoints;

    itemDetails.push({
      question_id: q.id,
      question_code: q.code,
      question_type: q.question_type,
      question_text: q.question_text,
      explanation: q.explanation,
      student_answer: studentAns,
      correct_answer_display: correctAnswerDisplay,
      max_points: maxPoints,
      earned_points: earnedPoints,
      status,
      matching_detail: matchingDetail,
      essay_grading: essayGrading,
      is_canceled: isCanceled,
    });
  }

  // 5. TOTAL PERHITUNGAN
  // total_score, maximum_score, nilai = total_score / maximum_score × 100
  const totalEarnedRounded = Math.round(totalEarnedScore * 100) / 100;
  const rawNilai =
    totalMaximumScore > 0 ? (totalEarnedScore / totalMaximumScore) * 100 : 0;
  const nilaiRounded = Number(rawNilai.toFixed(1));

  // 6. KATEGORI NILAI CONFIGURABLE
  const kategoriNilai = getGradeCategory(nilaiRounded, categories);

  // 7. WAKTU & DURASI
  const startTime = attempt.start_time || new Date().toISOString();
  const endTime = attempt.end_time || new Date().toISOString();
  const durasiDetik = Math.max(
    0,
    Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
    )
  );

  return {
    jumlah_soal: relevantQuestions.length,
    benar: correctCount,
    salah: incorrectCount,
    kosong: unansweredCount,
    partial: partialCount,
    pending_essay: pendingEssayCount,
    skor: totalEarnedRounded,
    maximum_score: totalMaximumScore,
    nilai: nilaiRounded,
    kategori_nilai: kategoriNilai,
    waktu_mulai: startTime,
    waktu_selesai: endTime,
    durasi_detik: durasiDetik,
    durasi: formatDurationSeconds(durasiDetik),
    item_details: itemDetails,
  };
}
