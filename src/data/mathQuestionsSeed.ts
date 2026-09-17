import { Question } from '../types';

// Generator 50 Butir Soal Matematika Terapan Kejuruan (MTK-SMK) Kelas XI
export const GENERATED_MATH_QUESTIONS_50: Question[] = Array.from({ length: 50 }, (_, i) => {
  const index = i + 1;
  const id = `q-mtk-50-${String(index).padStart(3, '0')}`;
  const code = `SOAL-MTK-${String(index).padStart(3, '0')}`;

  // Topik bervariasi: Matriks, Vektor, Fungsi Kuadrat, Logaritma, Trigonometri, Statistika, Barisan & Deret, Program Linier, Peluang
  const topics = [
    {
      topic: 'Matriks & Transformasi',
      question: `Diberikan matriks A = [[${index}, ${index + 1}], [2, 4]] dan matriks B = [[1, 0], [0, 1]]. Tentukan determinan dari matriks A!`,
      options: [
        { key: 'A', text: `${index * 4 - 2 * (index + 1)}`, is_correct: true },
        { key: 'B', text: `${index * 4 + 2 * (index + 1)}`, is_correct: false },
        { key: 'C', text: `${index * 2 - 4}`, is_correct: false },
        { key: 'D', text: `${index * 3}`, is_correct: false },
        { key: 'E', text: '0', is_correct: false },
      ],
      explanation: `Determinan matriks 2x2 = (a*d - b*c) = (${index}*4 - 2*(${index + 1})) = ${index * 4 - 2 * (index + 1)}.`,
    },
    {
      topic: 'Barisan dan Deret Aritmetika',
      question: `Suatu barisan aritmetika memiliki suku pertama a = ${index * 2} dan beda b = 3. Tentukan nilai suku ke-10 (U₁₀) dari barisan tersebut!`,
      options: [
        { key: 'A', text: `${index * 2 + 9 * 3}`, is_correct: true },
        { key: 'B', text: `${index * 2 + 10 * 3}`, is_correct: false },
        { key: 'C', text: `${index * 2 + 8 * 3}`, is_correct: false },
        { key: 'D', text: `${index * 2 + 30}`, is_correct: false },
        { key: 'E', text: `${index * 2 + 25}`, is_correct: false },
      ],
      explanation: `Rumus Un = a + (n - 1)b. U₁₀ = ${index * 2} + (10 - 1)*3 = ${index * 2 + 27}.`,
    },
    {
      topic: 'Trigonometri Terapan',
      question: `Sebuah antena pemancar di SMKN 1 Songgom memiliki sudut elevasi ${(index % 3 + 1) * 15 + 15}° dari jarak ${index * 10} meter. Tentukan tinggi antena menggunakan rasio tangen!`,
      options: [
        { key: 'A', text: `${index * 10} × tan(${ (index % 3 + 1) * 15 + 15 }°) m`, is_correct: true },
        { key: 'B', text: `${index * 10} × sin(${ (index % 3 + 1) * 15 + 15 }°) m`, is_correct: false },
        { key: 'C', text: `${index * 10} × cos(${ (index % 3 + 1) * 15 + 15 }°) m`, is_correct: false },
        { key: 'D', text: `${index * 10} / tan(${ (index % 3 + 1) * 15 + 15 }°) m`, is_correct: false },
        { key: 'E', text: `${index * 10} m`, is_correct: false },
      ],
      explanation: `Tinggi = Jarak mendatar × tan(sudut elevasi).`,
    },
    {
      topic: 'Statistika Inferensial',
      question: `Dari data sampel nilai asesmen siswa: [${index * 5}, ${index * 5 + 5}, ${index * 5 + 10}, ${index * 5 + 15}, ${index * 5 + 20}], berapakah nilai rata-rata (mean) dari data tersebut?`,
      options: [
        { key: 'A', text: `${index * 5 + 10}`, is_correct: true },
        { key: 'B', text: `${index * 5 + 8}`, is_correct: false },
        { key: 'C', text: `${index * 5 + 12}`, is_correct: false },
        { key: 'D', text: `${index * 5 + 5}`, is_correct: false },
        { key: 'E', text: `${index * 5 + 15}`, is_correct: false },
      ],
      explanation: `Rata-rata = Jumlah semua nilai / 5 = ${(index * 5) * 5 + 50} / 5 = ${index * 5 + 10}.`,
    },
    {
      topic: 'Fungsi Eksponen & Logaritma',
      question: `Jika ²log(${index * 4}) = x dan ²log(4) = 2, tentukan penyederhanaan ekspresi ²log(${index * 4} / 4)!`,
      options: [
        { key: 'A', text: 'x - 2', is_correct: true },
        { key: 'B', text: 'x + 2', is_correct: false },
        { key: 'C', text: '2x', is_correct: false },
        { key: 'D', text: 'x / 2', is_correct: false },
        { key: 'E', text: '2 / x', is_correct: false },
      ],
      explanation: `Sifat logaritma: log(a/b) = log(a) - log(b) -> ²log(${index * 4}) - ²log(4) = x - 2.`,
    },
  ];

  const t = topics[i % topics.length];

  return {
    id,
    code,
    subject_id: 'c1111111-1111-1111-1111-111111111111', // MTK-SMK (Matematika Terapan Kejuruan)
    teacher_id: 'demo-guru-uuid-002', // Siti Aminah
    grade: 'XI',
    major_id: undefined, // berlaku untuk semua jurusan
    question_type: 'single_choice',
    difficulty: (i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy') as any,
    points: 2, // 50 soal x 2 poin = 100 poin total
    question_text: `<b>[No. ${index} - ${t.topic}]</b> ${t.question}`,
    explanation: t.explanation,
    status: 'active',
    scoring_method: 'exact_match',
    options: t.options.map((opt, oIdx) => ({
      id: `opt-${id}-${opt.key}`,
      question_id: id,
      option_key: opt.key as any,
      option_text: opt.text,
      is_correct: opt.is_correct,
      order_num: oIdx + 1,
    })),
    created_at: '2026-09-10T08:00:00Z',
    updated_at: '2026-09-10T08:00:00Z',
  };
});
