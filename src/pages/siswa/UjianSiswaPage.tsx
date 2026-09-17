import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Send,
  Save,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Flame,
  Check,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { useExam } from '../../contexts/ExamContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { StudentExamPayload, StudentQuestionItem, Student } from '../../types';
import { CbtTimer } from '../../components/exam-session/CbtTimer';
import { QuestionItemRenderer } from '../../components/exam-session/QuestionItemRenderer';
import { CbtQuestionPalette } from '../../components/exam-session/CbtQuestionPalette';
import { CbtSubmitConfirmationModal } from '../../components/exam-session/CbtSubmitConfirmationModal';
import { CbtTestRunnerModal } from '../../components/exam-session/CbtTestRunnerModal';

interface UjianSiswaPageProps {
  examId: string;
  onNavigate: (path: string) => void;
}

export const UjianSiswaPage: React.FC<UjianSiswaPageProps> = ({ examId, onNavigate }) => {
  const {
    getStudentExamPayload,
    startOrGetAttempt,
    saveStudentAnswer,
    toggleDoubtfulQuestion,
    submitAttempt,
    currentServerTime,
    isSimulatedTime,
    examAttempts,
  } = useExam();

  const { students, classes } = useMasterData();
  const { profile } = useAuth();

  // Siswa Aktif
  const currentStudent = useMemo<Student>(() => {
    const found = students.find((s) => s.id === profile?.id || s.email === profile?.email);
    if (found) return found;

    return {
      id: 'demo-siswa-uuid-001',
      user_id: 'demo-siswa-uuid-001',
      nis: '21001',
      nisn: '0051234567',
      full_name: 'Budi Siswa Pratama',
      email: 'siswa@sekolah.sch.id',
      phone: '081234567890',
      gender: 'L',
      class_id: 'b2222222-2222-2222-2222-222222222222',
      major_id: 'a1111111-1111-1111-1111-111111111111',
      status: 'active',
    };
  }, [students, profile]);

  // Payload Soal Ujian (STRIPPED SECURITY)
  const [payload, setPayload] = useState<StudentExamPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [deadlineTime, setDeadlineTime] = useState<string | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<string>('in_progress');

  // CBT State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [doubtfulIds, setDoubtfulIds] = useState<string[]>([]);

  // Autosave Status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Baru saja');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [paletteMobileOpen, setPaletteMobileOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [testRunnerOpen, setTestRunnerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autosave Debounce Ref
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Inisialisasi Ujian dan Attempt saat halaman dimuat
  useEffect(() => {
    try {
      setLoadError(null);
      // Dapatkan atau buat attempt untuk siswa ini
      const { attempt } = startOrGetAttempt(examId, currentStudent.id);
      setActiveAttemptId(attempt.id);
      setDeadlineTime(attempt.deadline_time);
      setAttemptStatus(attempt.status);
      setStudentAnswers(attempt.answers || {});
      setDoubtfulIds(attempt.doubtful_questions || []);

      // Ambil payload soal
      const p = getStudentExamPayload(examId, currentStudent.id);
      if (!p) {
        throw new Error('Data butir soal ujian tidak ditemukan atau tidak dapat dimuat.');
      }
      setPayload(p);
    } catch (err: any) {
      console.error('Error starting exam attempt:', err);
      setLoadError(err.message || 'Gagal memulai sesi ujian.');
    }
  }, [examId, currentStudent.id, startOrGetAttempt, getStudentExamPayload]);

  // Sync attempt updates (misal saat submit)
  useEffect(() => {
    if (!activeAttemptId) return;
    const currentAtt = examAttempts.find((a) => a.id === activeAttemptId);
    if (currentAtt) {
      setAttemptStatus(currentAtt.status);
      setDoubtfulIds(currentAtt.doubtful_questions || []);
    }
  }, [examAttempts, activeAttemptId]);

  // Handle Perubahan Jawaban dengan Debounce Autosave
  const handleAnswerChange = useCallback(
    (newAnswer: any) => {
      if (!payload || !activeAttemptId || attemptStatus !== 'in_progress') return;

      const currentQ = payload.questions[currentIndex];
      if (!currentQ) return;

      // Update state instan di client
      setStudentAnswers((prev) => ({
        ...prev,
        [currentQ.id]: newAnswer,
      }));

      setSaveStatus('saving');

      // Debounce penyimpanan ke context/DB
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(() => {
        try {
          saveStudentAnswer(activeAttemptId, currentQ.id, newAnswer);
          setSaveStatus('saved');
          const timeStr = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setLastSavedTime(timeStr);
          setSaveErrorMessage(null);
        } catch (err: any) {
          console.error('Autosave error:', err);
          setSaveStatus('error');
          setSaveErrorMessage(err.message || 'Gagal menyimpan');
        }
      }, 400); // 400ms debounce
    },
    [payload, activeAttemptId, currentIndex, attemptStatus, saveStudentAnswer]
  );

  // Toggle Ragu-Ragu
  const handleToggleDoubtful = () => {
    if (!payload || !activeAttemptId || attemptStatus !== 'in_progress') return;
    const currentQ = payload.questions[currentIndex];
    if (!currentQ) return;

    toggleDoubtfulQuestion(activeAttemptId, currentQ.id);
  };

  // Navigasi Soal
  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (payload && currentIndex < payload.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Submit Ujian Manual
  const handleConfirmSubmit = async () => {
    if (!activeAttemptId) return;
    setIsSubmitting(true);
    try {
      await submitAttempt(activeAttemptId);
      setAttemptStatus('submitted');
      setSubmitModalOpen(false);
    } catch (err: any) {
      alert(`Gagal mengumpulkan ujian: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto Submit saat waktu habis
  const handleTimeUp = useCallback(async () => {
    if (!activeAttemptId || attemptStatus !== 'in_progress') return;
    try {
      await submitAttempt(activeAttemptId);
      setAttemptStatus('expired');
      setSubmitModalOpen(false);
    } catch (err) {
      console.error('Auto-submit error:', err);
    }
  }, [activeAttemptId, attemptStatus, submitAttempt]);

  // Loading State
  if (!payload && !loadError) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4 p-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-base font-semibold text-slate-300">
          Mempersiapkan Lembar Soal Ujian (CBT Secure Mode)...
        </p>
      </div>
    );
  }

  // Error State (misal sebelum window jadwal, atau attempt sudah submit sebelumnya)
  if (loadError || !payload) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Tidak Dapat Mengakses Ujian</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{loadError}</p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/siswa/ujian')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
            >
              Kembali ke Jadwal Ujian
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Coba Muat Ulang
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tampilan Setelah Selesai Submit (Locked View)
  if (attemptStatus === 'submitted' || attemptStatus === 'expired') {
    const isAutoExpired = attemptStatus === 'expired';
    const totalQ = payload.questions.length;
    const answeredCount = Object.keys(studentAnswers).filter((k) => {
      const v = studentAnswers[k];
      return v !== undefined && v !== null && (typeof v === 'string' ? v.trim() !== '' : true);
    }).length;

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center">
          <div className="p-8 sm:p-10 space-y-6">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                isAutoExpired ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {isAutoExpired ? (
                <Clock className="w-10 h-10" />
              ) : (
                <CheckCircle2 className="w-10 h-10" />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {isAutoExpired ? 'Waktu Ujian Berakhir' : 'Ujian Berhasil Dikumpulkan'}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
                {isAutoExpired
                  ? 'Batas waktu pengerjaan telah habis. Seluruh jawaban Anda telah disimpan dan otomatis dikumpulkan ke server.'
                  : 'Terima kasih telah menyelesaikan ujian dengan jujur dan tertib. Lembar jawaban Anda telah tersimpan secara aman.'}
              </p>
            </div>

            {/* Ringkasan Metadata Ujian */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs sm:text-sm space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Ujian:</span>
                <span className="font-semibold text-slate-800">{payload.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Mata Pelajaran:</span>
                <span className="font-semibold text-slate-800">{payload.subject_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Peserta:</span>
                <span className="font-semibold text-slate-800">{currentStudent.full_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Status Sesi:</span>
                <span
                  className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded-full ${
                    isAutoExpired
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {attemptStatus}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Soal Terjawab:</span>
                <span className="font-bold text-emerald-600">
                  {answeredCount} dari {totalQ} Butir
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/siswa/nilai')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md active:scale-95"
              >
                Lihat Nilai & Rekapitulasi
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/siswa/ujian')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all active:scale-95"
              >
                Kembali ke Beranda Ujian
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Soal Aktif
  const currentQuestion = payload.questions[currentIndex];
  const isLastQuestion = currentIndex === payload.questions.length - 1;
  const isFirstQuestion = currentIndex === 0;
  const isCurrentDoubtful = doubtfulIds.includes(currentQuestion?.id || '');

  // Hitung jumlah terjawab
  const answeredTotal = Object.keys(studentAnswers).filter((k) => {
    const v = studentAnswers[k];
    return v !== undefined && v !== null && (typeof v === 'string' ? v.trim() !== '' : true);
  }).length;
  const unansweredTotal = payload.questions.length - answeredTotal;

  return (
    <div id="cbt-exam-root" className="min-h-screen bg-slate-100 flex flex-col select-none">
      {/* 1. STICKY TOPBAR HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Kolom Kiri: Info Ujian & Rombel */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-xs sm:text-base leading-tight truncate">
                {payload.title}
              </h1>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-300">
                <span className="truncate">{payload.subject_name}</span>
                <span>•</span>
                <span className="hidden sm:inline">Kelas {payload.grade}</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline truncate">{currentStudent.full_name}</span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Timer, Autosave Status, Palet Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Indikator Autosave */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300"
              title={`Status sinkronisasi jawaban: ${saveStatus}`}
            >
              {saveStatus === 'saving' && (
                <>
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] text-blue-300 font-medium">Menyimpan...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-300 font-medium">Tersimpan</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[11px] text-rose-300 font-medium">Belum tersimpan</span>
                </>
              )}
            </div>

            {/* Countdown Timer (Server-Side Deadline) */}
            {deadlineTime && (
              <CbtTimer
                deadlineTime={deadlineTime}
                currentServerTime={currentServerTime}
                isSimulatedTime={isSimulatedTime}
                onTimeUp={handleTimeUp}
              />
            )}

            {/* Tombol Buka Palet (Mobile) */}
            <button
              type="button"
              id="btn-open-palette-mobile"
              onClick={() => setPaletteMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-xs font-semibold"
              title="Buka Daftar Nomor Soal"
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span className="hidden xs:inline">Soal</span>
            </button>

            {/* Tombol Test Suite (Untuk Verifikasi 11 Skenario CBT) */}
            <button
              type="button"
              onClick={() => setTestRunnerOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
              title="Jalankan Simulator Uji 11 Skenario CBT"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Test CBT</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN LAYOUT AREA */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex gap-6">
        {/* Kolom Soal Utama (Kiri/Tengah) */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Card Lembar Soal */}
          <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-8 flex flex-col justify-between space-y-6">
            {/* Render Butir Soal Aktif */}
            {currentQuestion ? (
              <QuestionItemRenderer
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                currentAnswer={studentAnswers[currentQuestion.id]}
                onAnswerChange={handleAnswerChange}
                disabled={attemptStatus !== 'in_progress'}
              />
            ) : (
              <div className="p-12 text-center text-slate-500">Soal tidak ditemukan.</div>
            )}
          </div>

          {/* Spacer untuk floating bottom bar di mobile */}
          <div className="h-20 sm:h-24"></div>
        </main>

        {/* Kolom Samping Desktop: Palet Nomor Soal */}
        <aside className="hidden lg:block w-80 shrink-0 sticky top-20 self-start">
          <CbtQuestionPalette
            questions={payload.questions}
            currentIndex={currentIndex}
            answers={studentAnswers}
            doubtfulQuestionIds={doubtfulIds}
            onSelectIndex={setCurrentIndex}
          />
        </aside>
      </div>

      {/* 3. STICKY BOTTOM ACTION BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg py-3 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Tombol Sebelumnya */}
          <button
            type="button"
            id="btn-prev-question"
            disabled={isFirstQuestion}
            onClick={handlePrevQuestion}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all select-none ${
              isFirstQuestion
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Sebelumnya</span>
          </button>

          {/* Tombol Ragu-Ragu (Tengah) */}
          <button
            type="button"
            id="btn-toggle-doubtful"
            onClick={handleToggleDoubtful}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all select-none active:scale-95 border ${
              isCurrentDoubtful
                ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isCurrentDoubtful ? 'fill-current' : ''}`} />
            <span>{isCurrentDoubtful ? 'Hapus Ragu' : 'Ragu-Ragu'}</span>
          </button>

          {/* Tombol Berikutnya & Selesai */}
          <div className="flex items-center gap-2">
            {!isLastQuestion ? (
              <button
                type="button"
                id="btn-next-question"
                onClick={handleNextQuestion}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all select-none"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}

            {/* Tombol Selesai */}
            <button
              type="button"
              id="btn-open-submit-modal"
              onClick={() => setSubmitModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all select-none"
            >
              <Send className="w-4 h-4" />
              <span>Selesai</span>
            </button>
          </div>
        </div>
      </footer>

      {/* 4. MODAL DRAWER PALET NOMOR SOAL (MOBILE) */}
      {paletteMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xs h-full bg-white shadow-2xl p-2 flex flex-col">
            <CbtQuestionPalette
              questions={payload.questions}
              currentIndex={currentIndex}
              answers={studentAnswers}
              doubtfulQuestionIds={doubtfulIds}
              onSelectIndex={setCurrentIndex}
              onCloseMobile={() => setPaletteMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 5. MODAL KONFIRMASI PENGUMPULAN UJIAN */}
      <CbtSubmitConfirmationModal
        isOpen={submitModalOpen}
        totalQuestions={payload.questions.length}
        answeredCount={answeredTotal}
        unansweredCount={unansweredTotal}
        doubtfulCount={doubtfulIds.length}
        isSubmitting={isSubmitting}
        onConfirmSubmit={handleConfirmSubmit}
        onCancel={() => setSubmitModalOpen(false)}
      />

      {/* 6. MODAL TEST RUNNER (11 SKENARIO CBT) */}
      <CbtTestRunnerModal
        isOpen={testRunnerOpen}
        onClose={() => setTestRunnerOpen(false)}
        examPayload={payload}
        studentId={currentStudent.id}
      />
    </div>
  );
};
