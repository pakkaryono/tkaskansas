import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Layers,
  BookOpen,
  User,
  Sparkles,
  Link
} from 'lucide-react';
import {
  Question,
  QuestionType,
  DifficultyLevel,
  QuestionStatus,
  ScoringMethod,
  QuestionOption,
  MatchingPair
} from '../../types';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { RichTextEditor } from '../common/RichTextEditor';
import { ImageUploadField } from '../common/ImageUploadField';

interface QuestionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Question, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  initialData?: Question | null;
  teacherSubjectIds?: string[]; // Jika login sebagai guru, batasi mapel
}

const DEFAULT_OPTIONS: QuestionOption[] = [
  { id: 'opt-a', option_key: 'A', option_text: '', is_correct: true, order_num: 1 },
  { id: 'opt-b', option_key: 'B', option_text: '', is_correct: false, order_num: 2 },
  { id: 'opt-c', option_key: 'C', option_text: '', is_correct: false, order_num: 3 },
  { id: 'opt-d', option_key: 'D', option_text: '', is_correct: false, order_num: 4 },
  { id: 'opt-e', option_key: 'E', option_text: '', is_correct: false, order_num: 5 },
];

const DEFAULT_MATCHING_PAIRS: MatchingPair[] = [
  { id: 'pair-1', left_item: '', right_item: '', correct_match_key: 'right-1', order_num: 1 },
  { id: 'pair-2', left_item: '', right_item: '', correct_match_key: 'right-2', order_num: 2 },
  { id: 'pair-3', left_item: '', right_item: '', correct_match_key: 'right-3', order_num: 3 },
];

export const QuestionFormModal: React.FC<QuestionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  teacherSubjectIds,
}) => {
  const { subjects, teachers, classes, majors } = useMasterData();
  const { role, profile } = useAuth();

  // Filter mata pelajaran jika login sebagai Guru
  const allowedSubjects = subjects.filter((s) => {
    if (role === 'admin' || !teacherSubjectIds) return true;
    return teacherSubjectIds.includes(s.id) || teacherSubjectIds.includes(s.code);
  });

  // State Form
  const [code, setCode] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [grade, setGrade] = useState<'X' | 'XI' | 'XII'>('XI');
  const [classId, setClassId] = useState('');
  const [majorId, setMajorId] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('single_choice');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [points, setPoints] = useState<number>(10);
  const [status, setStatus] = useState<QuestionStatus>('active');
  const [scoringMethod, setScoringMethod] = useState<ScoringMethod>('exact_match');
  const [questionText, setQuestionText] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [explanation, setExplanation] = useState('');

  // Tipe Khusus: Opsi PG (Biasa & Kompleks)
  const [options, setOptions] = useState<QuestionOption[]>(DEFAULT_OPTIONS);

  // Tipe Khusus: Esai
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [sampleRubric, setSampleRubric] = useState('');

  // Tipe Khusus: Menjodohkan
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>(DEFAULT_MATCHING_PAIRS);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Inisialisasi data saat form dibuka
  useEffect(() => {
    if (initialData) {
      setCode(initialData.code);
      setSubjectId(initialData.subject_id);
      setTeacherId(initialData.teacher_id);
      setGrade(initialData.grade);
      setClassId(initialData.class_id || '');
      setMajorId(initialData.major_id || '');
      setQuestionType(initialData.question_type);
      setDifficulty(initialData.difficulty);
      setPoints(initialData.points);
      setStatus(initialData.status);
      setScoringMethod(initialData.scoring_method);
      setQuestionText(initialData.question_text);
      setImageUrl(initialData.image_url || '');
      setExplanation(initialData.explanation || '');

      if (initialData.options && initialData.options.length > 0) {
        setOptions(initialData.options);
      } else {
        setOptions(DEFAULT_OPTIONS);
      }

      if (initialData.essay_answer) {
        setReferenceAnswer(initialData.essay_answer.reference_answer || '');
        setKeywordsText(initialData.essay_answer.keywords?.join(', ') || '');
        setSampleRubric(initialData.essay_answer.sample_rubric || '');
      } else {
        setReferenceAnswer('');
        setKeywordsText('');
        setSampleRubric('');
      }

      if (initialData.matching_pairs && initialData.matching_pairs.length > 0) {
        setMatchingPairs(initialData.matching_pairs);
      } else {
        setMatchingPairs(DEFAULT_MATCHING_PAIRS);
      }
    } else {
      // Default baru
      const defaultSubId = allowedSubjects[0]?.id || '';
      const autoCode = `SOAL-${Date.now().toString().slice(-4)}`;
      setCode(autoCode);
      setSubjectId(defaultSubId);
      setTeacherId(profile?.id || 'demo-guru-uuid-002');
      setGrade('XI');
      setClassId('');
      setMajorId(majors[0]?.id || '');
      setQuestionType('single_choice');
      setDifficulty('medium');
      setPoints(10);
      setStatus('active');
      setScoringMethod('exact_match');
      setQuestionText('');
      setImageUrl('');
      setExplanation('');
      setOptions(DEFAULT_OPTIONS);
      setReferenceAnswer('');
      setKeywordsText('');
      setSampleRubric('');
      setMatchingPairs(DEFAULT_MATCHING_PAIRS);
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Handler update opsi PG
  const handleOptionTextChange = (key: 'A' | 'B' | 'C' | 'D' | 'E', text: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.option_key === key ? { ...opt, option_text: text } : opt))
    );
  };

  const handleSingleChoiceCorrect = (key: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setOptions((prev) =>
      prev.map((opt) => ({
        ...opt,
        is_correct: opt.option_key === key,
      }))
    );
  };

  const handleComplexChoiceCorrect = (key: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setOptions((prev) =>
      prev.map((opt) => (opt.option_key === key ? { ...opt, is_correct: !opt.is_correct } : opt))
    );
  };

  // Handler Menjodohkan
  const handleMatchingPairChange = (index: number, field: 'left_item' | 'right_item', value: string) => {
    setMatchingPairs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addMatchingPair = () => {
    if (matchingPairs.length >= 8) return;
    const newIdx = matchingPairs.length + 1;
    setMatchingPairs((prev) => [
      ...prev,
      {
        id: `pair-${Date.now()}-${newIdx}`,
        left_item: '',
        right_item: '',
        correct_match_key: `right-${newIdx}`,
        order_num: newIdx,
      },
    ]);
  };

  const removeMatchingPair = (index: number) => {
    if (matchingPairs.length <= 2) return;
    setMatchingPairs((prev) => prev.filter((_, i) => i !== index));
  };

  // Validasi Form
  const validate = (): boolean => {
    const err: Record<string, string> = {};

    if (!code.trim()) err.code = 'Kode soal wajib diisi';
    if (!subjectId) err.subjectId = 'Pilih mata pelajaran';
    if (!questionText.trim()) err.questionText = 'Teks pertanyaan tidak boleh kosong';
    if (points <= 0) err.points = 'Bobot poin harus lebih besar dari 0';

    if (questionType === 'single_choice') {
      const hasEmpty = options.some((o) => !o.option_text.trim());
      if (hasEmpty) err.options = 'Seluruh opsi A sampai E harus terisi';
      const correctCount = options.filter((o) => o.is_correct).length;
      if (correctCount !== 1) err.options = 'Pilih tepat satu jawaban benar untuk PG Biasa';
    } else if (questionType === 'complex_choice') {
      const hasEmpty = options.some((o) => !o.option_text.trim());
      if (hasEmpty) err.options = 'Seluruh opsi A sampai E harus terisi';
      const correctCount = options.filter((o) => o.is_correct).length;
      if (correctCount < 2) err.options = 'Pilih minimal 2 opsi benar untuk PG Kompleks';
    } else if (questionType === 'essay') {
      if (!referenceAnswer.trim()) err.referenceAnswer = 'Jawaban acuan guru wajib diisi';
      if (!keywordsText.trim()) err.keywordsText = 'Tuliskan minimal 1 kata kunci penilaian';
    } else if (questionType === 'matching') {
      if (matchingPairs.length < 2) err.matching = 'Minimal sediakan 2 pasang item';
      const hasEmpty = matchingPairs.some((p) => !p.left_item.trim() || !p.right_item.trim());
      if (hasEmpty) err.matching = 'Seluruh baris item kiri dan kanan harus terisi lengkap';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload: Omit<Question, 'id' | 'created_at' | 'updated_at'> = {
        code: code.trim().toUpperCase(),
        subject_id: subjectId,
        teacher_id: teacherId || profile?.id || 'demo-guru-uuid-002',
        grade,
        class_id: classId || undefined,
        major_id: majorId || undefined,
        question_type: questionType,
        difficulty,
        points: Number(points),
        status,
        scoring_method: questionType === 'essay' ? 'manual' : scoringMethod,
        question_text: questionText.trim(),
        image_url: imageUrl || undefined,
        explanation: explanation.trim() || undefined,
        options: questionType === 'single_choice' || questionType === 'complex_choice' ? options : undefined,
        essay_answer:
          questionType === 'essay'
            ? {
                id: initialData?.essay_answer?.id || `ans-${Date.now()}`,
                reference_answer: referenceAnswer.trim(),
                keywords: keywordsText
                  .split(',')
                  .map((k) => k.trim())
                  .filter(Boolean),
                sample_rubric: sampleRubric.trim() || undefined,
              }
            : undefined,
        matching_pairs: questionType === 'matching' ? matchingPairs : undefined,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.message || 'Gagal menyimpan butir soal.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              {initialData ? 'Ubah Butir Soal' : 'Tambah Soal Baru'}
            </h3>
            <p className="text-xs text-slate-500">
              Form dinamis Bank Soal TKA SMKN 1 Songgom • Sesuai 4 tipe standar instrumen evaluasi
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errors.submit && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errors.submit}</span>
            </div>
          )}

          {/* 1. PEMILIHAN 4 TIPE SOAL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Pilih Tipe Instrumen Soal <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  type: 'single_choice' as QuestionType,
                  title: 'PG Biasa',
                  desc: 'Opsi A-E, 1 Kunci Benar',
                  color: 'hover:border-blue-400',
                  active: 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-100',
                },
                {
                  type: 'complex_choice' as QuestionType,
                  title: 'PG Kompleks',
                  desc: 'Opsi A-E, Multi Jawaban',
                  color: 'hover:border-purple-400',
                  active: 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-100',
                },
                {
                  type: 'essay' as QuestionType,
                  title: 'Esai Singkat',
                  desc: 'Jawaban acuan & keyword',
                  color: 'hover:border-amber-400',
                  active: 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-100',
                },
                {
                  type: 'matching' as QuestionType,
                  title: 'Menjodohkan',
                  desc: 'Pasangan Kiri & Kanan',
                  color: 'hover:border-teal-400',
                  active: 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-100',
                },
              ].map((item) => {
                const isSelected = questionType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setQuestionType(item.type)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${item.color} ${
                      isSelected ? item.active : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{item.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. METADATA SOAL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            {/* Kode Soal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kode Soal <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: SOAL-TJKT-001"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
              />
              {errors.code && <p className="text-[11px] text-rose-600 mt-1">{errors.code}</p>}
            </div>

            {/* Mata Pelajaran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mata Pelajaran <span className="text-rose-500">*</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {allowedSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
              {errors.subjectId && <p className="text-[11px] text-rose-600 mt-1">{errors.subjectId}</p>}
            </div>

            {/* Guru Pembuat */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Guru Pembuat {role === 'guru' && '(Terkunci)'}
              </label>
              {role === 'admin' ? (
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.nip})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value={profile?.full_name || 'Guru'}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-100 text-slate-600"
                />
              )}
            </div>

            {/* Tingkat */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat Kelas</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="X">Kelas X</option>
                <option value="XI">Kelas XI</option>
                <option value="XII">Kelas XII</option>
              </select>
            </div>

            {/* Jurusan Sasaran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Konsentrasi Keahlian / Jurusan</label>
              <select
                value={majorId}
                onChange={(e) => setMajorId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Semua Jurusan (Umum)</option>
                {majors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tingkat Kesulitan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat Kesulitan</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="easy">Mudah</option>
                <option value="medium">Sedang</option>
                <option value="hard">Sukar / Sulit</option>
              </select>
            </div>

            {/* Bobot Poin */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bobot Nilai (Poin)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errors.points && <p className="text-[11px] text-rose-600 mt-1">{errors.points}</p>}
            </div>

            {/* Status Soal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Publikasi</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="active">Aktif (Siap Ujian)</option>
                <option value="draft">Draf (Sedang Dibuat)</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>

            {/* Metode Penskoran untuk PG Kompleks */}
            {questionType === 'complex_choice' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Metode Penskoran</label>
                <select
                  value={scoringMethod}
                  onChange={(e) => setScoringMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="exact_match">Exact Match (Harus Tepat Semua)</option>
                  <option value="partial_credit">Parsial (Sesuai Proporsi Benar)</option>
                </select>
              </div>
            )}
          </div>

          {/* 3. RICH TEXT EDITOR UNTUK PERTANYAAN / STIMULUS */}
          <div className="space-y-1">
            <RichTextEditor
              label="Teks Pertanyaan / Stimulus Soal"
              required
              rows={4}
              value={questionText}
              onChange={setQuestionText}
              error={errors.questionText}
              placeholder="Tuliskan butir soal di sini. Gunakan toolbar di atas untuk rumus matematika, format tebal, pangkat (x²), subskrip, atau daftar."
            />
          </div>

          {/* 4. GAMBAR SOAL (SUPABASE STORAGE UPLOAD) */}
          <div>
            <ImageUploadField
              value={imageUrl}
              onChange={setImageUrl}
              onRemove={() => setImageUrl('')}
              label="Gambar Stimulus / Diagram Soal (Opsional)"
              helpText="Unggah diagram alir, skema rangkaian, foto otomotif, atau grafik soal. File disimpan di Supabase Storage."
            />
          </div>

          {/* 5. FORM KHUSUS SESUAI TIPE SOAL */}

          {/* A. PILIHAN GANDA BIASA (A-E, 1 Kunci) */}
          {questionType === 'single_choice' && (
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                    Opsi Pilihan Ganda (A s/d E)
                  </h4>
                  <p className="text-[11px] text-blue-700">
                    Pilih radio button di samping opsi yang merupakan <strong>satu-satunya kunci jawaban benar</strong>.
                  </p>
                </div>
              </div>

              {errors.options && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {errors.options}
                </div>
              )}

              <div className="space-y-2.5">
                {options.map((opt) => (
                  <div key={opt.option_key} className="flex items-center gap-2.5">
                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                      <input
                        type="radio"
                        name="single_choice_correct"
                        checked={opt.is_correct}
                        onChange={() => handleSingleChoiceCorrect(opt.option_key)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                          opt.is_correct ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {opt.option_key}
                      </span>
                    </label>

                    <input
                      type="text"
                      value={opt.option_text}
                      onChange={(e) => handleOptionTextChange(opt.option_key, e.target.value)}
                      placeholder={`Pilihan teks untuk opsi ${opt.option_key}...`}
                      className={`flex-1 px-3 py-2 text-xs border rounded-lg bg-white focus:outline-none ${
                        opt.is_correct
                          ? 'border-emerald-500 ring-1 ring-emerald-300 bg-emerald-50/20'
                          : 'border-slate-200 focus:border-blue-400'
                      }`}
                    />

                    {opt.is_correct && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-1 rounded shrink-0">
                        Kunci
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* B. PILIHAN GANDA KOMPLEKS (A-E, Multi Checkbox) */}
          {questionType === 'complex_choice' && (
            <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3">
              <div>
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                  Opsi Pilihan Ganda Kompleks (Multi-Opsi)
                </h4>
                <p className="text-[11px] text-purple-700">
                  Centang kotak checkbox di samping seluruh opsi yang bernilai <strong>BENAR</strong>. Jawaban tersimpan sebagai kumpulan array jawaban benar.
                </p>
              </div>

              {errors.options && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {errors.options}
                </div>
              )}

              <div className="space-y-2.5">
                {options.map((opt) => (
                  <div key={opt.option_key} className="flex items-center gap-2.5">
                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={opt.is_correct}
                        onChange={() => handleComplexChoiceCorrect(opt.option_key)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                      />
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                          opt.is_correct ? 'bg-purple-700 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {opt.option_key}
                      </span>
                    </label>

                    <input
                      type="text"
                      value={opt.option_text}
                      onChange={(e) => handleOptionTextChange(opt.option_key, e.target.value)}
                      placeholder={`Pilihan teks untuk opsi ${opt.option_key}...`}
                      className={`flex-1 px-3 py-2 text-xs border rounded-lg bg-white focus:outline-none ${
                        opt.is_correct
                          ? 'border-purple-500 ring-1 ring-purple-300 bg-purple-50/20'
                          : 'border-slate-200 focus:border-purple-400'
                      }`}
                    />

                    {opt.is_correct && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-purple-800 bg-purple-100 px-2 py-1 rounded shrink-0">
                        Jawaban Benar
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C. ESAI SINGKAT */}
          {questionType === 'essay' && (
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-4">
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Pedoman & Kunci Jawaban Acuan Esai
                </h4>
                <p className="text-[11px] text-amber-700">
                  Guru dan admin nantinya dapat memberikan penilaian manual serta pencocokan kata kunci otomatis.
                </p>
              </div>

              {/* Jawaban Acuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Model Kunci Jawaban Acuan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={referenceAnswer}
                  onChange={(e) => setReferenceAnswer(e.target.value)}
                  placeholder="Tuliskan jawaban lengkap yang diharapkan dari siswa..."
                  className="w-full p-3 text-xs border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 leading-relaxed"
                />
                {errors.referenceAnswer && <p className="text-[11px] text-rose-600 mt-1">{errors.referenceAnswer}</p>}
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Kunci Penilaian (Pisahkan dengan tanda koma) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  placeholder="Contoh: 802.1Q, Trunk, Tagged, Untagged, PVID"
                  className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                />
                {errors.keywordsText && <p className="text-[11px] text-rose-600 mt-1">{errors.keywordsText}</p>}
                <p className="text-[11px] text-amber-800/80 mt-1">
                  Kata kunci ini digunakan untuk mempermudah pengecekan esai pada lembar penilaian Fase 5.
                </p>
              </div>

              {/* Rubrik */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rubrik Pedoman Penskoran (Opsional)
                </label>
                <input
                  type="text"
                  value={sampleRubric}
                  onChange={(e) => setSampleRubric(e.target.value)}
                  placeholder="Contoh: Skor 25 (Lengkap), Skor 15 (Kurang PVID), Skor <10 (Parsial)"
                  className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
          )}

          {/* D. MENJODOHKAN (MATCHING PAIRS) */}
          {questionType === 'matching' && (
            <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                    Editor Pasangan Menjodohkan (Matching)
                  </h4>
                  <p className="text-[11px] text-teal-700">
                    Tuliskan item premis di sebelah kiri dan jawaban pasangan yang benar di sebelah kanan. Sistem akan mengacak urutan item kanan saat ujian.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMatchingPair}
                  disabled={matchingPairs.length >= 8}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </button>
              </div>

              {errors.matching && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {errors.matching}
                </div>
              )}

              <div className="space-y-2">
                {matchingPairs.map((pair, idx) => (
                  <div key={pair.id} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-teal-100 text-teal-900 flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>

                    <input
                      type="text"
                      value={pair.left_item}
                      onChange={(e) => handleMatchingPairChange(idx, 'left_item', e.target.value)}
                      placeholder="Item Kiri (Premis/Pertanyaan)..."
                      className="w-1/2 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-teal-500"
                    />

                    <span className="text-teal-500 font-bold shrink-0">⟷</span>

                    <input
                      type="text"
                      value={pair.right_item}
                      onChange={(e) => handleMatchingPairChange(idx, 'right_item', e.target.value)}
                      placeholder="Item Kanan (Respon/Kunci Benar)..."
                      className="w-1/2 px-3 py-2 text-xs border border-teal-300 rounded-lg bg-white focus:outline-none focus:border-teal-500 font-medium text-teal-900"
                    />

                    <button
                      type="button"
                      onClick={() => removeMatchingPair(idx)}
                      disabled={matchingPairs.length <= 2}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-30 cursor-pointer"
                      title="Hapus baris pasangan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. PEMBAHASAN SOAL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pembahasan / Solusi Soal (Opsional)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Tuliskan uraian solusi, dasar teori, atau tips cara menjawab soal ini..."
              className="w-full p-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{initialData ? 'Simpan Perubahan' : 'Tambah Soal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
