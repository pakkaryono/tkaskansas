import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Play,
  Lock,
  Timer,
  FileQuestion,
  ShieldCheck,
  Code,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Exam, StudentExamPayload, StudentQuestionItem, Student } from '../../types';
import { useExam } from '../../contexts/ExamContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';

interface JadwalUjianSiswaPageProps {
  onNavigate?: (path: string) => void;
}

export const JadwalUjianSiswaPage: React.FC<JadwalUjianSiswaPageProps> = ({ onNavigate }) => {
  const {
    exams,
    getDynamicStatus,
    calculateDeadline,
    startOrGetAttempt,
    saveStudentAnswer,
    submitAttempt,
    getStudentExamPayload,
    currentServerTime,
    isSimulatedTime,
    resetToRealTime,
  } = useExam();

  const { students, classes, subjects } = useMasterData();
  const { profile } = useAuth();

  // Siswa Aktif (Default: Siswa XI TJKT 1)
  const currentStudent = useMemo<Student>(() => {
    // Cari siswa dengan role siswa atau fallback ke Budi Siswa (XI TJKT 1)
    const found = students.find((s) => s.id === profile?.id || s.email === profile?.email);
    if (found) return found;

    // Default Demo Siswa: XI TJKT 1
    return {
      id: 'demo-siswa-uuid-001',
      user_id: 'demo-siswa-uuid-001',
      nis: '21001',
      nisn: '0051234567',
      full_name: 'Budi Siswa Pratama',
      email: 'siswa@sekolah.sch.id',
      phone: '081234567890',
      gender: 'L',
      class_id: 'b2222222-2222-2222-2222-222222222222', // XI TJKT 1
      major_id: 'a1111111-1111-1111-1111-111111111111', // TJKT
      status: 'active',
    };
  }, [students, profile]);

  const studentClass = useMemo(() => {
    return classes.find((c) => c.id === currentStudent.class_id);
  }, [classes, currentStudent]);

  // Filter Ujian yang Ditugaskan untuk Rombel/Tingkat Siswa Ini
  const eligibleExams = useMemo(() => {
    return exams
      .filter((exam) => {
        // Cek status aktif
        if (exam.status === 'draft' || exam.status === 'archived') return false;

        // Cek tingkat kelas
        if (exam.grade && exam.grade !== studentClass?.grade) return false;

        // Cek target rombel (jika ditentukan spesifik)
        if (exam.target_class_ids && exam.target_class_ids.length > 0) {
          if (!exam.target_class_ids.includes(currentStudent.class_id)) return false;
        }

        // Cek jurusan (jika ditentukan spesifik)
        if (exam.major_id && exam.major_id !== 'all' && exam.major_id !== currentStudent.major_id) {
          return false;
        }

        return true;
      })
      .map((exam) => ({
        ...exam,
        dynamic_status: getDynamicStatus(exam),
        subject: subjects.find((s) => s.id === exam.subject_id),
      }));
  }, [exams, studentClass, currentStudent, getDynamicStatus, subjects]);

  // Exam Room State (Active Test Sesh)
  const [activeExamPayload, setActiveExamPayload] = useState<StudentExamPayload | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; totalPoints: number } | null>(null);

  // Security Payload Inspector Modal
  const [showSecurityInspection, setShowSecurityInspection] = useState(false);

  // Timer countdown hook for active exam
  useEffect(() => {
    if (!activeExamPayload?.attempt) return;

    const deadline = new Date(activeExamPayload.attempt.deadline_time).getTime();

    const updateRemaining = () => {
      const now = currentServerTime.getTime();
      const diff = Math.max(0, Math.floor((deadline - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0 && activeExamPayload.attempt?.status === 'in_progress') {
        // Auto-submit saat deadline habis!
        handleAutoSubmit();
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [activeExamPayload, currentServerTime]);

  const handleStartExam = (exam: Exam) => {
    try {
      if (onNavigate) {
        onNavigate(`/ujian/${exam.id}`);
        return;
      }

      // Mulai attempt atau ambil sesi yang sedang berjalan
      const { attempt } = startOrGetAttempt(exam.id, currentStudent.id);

      // Ambil payload aman (100% tanpa kunci jawaban)
      const payload = getStudentExamPayload(exam.id, currentStudent.id);
      if (!payload) throw new Error('Gagal memuat butir soal ujian.');

      setActiveExamPayload(payload);
      setSelectedAnswers(attempt.answers || {});
      setCurrentQuestionIndex(0);
      setExamResult(null);
    } catch (err: any) {
      alert(err.message || 'Gagal memulai ujian.');
    }
  };

  const handleSelectOption = (questionId: string, optionKey: string) => {
    const newAnswers = { ...selectedAnswers, [questionId]: optionKey };
    setSelectedAnswers(newAnswers);
    if (activeExamPayload?.attempt) {
      saveStudentAnswer(activeExamPayload.attempt.id, questionId, optionKey);
    }
  };

  const handleAutoSubmit = async () => {
    if (!activeExamPayload?.attempt) return;
    try {
      const res = await submitAttempt(activeExamPayload.attempt.id);
      setExamResult({ score: res.score || 0, totalPoints: res.total_points || 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSubmit = async () => {
    if (!confirm('Apakah Anda yakin ingin menyelesaikan dan mengirim jawaban ujian ini?')) {
      return;
    }
    if (!activeExamPayload?.attempt) return;

    try {
      setIsSubmitting(true);
      const res = await submitAttempt(activeExamPayload.attempt.id);
      setExamResult({ score: res.score || 0, totalPoints: res.total_points || 0 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // IF EXAM IS ACTIVE: RENDER CBT EXAM ROOM
  if (activeExamPayload) {
    const currentQ: StudentQuestionItem | undefined =
      activeExamPayload.questions[currentQuestionIndex];

    return (
      <div className="space-y-4 max-w-5xl mx-auto animate-fadeIn pb-12">
        {/* Header Ruang Ujian CBT */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                {activeExamPayload.subject_name}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">
                Siswa: {currentStudent.full_name} ({studentClass?.name})
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 mt-1">{activeExamPayload.title}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Box */}
            <div
              className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 font-mono font-bold text-sm ${
                (remainingSeconds || 0) < 300
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                  : 'bg-slate-900 border-slate-900 text-white'
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>{remainingSeconds !== null ? formatSeconds(remainingSeconds) : '--:--'}</span>
            </div>

            {/* Inspeksi Payload Keamanan Button */}
            <button
              type="button"
              onClick={() => setShowSecurityInspection(true)}
              className="p-2 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
              title="Inspeksi Keamanan: Verifikasi Kunci Jawaban Tersembunyi"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hasil Ujian (Jika selesai submit) */}
        {examResult ? (
          <div className="p-8 bg-white rounded-3xl border border-emerald-200 shadow-lg text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Ujian Berhasil Dikirim!</h3>
            <p className="text-xs text-slate-500">
              Jawaban Anda telah berhasil di-submit dan tersimpan secara permanen pada server CBT sekolah.
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Skor Asesmen Anda:</span>
              <div className="text-4xl font-black text-emerald-600 mt-1">{examResult.score}</div>
              <div className="text-xs text-slate-400 mt-1">KKM: {activeExamPayload.pass_score}</div>
            </div>
            <button
              type="button"
              onClick={() => setActiveExamPayload(null)}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Kembali ke Daftar Jadwal Ujian
            </button>
          </div>
        ) : (
          /* Pengerjaan Soal */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Kolom Kiri: Butir Soal & Pilihan */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between min-h-[440px]">
              {currentQ ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        {currentQuestionIndex + 1}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {currentQ.code}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {currentQ.question_type}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      Bobot: {currentQ.points} Poin
                    </span>
                  </div>

                  {/* Pertanyaan */}
                  <div
                    className="text-sm font-medium text-slate-900 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: currentQ.question_text }}
                  />

                  {/* Pilihan Opsi (PG Biasa / PG Kompleks) */}
                  {currentQ.options && currentQ.options.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      {currentQ.options.map((opt) => {
                        const isChosen = selectedAnswers[currentQ.id] === opt.option_key;
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => handleSelectOption(currentQ.id, opt.option_key)}
                            className={`w-full p-3.5 rounded-xl border text-left text-xs cursor-pointer transition-all flex items-start gap-3 ${
                              isChosen
                                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 text-slate-800'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                isChosen
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white border border-slate-300 text-slate-700'
                              }`}
                            >
                              {opt.option_key}
                            </span>
                            <span className="text-slate-800 mt-0.5 leading-relaxed">
                              {opt.option_text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Pasangan Menjodohkan (Jika tipe matching) */}
                  {currentQ.matching_pairs && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-slate-700">Pasangkan Item Kiri & Kanan:</div>
                      {currentQ.matching_pairs.map((p, idx) => (
                        <div key={p.id} className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <div className="font-semibold text-slate-800">{p.left_item}</div>
                          <div className="text-slate-600">{p.right_item}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Tombol Navigasi Soal */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Soal Sebelumnya</span>
                </button>

                <div className="text-xs text-slate-400">
                  {currentQuestionIndex + 1} dari {activeExamPayload.questions.length} Soal
                </div>

                {currentQuestionIndex === activeExamPayload.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Mengirim...' : 'Selesai & Kumpul'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentQuestionIndex((prev) =>
                        Math.min(activeExamPayload.questions.length - 1, prev + 1)
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Soal Berikutnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Kolom Kanan: Lembar Jawaban Cepat (Nomor Soal Grid) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Navigasi Nomor Soal</span>
                <span className="text-[11px] text-emerald-700 font-bold">
                  {Object.keys(selectedAnswers).length} / {activeExamPayload.questions.length} Terjawab
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 max-h-[380px] overflow-y-auto p-1">
                {activeExamPayload.questions.map((q, idx) => {
                  const isAnswered = !!selectedAnswers[q.id];
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      type="button"
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-9 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                        isCurrent
                          ? 'ring-2 ring-emerald-500 bg-emerald-600 text-white'
                          : isAnswered
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Selesaikan Ujian
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Inspection Modal inside exam room */}
        {showSecurityInspection && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 text-slate-100 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-scaleIn">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Inspeksi Keamanan: Verifikasi Zero Answer Leak
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSecurityInspection(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  ×
                </button>
              </div>
              <div className="p-3.5 bg-emerald-950/40 border-b border-emerald-800 text-xs text-emerald-300">
                Perhatikan butir soal saat ini. Kunci jawaban (<code>is_correct</code>), penjelasan, dan rubrik esai telah di-strip sepenuhnya sebelum data tiba di browser siswa!
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-[11px] text-emerald-400 leading-relaxed">
                <pre>{JSON.stringify(currentQ, null, 2)}</pre>
              </div>
              <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSecurityInspection(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DEFAULT VIEW: LIST OF ASSIGNED EXAMS FOR STUDENT
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Jadwal & Ruang Ujian Siswa
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              Kelas {studentClass?.name || 'XI'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Daftar instrumen asesmen dan ujian terjadwal yang ditugaskan untuk rombongan belajar Anda
          </p>
        </div>

        {/* Server Clock Indicator */}
        <div className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center gap-2 text-xs font-mono">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-500">Waktu Sistem:</span>
          <span className="font-bold text-slate-900">
            {currentServerTime.toLocaleTimeString('id-ID')} WIB
          </span>
        </div>
      </div>

      {/* Identitas Siswa Info Box */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
            {currentStudent.full_name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">{currentStudent.full_name}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              NIS: {currentStudent.nis} • NISN: {currentStudent.nisn} • Rombel: {studentClass?.name}
            </div>
          </div>
        </div>
        <div className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-medium">
          Status Akun: Terverifikasi Peserta Asesmen Aktif
        </div>
      </div>

      {/* Grid Ujian Tersedia */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {eligibleExams.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200 p-6">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Tidak ada jadwal ujian untuk kelas Anda</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Saat ini belum ada paket ujian yang ditugaskan ke rombel {studentClass?.name}.
            </p>
          </div>
        ) : (
          eligibleExams.map((exam) => {
            const isWindowOpen = exam.dynamic_status === 'open';
            const isScheduled = exam.dynamic_status === 'scheduled';
            const isClosed = exam.dynamic_status === 'closed';

            return (
              <div
                key={exam.id}
                className={`p-5 rounded-2xl border shadow-xs transition-all flex flex-col justify-between ${
                  isWindowOpen
                    ? 'bg-white border-emerald-300 ring-2 ring-emerald-100'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {exam.subject?.name} ({exam.subject?.code})
                    </span>

                    {isWindowOpen ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        Bisa Dimulai (Open)
                      </span>
                    ) : isScheduled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        <Clock className="w-3.5 h-3.5" />
                        Belum Dibuka (Terjadwal)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                        <Lock className="w-3.5 h-3.5" />
                        Waktu Berakhir (Closed)
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-1">{exam.title}</h3>
                  {exam.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exam.description}</p>
                  )}

                  {/* Window Details */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Alokasi Durasi:</span>
                      </span>
                      <span className="font-bold text-slate-900">{exam.duration_minutes} Menit</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <FileQuestion className="w-3.5 h-3.5 text-slate-400" />
                        <span>Jumlah Butir:</span>
                      </span>
                      <span className="font-bold text-purple-700">{exam.total_questions} Soal</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Batas Window:</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-800">
                        {formatDateTime(exam.start_at)} s.d {formatDateTime(exam.end_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    {isWindowOpen
                      ? 'Sesi siap dikerjakan'
                      : isScheduled
                      ? 'Menunggu jam buka'
                      : 'Akses ditutup'}
                  </div>

                  {isWindowOpen ? (
                    <button
                      type="button"
                      onClick={() => handleStartExam(exam)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Mulai Ujian Sekarang</span>
                    </button>
                  ) : isScheduled ? (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed"
                    >
                      Belum Dibuka
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed"
                    >
                      Ujian Selesai
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
