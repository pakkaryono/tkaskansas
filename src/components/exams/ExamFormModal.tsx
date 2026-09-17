import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  Users,
  GraduationCap,
  Layers,
  HelpCircle,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Exam,
  ExamStatus,
  QuestionSelectionMethod,
  Question,
  QuestionType,
} from '../../types';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useQuestionBank } from '../../contexts/QuestionBankContext';
import { useAuth } from '../../contexts/AuthContext';

interface ExamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<Exam, 'id' | 'created_at' | 'updated_at'>,
    selectedQuestionIds: string[],
    selectionMethod: QuestionSelectionMethod
  ) => Promise<void>;
  initialData?: Exam | null;
  teacherSubjectIds?: string[]; // Jika diakses oleh Guru, dibatasi ke mapel ini
}

export const ExamFormModal: React.FC<ExamFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  teacherSubjectIds,
}) => {
  const { subjects, teachers, classes, majors } = useMasterData();
  const { questions } = useQuestionBank();
  const { profile } = useAuth();

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [grade, setGrade] = useState<'X' | 'XI' | 'XII'>('XI');
  const [majorId, setMajorId] = useState<string>('');
  const [targetClassIds, setTargetClassIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('2026-09-14');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('2026-09-14');
  const [endTime, setEndTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalQuestions, setTotalQuestions] = useState(50);
  const [instructions, setInstructions] = useState(
    '1. Berdoalah sebelum memulai ujian.\n2. Kerjakan soal dengan teliti dan mandiri.\n3. Ujian akan tertutup otomatis saat batas waktu berakhir.'
  );
  const [status, setStatus] = useState<ExamStatus>('scheduled');
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [passScore, setPassScore] = useState(75);

  // Question Selection Mode
  const [selectionMethod, setSelectionMethod] = useState<QuestionSelectionMethod>('random');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState<QuestionType | ''>('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter Mata Pelajaran sesuai hak akses Guru (jika ada batasan)
  const availableSubjects = useMemo(() => {
    if (teacherSubjectIds && teacherSubjectIds.length > 0) {
      return subjects.filter((s) => teacherSubjectIds.includes(s.id) || teacherSubjectIds.includes(s.code));
    }
    return subjects;
  }, [subjects, teacherSubjectIds]);

  // Daftar Kelas yang cocok dengan grade & major yang dipilih
  const relevantClasses = useMemo(() => {
    return classes.filter((c) => {
      if (c.grade !== grade) return false;
      if (majorId && majorId !== 'all' && c.major_id !== majorId) return false;
      return true;
    });
  }, [classes, grade, majorId]);

  // Pool Butir Soal yang tersedia untuk Mapel & Grade yang dipilih
  const availableBankQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (subjectId && q.subject_id !== subjectId) return false;
      if (grade && q.grade !== grade) return false;
      if (q.status !== 'active') return false;
      if (questionTypeFilter && q.question_type !== questionTypeFilter) return false;
      if (questionSearch.trim()) {
        const query = questionSearch.toLowerCase();
        const matchCode = q.code.toLowerCase().includes(query);
        const matchText = q.question_text.toLowerCase().includes(query);
        if (!matchCode && !matchText) return false;
      }
      return true;
    });
  }, [questions, subjectId, grade, questionTypeFilter, questionSearch]);

  // Total butir soal aktif di bank untuk mapel & grade ini (tanpa filter search)
  const totalEligibleQuestionsInBank = useMemo(() => {
    return questions.filter((q) => q.subject_id === subjectId && q.grade === grade && q.status === 'active').length;
  }, [questions, subjectId, grade]);

  // Inisialisasi data saat edit atau open
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setSubjectId(initialData.subject_id);
      setGrade(initialData.grade);
      setMajorId(initialData.major_id || '');
      setTargetClassIds(initialData.target_class_ids || []);

      if (initialData.start_at) {
        const dStart = new Date(initialData.start_at);
        setStartDate(dStart.toISOString().split('T')[0]);
        setStartTime(dStart.toTimeString().slice(0, 5));
      }
      if (initialData.end_at) {
        const dEnd = new Date(initialData.end_at);
        setEndDate(dEnd.toISOString().split('T')[0]);
        setEndTime(dEnd.toTimeString().slice(0, 5));
      }

      setDurationMinutes(initialData.duration_minutes);
      setTotalQuestions(initialData.total_questions);
      setInstructions(initialData.instructions || '');
      setStatus(initialData.status);
      setRandomizeQuestions(initialData.randomize_questions);
      setRandomizeOptions(initialData.randomize_options);
      setPassScore(initialData.pass_score);
      setSelectionMethod(initialData.question_selection_method);
    } else {
      // Default new exam
      setTitle('');
      setDescription('');
      setSubjectId(availableSubjects[0]?.id || '');
      setGrade('XI');
      setMajorId('');
      setTargetClassIds([]);
      setStartDate('2026-09-14');
      setStartTime('08:00');
      setEndDate('2026-09-14');
      setEndTime('10:00');
      setDurationMinutes(60);
      setTotalQuestions(50);
      setStatus('scheduled');
      setRandomizeQuestions(true);
      setRandomizeOptions(true);
      setPassScore(75);
      setSelectionMethod('random');
      setSelectedQuestionIds([]);
    }
    setError(null);
  }, [initialData, isOpen, availableSubjects]);

  // Otomatis pilih kelas yang relevan jika targetClassIds kosong saat grade/major berganti
  useEffect(() => {
    if (!initialData && relevantClasses.length > 0 && targetClassIds.length === 0) {
      setTargetClassIds(relevantClasses.map((c) => c.id));
    }
  }, [relevantClasses, targetClassIds.length, initialData]);

  if (!isOpen) return null;

  const handleToggleClass = (cid: string) => {
    setTargetClassIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const handleSelectAllClasses = () => {
    if (targetClassIds.length === relevantClasses.length) {
      setTargetClassIds([]);
    } else {
      setTargetClassIds(relevantClasses.map((c) => c.id));
    }
  };

  const handleToggleQuestion = (qid: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qid) ? prev.filter((id) => id !== qid) : [...prev, qid]
    );
  };

  const handleSelectAllQuestions = () => {
    const currentEligibleIds = availableBankQuestions.map((q) => q.id);
    const allSelected = currentEligibleIds.every((id) => selectedQuestionIds.includes(id));
    if (allSelected) {
      setSelectedQuestionIds((prev) => prev.filter((id) => !currentEligibleIds.includes(id)));
    } else {
      setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...currentEligibleIds])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validasi
    if (!title.trim()) {
      setError('Nama ujian wajib diisi.');
      return;
    }
    if (!subjectId) {
      setError('Mata pelajaran wajib dipilih.');
      return;
    }

    const startIso = `${startDate}T${startTime}:00+07:00`;
    const endIso = `${endDate}T${endTime}:00+07:00`;
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      setError('Format tanggal atau jam mulai/selesai tidak valid.');
      return;
    }

    if (endMs <= startMs) {
      setError('Waktu selesai (end_at) harus lebih besar dari waktu mulai (start_at).');
      return;
    }

    const totalWindowMinutes = Math.round((endMs - startMs) / (1000 * 60));
    if (durationMinutes > totalWindowMinutes) {
      setError(
        `Durasi ujian (${durationMinutes} menit) melebihi rentang window jadwal (${totalWindowMinutes} menit).`
      );
      return;
    }

    if (selectionMethod === 'manual' && selectedQuestionIds.length === 0) {
      setError('Metode manual dipilih, harap centang minimal 1 butir soal.');
      return;
    }

    if (selectionMethod === 'random' && totalQuestions <= 0) {
      setError('Jumlah butir soal acak harus lebih dari 0.');
      return;
    }

    if (selectionMethod === 'random' && totalQuestions > totalEligibleQuestionsInBank) {
      setError(
        `Jumlah soal acak yang diminta (${totalQuestions}) melebihi butir soal aktif yang tersedia di Bank Soal (${totalEligibleQuestionsInBank} soal).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          subject_id: subjectId,
          teacher_id: profile?.id || 'demo-guru-uuid-002',
          grade,
          major_id: majorId && majorId !== 'all' ? majorId : undefined,
          target_class_ids: targetClassIds,
          start_at: startIso,
          end_at: endIso,
          duration_minutes: Number(durationMinutes),
          total_questions: selectionMethod === 'manual' ? selectedQuestionIds.length : Number(totalQuestions),
          instructions: instructions.trim(),
          status,
          randomize_questions: randomizeQuestions,
          randomize_options: randomizeOptions,
          pass_score: Number(passScore),
          question_selection_method: selectionMethod,
        },
        selectedQuestionIds,
        selectionMethod
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan konfigurasi ujian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-scaleIn">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initialData ? 'Ubah Konfigurasi Ujian' : 'Buat Jadwal & Ujian Baru'}
              </h2>
              <p className="text-xs text-slate-500">
                Atur jadwal window pengerjaan, durasi, target rombel, dan metode snapshot butir soal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Informasi Utama */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>1. Identitas & Sasaran Ujian</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama / Judul Ujian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: TKA Matematika Terapan Kelas XI"
                  required
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tingkat Kelas <span className="text-rose-500">*</span>
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Program / Jurusan
                </label>
                <select
                  value={majorId}
                  onChange={(e) => setMajorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">Semua Jurusan (Umum / Muatan Nasional)</option>
                  {majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  KKM / Batas Kelulusan
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passScore}
                  onChange={(e) => setPassScore(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Rombongan Belajar (Rombel Peserta)
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200">
                    <span className="text-slate-500 text-[11px]">
                      {targetClassIds.length} dari {relevantClasses.length} rombel dipilih
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllClasses}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer text-[11px]"
                    >
                      {targetClassIds.length === relevantClasses.length ? 'Batal Pilih Semua' : 'Pilih Semua Rombel'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {relevantClasses.map((c) => {
                      const isChecked = targetClassIds.includes(c.id);
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => handleToggleClass(c.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs border cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Jadwal & Durasi Window */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>2. Jadwal Window & Durasi Pengerjaan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Mulai Window */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2">
                <div className="text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Mulai Window (start_at)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">Tanggal</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Jam</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Selesai Window */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2">
                <div className="text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Selesai Window (end_at)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">Tanggal</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Jam</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Durasi Pengerjaan */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2">
                <div className="text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Durasi Menit Siswa</span>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Alokasi Waktu (Menit)</label>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    required
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-blue-900"
                  />
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Info className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>Deadline siswa = min(start + durasi, end_at)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Pemilihan Soal & Pengacakan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <FileQuestion className="w-4 h-4 text-purple-600" />
                <span>3. Pemilihan Butir Soal (Snapshot)</span>
              </div>
              <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 font-semibold">
                Tersedia di Bank: {totalEligibleQuestionsInBank} Soal Aktif
              </span>
            </div>

            {/* Radio Metode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                  selectionMethod === 'random'
                    ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="selectionMethod"
                  value="random"
                  checked={selectionMethod === 'random'}
                  onChange={() => setSelectionMethod('random')}
                  className="mt-0.5 text-purple-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Metode Acak Sistem (Random Sampling)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sistem otomatis memilih sejumlah butir soal secara acak dari bank soal mata pelajaran & tingkat kelas yang sesuai.
                  </p>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                  selectionMethod === 'manual'
                    ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="selectionMethod"
                  value="manual"
                  checked={selectionMethod === 'manual'}
                  onChange={() => setSelectionMethod('manual')}
                  className="mt-0.5 text-purple-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                    <span>Metode Manual (Pilih Satu per Satu)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Guru/Admin memilih butir soal secara spesifik menggunakan daftar butir soal dengan pratinjau.
                  </p>
                </div>
              </label>
            </div>

            {/* Panel Input Sesuai Metode */}
            {selectionMethod === 'random' ? (
              <div className="p-4 bg-purple-50/30 rounded-xl border border-purple-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Jumlah Butir Soal yang Diambil dari Bank
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Contoh: Bank soal memiliki {totalEligibleQuestionsInBank} soal, ambil acak sejumlah yang Anda tentukan di bawah.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={totalEligibleQuestionsInBank || 100}
                      value={totalQuestions}
                      onChange={(e) => setTotalQuestions(Number(e.target.value))}
                      className="w-24 px-3 py-1.5 text-sm font-extrabold text-purple-900 border border-purple-300 rounded-lg bg-white text-center"
                    />
                    <span className="text-xs font-bold text-slate-600">Butir Soal</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Panel Pemilihan Manual */
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="font-bold text-slate-800">
                    Centang Butir Soal (Terpilih: {selectedQuestionIds.length} Butir)
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllQuestions}
                    className="text-purple-700 font-bold hover:underline cursor-pointer"
                  >
                    Pilih / Batal Semua Butir Terfilter
                  </button>
                </div>

                {/* Filter Cari Soal */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="relative sm:col-span-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      placeholder="Cari kode atau teks soal..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <select
                    value={questionTypeFilter}
                    onChange={(e) => setQuestionTypeFilter(e.target.value as any)}
                    className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Semua Tipe Soal</option>
                    <option value="single_choice">PG Biasa</option>
                    <option value="complex_choice">PG Kompleks</option>
                    <option value="essay">Esai</option>
                    <option value="matching">Menjodohkan</option>
                  </select>
                </div>

                {/* List Soal */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-white">
                  {availableBankQuestions.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Tidak ada butir soal yang cocok dengan filter.
                    </div>
                  ) : (
                    availableBankQuestions.map((q) => {
                      const isSelected = selectedQuestionIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => handleToggleQuestion(q.id)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-purple-50 border-purple-300'
                              : 'bg-white border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-purple-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-mono font-bold text-[11px] text-slate-800">
                                {q.code}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                {q.question_type}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {q.points} Poin
                              </span>
                            </div>
                            <p
                              className="text-slate-600 text-[11px] line-clamp-2"
                              dangerouslySetInnerHTML={{ __html: q.question_text }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Toggle Random Opsi & Soal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Acak Urutan Soal (Random Soal)</div>
                  <div className="text-[10px] text-slate-500">Urutan butir soal siswa diacak secara unik</div>
                </div>
                <button
                  type="button"
                  onClick={() => setRandomizeQuestions(!randomizeQuestions)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    randomizeQuestions ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      randomizeQuestions ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Acak Opsi Jawaban (Random Opsi)</div>
                  <div className="text-[10px] text-slate-500">Pilihan A/B/C/D/E diacak per butir pada siswa</div>
                </div>
                <button
                  type="button"
                  onClick={() => setRandomizeOptions(!randomizeOptions)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    randomizeOptions ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      randomizeOptions ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Tata Tertib & Instruksi */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
              <Info className="w-4 h-4 text-amber-600" />
              <span>4. Instruksi & Tata Tertib Peserta</span>
            </div>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Tuliskan petunjuk teknis ujian yang akan dibaca siswa sebelum mulai..."
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : initialData ? 'Perbarui Ujian' : 'Simpan & Jadwalkan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
