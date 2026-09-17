import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  BookOpen,
  Users,
  GraduationCap,
  Building2,
  FolderGit2,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  HelpCircle,
  ShieldCheck,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { useExam } from '../../contexts/ExamContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ExamAttempt, QuestionResultDetail } from '../../types';
import {
  ReportRowData,
  calculateReportAnalytics,
  exportReportToCSV,
  printOfficialReport,
} from '../../lib/reportUtils';
import { exportEntityToExcel } from '../../lib/excelEngine';
import { StudentResultDetailModal } from '../../components/grading/StudentResultDetailModal';
import { EssayGradingModal } from '../../components/grading/EssayGradingModal';

export const LaporanAdminPage: React.FC = () => {
  const { exams, examAttempts, getAttemptResultSummary } = useExam();
  const { students, classes, majors, subjects, teachers } = useMasterData();
  const { role } = useAuth();

  // Filters State
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [filterExamId, setFilterExamId] = useState<string>('all');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
  const [filterTeacherId, setFilterTeacherId] = useState<string>('all');
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterMajorId, setFilterMajorId] = useState<string>('all');
  const [filterStudentQuery, setFilterStudentQuery] = useState<string>('');
  const [filterStatusNilai, setFilterStatusNilai] = useState<string>('all'); // all, tuntas, remedial, pending_essay
  const [scoreMin, setScoreMin] = useState<string>('');
  const [scoreMax, setScoreMax] = useState<string>('');

  // UI View States
  const [activeTab, setActiveTab] = useState<'laporan' | 'esai' | 'distribusi'>('laporan');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Modals
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Essay Modal
  const [selectedEssayAttempt, setSelectedEssayAttempt] = useState<ExamAttempt | null>(null);
  const [selectedEssayDetail, setSelectedEssayDetail] = useState<QuestionResultDetail | null>(null);
  const [isEssayModalOpen, setIsEssayModalOpen] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Convert raw submitted/expired exam attempts to rich report rows
  const allReportRows = useMemo<ReportRowData[]>(() => {
    const completedAttempts = examAttempts.filter(
      (a) => a.status === 'submitted' || a.status === 'expired'
    );

    return completedAttempts.map((att, idx) => {
      const summary = getAttemptResultSummary(att.id);
      const student = students.find((s) => s.id === att.student_id);
      const exam = exams.find((e) => e.id === att.exam_id);
      const teacher = teachers.find((t) => t.id === exam?.teacher_id);
      const studentClass = classes.find((c) => c.id === student?.class_id);
      const major = majors.find((m) => m.id === student?.major_id || m.id === studentClass?.major_id);
      const subject = subjects.find((s) => s.id === exam?.subject_id);

      const passScore = exam?.pass_score ?? 75;
      const nilaiVal = summary?.nilai ?? (att.score ?? 0);
      const pendingEssay = summary?.pending_essay ?? 0;

      let status: 'Tuntas' | 'Remedial' | 'Menunggu Esai' | 'In Progress' = 'Remedial';
      if (pendingEssay > 0) {
        status = 'Menunggu Esai';
      } else if (nilaiVal >= passScore) {
        status = 'Tuntas';
      } else {
        status = 'Remedial';
      }

      const completedDate = att.end_time || att.updated_at || att.created_at;
      const dateObj = new Date(completedDate);
      const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : '';
      const displayDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '-';

      return {
        no: idx + 1,
        attemptId: att.id,
        studentId: att.student_id,
        studentName: student?.full_name || (student as any)?.name || 'Siswa',
        nis: student?.nis || '',
        nisn: student?.nisn || '',
        className: studentClass?.name || '-',
        majorCode: major?.code || '-',
        majorName: major?.name || '-',
        subjectName: subject?.name || 'Mata Pelajaran',
        examId: att.exam_id,
        examTitle: exam?.title || 'Ujian',
        teacherName: teacher?.full_name || 'Guru Penguji',
        date: dateStr,
        dateTimeDisplay: displayDate,
        totalQuestions: summary?.jumlah_soal ?? exam?.total_questions ?? 0,
        correct: summary?.benar ?? 0,
        incorrect: summary?.salah ?? 0,
        empty: summary?.kosong ?? 0,
        score: summary?.skor ?? 0,
        maxScore: summary?.maximum_score ?? 100,
        nilai: nilaiVal,
        duration: summary?.durasi || '-',
        status: status,
        isPassed: nilaiVal >= passScore,
        passScore: passScore,
        pendingEssay: pendingEssay,
        gradeCode: summary?.kategori_nilai?.code || (summary?.kategori_nilai as any)?.grade_code || 'B',
        gradeLabel: summary?.kategori_nilai?.label || 'Baik',
      };
    });
  }, [examAttempts, getAttemptResultSummary, students, exams, teachers, classes, majors, subjects]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return allReportRows.filter((r) => {
      // 1. Tanggal Mulai / Akhir
      if (filterDateStart && r.date < filterDateStart) return false;
      if (filterDateEnd && r.date > filterDateEnd) return false;

      // 2. Ujian
      if (filterExamId !== 'all' && r.examId !== filterExamId) return false;

      // 3. Mapel
      if (filterSubjectId !== 'all') {
        const exam = exams.find((e) => e.id === r.examId);
        if (exam?.subject_id !== filterSubjectId) return false;
      }

      // 4. Guru
      if (filterTeacherId !== 'all') {
        const exam = exams.find((e) => e.id === r.examId);
        if (exam?.teacher_id !== filterTeacherId) return false;
      }

      // 5. Kelas
      if (filterClassId !== 'all') {
        const student = students.find((s) => s.id === r.studentId);
        if (student?.class_id !== filterClassId) return false;
      }

      // 6. Jurusan
      if (filterMajorId !== 'all') {
        const student = students.find((s) => s.id === r.studentId);
        if (student?.major_id !== filterMajorId) return false;
      }

      // 7. Siswa (Search by Name / NIS / NISN)
      if (filterStudentQuery.trim()) {
        const q = filterStudentQuery.toLowerCase();
        const matchName = r.studentName.toLowerCase().includes(q);
        const matchNis = r.nis.toLowerCase().includes(q);
        const matchNisn = r.nisn.toLowerCase().includes(q);
        if (!matchName && !matchNis && !matchNisn) return false;
      }

      // 8. Filter Nilai (Status / Range)
      if (filterStatusNilai === 'tuntas' && !r.isPassed) return false;
      if (filterStatusNilai === 'remedial' && r.isPassed) return false;
      if (filterStatusNilai === 'pending_essay' && r.pendingEssay === 0) return false;

      if (scoreMin !== '' && r.nilai < Number(scoreMin)) return false;
      if (scoreMax !== '' && r.nilai > Number(scoreMax)) return false;

      return true;
    });
  }, [
    allReportRows,
    filterDateStart,
    filterDateEnd,
    filterExamId,
    filterSubjectId,
    filterTeacherId,
    filterClassId,
    filterMajorId,
    filterStudentQuery,
    filterStatusNilai,
    scoreMin,
    scoreMax,
    exams,
    students,
  ]);

  // Analytics for filtered results
  const analytics = useMemo(() => {
    return calculateReportAnalytics(filteredRows);
  }, [filteredRows]);

  // Pending essay list across all attempts
  const pendingEssayQueue = useMemo(() => {
    const queue: Array<{
      attempt: ExamAttempt;
      detail: QuestionResultDetail;
      studentName: string;
      studentNisn: string;
      studentClass: string;
      examTitle: string;
      teacherName: string;
    }> = [];

    examAttempts
      .filter((a) => a.status === 'submitted' || a.status === 'expired')
      .forEach((att) => {
        const summary = getAttemptResultSummary(att.id);
        if (!summary || summary.pending_essay === 0) return;

        const student = students.find((s) => s.id === att.student_id);
        const exam = exams.find((e) => e.id === att.exam_id);
        const teacher = teachers.find((t) => t.id === exam?.teacher_id);
        const studentClass = classes.find((c) => c.id === student?.class_id);

        summary.question_details?.forEach((qd) => {
          if (qd.question_type === 'essay' && qd.status === 'pending_grading') {
            queue.push({
              attempt: att,
              detail: qd,
              studentName: student?.full_name || (student as any)?.name || 'Siswa',
              studentNisn: student?.nisn || '-',
              studentClass: studentClass?.name || '-',
              examTitle: exam?.title || 'Ujian',
              teacherName: teacher?.full_name || 'Guru Penguji',
            });
          }
        });
      });

    return queue;
  }, [examAttempts, getAttemptResultSummary, students, exams, teachers, classes]);

  const handleResetFilters = () => {
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterExamId('all');
    setFilterSubjectId('all');
    setFilterTeacherId('all');
    setFilterClassId('all');
    setFilterMajorId('all');
    setFilterStudentQuery('');
    setFilterStatusNilai('all');
    setScoreMin('');
    setScoreMax('');
    triggerToast('Filter telah direset ke setelan awal.');
  };

  const getFilterSummaryText = () => {
    const parts: string[] = [];
    if (filterExamId !== 'all') {
      const e = exams.find((x) => x.id === filterExamId);
      if (e) parts.push(`Ujian: ${e.title}`);
    }
    if (filterSubjectId !== 'all') {
      const s = subjects.find((x) => x.id === filterSubjectId);
      if (s) parts.push(`Mapel: ${s.name}`);
    }
    if (filterClassId !== 'all') {
      const c = classes.find((x) => x.id === filterClassId);
      if (c) parts.push(`Kelas: ${c.name}`);
    }
    if (filterTeacherId !== 'all') {
      const t = teachers.find((x) => x.id === filterTeacherId);
      if (t) parts.push(`Guru: ${t.full_name}`);
    }
    if (filterStatusNilai !== 'all') {
      parts.push(`Status: ${filterStatusNilai}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'Semua Data Terpilih';
  };

  // Handlers for export (.xlsx)
  const handleExportExcel = () => {
    try {
      exportEntityToExcel(
        'laporan',
        filteredRows,
        undefined,
        `Laporan_Hasil_Ujian_TKA_Admin_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      triggerToast(`Berhasil mengekspor ${filteredRows.length} baris laporan ke format Excel (.xlsx).`);
    } catch (err: any) {
      triggerToast(`Gagal mengekspor laporan: ${err.message}`);
    }
  };

  const handlePrint = () => {
    printOfficialReport(filteredRows, {
      title: 'Laporan Rekapitulasi Hasil Ujian TKA',
      filterSummary: getFilterSummaryText(),
      analytics,
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Fase 7: Pusat Laporan & Statistik
            </span>
            <span className="text-xs text-slate-400 font-medium">•</span>
            <span className="text-xs text-slate-500 font-medium">Administrator CBT</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            <span>Laporan Hasil Ujian Seluruh Siswa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Pantau capaian nilai ujian peserta didik, analisis ketuntasan KKM, periksa lembar jawaban siswa,
            serta cetak dan ekspor rekapitulasi nilai secara akurat.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            disabled={filteredRows.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            title="Export Excel (CSV)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={filteredRows.length === 0}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            title="Cetak Laporan Resmi"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Laporan, Esai Queue, Distribusi Nilai) */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('laporan')}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'laporan'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>Rekapitulasi Nilai Siswa</span>
            <span className="ml-1 px-2 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-black">
              {filteredRows.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('esai')}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'esai'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Antrean Koreksi Esai</span>
            {pendingEssayQueue.length > 0 && (
              <span className="ml-1 px-2 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700 font-black animate-pulse">
                {pendingEssayQueue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('distribusi')}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'distribusi'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Statistik & Distribusi Nilai</span>
          </button>
        </div>

        {/* View Toggle (Table vs Cards for Mobile/Tablet) */}
        {activeTab === 'laporan' && (
          <div className="flex items-center gap-1 pb-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'table' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Tampilan Tabel Lengkap"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'cards' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Tampilan Kartu Siswa"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* DASHBOARD ANALYTICS CARDS (Admin Level) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Peserta
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{analytics.totalParticipants}</span>
            <span className="text-xs text-slate-500 font-semibold">Siswa</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>Hasil Ujian</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Rata-Rata Nilai
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-600">{analytics.averageNilai}</span>
            <span className="text-xs text-slate-400 font-semibold">/ 100</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {analytics.averageNilai >= 75 ? (
              <span className="text-emerald-600 font-bold">Memenuhi KKM (≥75)</span>
            ) : (
              <span className="text-amber-600 font-bold">Di Bawah KKM (&lt;75)</span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Nilai Tertinggi
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600">{analytics.highestNilai}</span>
            <span className="text-xs text-slate-400 font-semibold">Poin</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            <span>Skor Maksimal</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Nilai Terendah
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-600">{analytics.lowestNilai}</span>
            <span className="text-xs text-slate-400 font-semibold">Poin</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>Perlu remedial</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Ketuntasan (KKM)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{analytics.passingRate}%</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="font-bold text-emerald-600">{analytics.passedCount} Tuntas</span> /{' '}
            <span className="font-bold text-rose-600">{analytics.failedCount} Remedial</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Menunggu Esai
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black ${
                analytics.pendingEssayCount > 0 ? 'text-purple-600 animate-pulse' : 'text-slate-900'
              }`}
            >
              {analytics.pendingEssayCount}
            </span>
            <span className="text-xs text-slate-400 font-semibold">Siswa</span>
          </div>
          <div className="mt-2 text-[11px] text-purple-600 font-semibold">
            {analytics.pendingEssayCount > 0 ? 'Perlu koreksi guru' : 'Semua dinilai'}
          </div>
        </div>
      </div>

      {/* FILTER SECTION (Tanggal, Ujian, Mapel, Guru, Kelas, Jurusan, Siswa, Nilai) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Filter Parameter Laporan
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>{showAdvancedFilters ? 'Sembunyikan Filter Lanjutan' : 'Tampilkan Filter Lanjutan'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Primary Filters (Row 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Siswa Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cari Siswa / NISN</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterStudentQuery}
                onChange={(e) => setFilterStudentQuery(e.target.value)}
                placeholder="Nama, NIS, atau NISN..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Ujian Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Pilih Ujian</label>
            <select
              value={filterExamId}
              onChange={(e) => setFilterExamId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Ujian ({exams.length})</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>

          {/* Mata Pelajaran Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Mata Pelajaran</label>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Mata Pelajaran ({subjects.length})</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kelas Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Rombel / Kelas</label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Kelas ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filters (Row 2 Collapsible) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs animate-in fade-in duration-200">
            {/* Guru Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Guru Penguji</label>
              <select
                value={filterTeacherId}
                onChange={(e) => setFilterTeacherId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Guru ({teachers.length})</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Jurusan Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Kompetensi Keahlian (Jurusan)</label>
              <select
                value={filterMajorId}
                onChange={(e) => setFilterMajorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Jurusan ({majors.length})</option>
                {majors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Nilai / Ketuntasan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Ketuntasan</label>
              <select
                value={filterStatusNilai}
                onChange={(e) => setFilterStatusNilai(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Status</option>
                <option value="tuntas">Tuntas (Nilai ≥ KKM)</option>
                <option value="remedial">Remedial (Nilai &lt; KKM)</option>
                <option value="pending_essay">Menunggu Koreksi Esai</option>
              </select>
            </div>

            {/* Tanggal Range */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Rentang Tanggal Ujian</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                  className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: REKAPITULASI NILAI SISWA */}
      {activeTab === 'laporan' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* View Mode: Table (Desktop) */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Nama Siswa</th>
                    <th className="px-3 py-3">NIS / NISN</th>
                    <th className="px-3 py-3">Kelas</th>
                    <th className="px-3 py-3">Jurusan</th>
                    <th className="px-4 py-3">Mata Pelajaran</th>
                    <th className="px-4 py-3">Ujian</th>
                    <th className="px-3 py-3 text-center">Soal</th>
                    <th className="px-3 py-3 text-center">B / S / K</th>
                    <th className="px-3 py-3 text-center">Skor</th>
                    <th className="px-3 py-3 text-center">Nilai</th>
                    <th className="px-3 py-3 text-center">Durasi</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-12 text-center text-slate-400 italic">
                        Tidak ada data hasil ujian yang cocok dengan kriteria filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => {
                      const att = examAttempts.find((a) => a.id === r.attemptId);
                      return (
                        <tr key={r.attemptId} className="hover:bg-slate-50/70 transition">
                          <td className="px-3.5 py-3 text-center font-medium text-slate-400">
                            {idx + 1}
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{r.studentName}</p>
                            <p className="text-[10.5px] text-slate-400">{r.dateTimeDisplay}</p>
                          </td>

                          <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                            {r.nisn || r.nis || '-'}
                          </td>

                          <td className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">
                            {r.className}
                          </td>

                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {r.majorCode}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-medium text-slate-800 max-w-[150px] truncate" title={r.subjectName}>
                            {r.subjectName}
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-900 max-w-[170px] truncate" title={r.examTitle}>
                            {r.examTitle}
                          </td>

                          <td className="px-3 py-3 text-center font-semibold text-slate-700">
                            {r.totalQuestions}
                          </td>

                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span className="font-bold text-emerald-600">{r.correct}</span> /{' '}
                            <span className="font-bold text-rose-600">{r.incorrect}</span> /{' '}
                            <span className="font-bold text-amber-600">{r.empty}</span>
                          </td>

                          <td className="px-3 py-3 text-center font-semibold text-slate-700">
                            {r.score}/{r.maxScore}
                          </td>

                          <td className="px-3 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span
                                className={`text-sm font-black ${
                                  r.isPassed ? 'text-indigo-600' : 'text-rose-600'
                                }`}
                              >
                                {r.nilai}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                Predikat {r.gradeCode}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-center text-slate-500 whitespace-nowrap">
                            {r.duration}
                          </td>

                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            {r.pendingEssay > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 animate-pulse">
                                <Clock className="w-3 h-3" /> {r.pendingEssay} Esai
                              </span>
                            ) : r.isPassed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Tuntas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <XCircle className="w-3 h-3" /> Remedial
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                if (att) {
                                  setSelectedAttempt(att);
                                  setIsDetailModalOpen(true);
                                }
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* View Mode: Card Grid (Mobile-friendly layout) */
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredRows.map((r) => {
                const att = examAttempts.find((a) => a.id === r.attemptId);
                return (
                  <div
                    key={r.attemptId}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {r.className} • {r.majorCode}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{r.studentName}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">NISN: {r.nisn || '-'}</p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xl font-black block ${
                            r.isPassed ? 'text-indigo-600' : 'text-rose-600'
                          }`}
                        >
                          {r.nilai}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Grade {r.gradeCode}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 border-t border-b border-slate-100 py-2">
                      <p className="font-semibold text-slate-800 line-clamp-1">{r.examTitle}</p>
                      <p className="text-[11px] text-slate-500">{r.subjectName}</p>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>
                          Benar: <strong className="text-emerald-600">{r.correct}</strong> / Salah:{' '}
                          <strong className="text-rose-600">{r.incorrect}</strong>
                        </span>
                        <span>Durasi: {r.duration}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {r.pendingEssay > 0 ? (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                          {r.pendingEssay} Esai Belum Dinilai
                        </span>
                      ) : r.isPassed ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          Tuntas (KKM {r.passScore})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
                          Remedial (&lt; {r.passScore})
                        </span>
                      )}

                      <button
                        onClick={() => {
                          if (att) {
                            setSelectedAttempt(att);
                            setIsDetailModalOpen(true);
                          }
                        }}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Jawaban</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Menampilkan <strong>{filteredRows.length}</strong> hasil pengerjaan ujian dari total{' '}
              <strong>{allReportRows.length}</strong> data.
            </span>
            <span className="text-[11px] text-slate-400">
              SMKN 1 Songgom • Terverifikasi Server CBT
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: ANTREAN KOREKSI ESAI */}
      {activeTab === 'esai' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>Daftar Jawaban Esai Menunggu Penilaian</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluasi jawaban siswa, periksa rubrik dan kata kunci acuan, lalu masukkan skor dan umpan balik.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
              {pendingEssayQueue.length} Jawaban Pending
            </span>
          </div>

          {pendingEssayQueue.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">Semua Soal Esai Telah Dinilai!</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tidak ada lembar jawaban esai siswa yang tertunda saat ini. Seluruh nilai rapor telah lengkap.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {pendingEssayQueue.map((item, idx) => (
                <div key={`${item.attempt.id}-${item.detail.question_id}-${idx}`} className="p-4 hover:bg-slate-50 transition space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 mr-2">
                        Soal #{item.detail.order_num} • Max {item.detail.max_points} Poin
                      </span>
                      <strong className="text-slate-900 text-xs">{item.studentName}</strong>
                      <span className="text-slate-400 text-xs"> ({item.studentClass})</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedEssayAttempt(item.attempt);
                        setSelectedEssayDetail(item.detail);
                        setIsEssayModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Koreksi & Beri Nilai</span>
                    </button>
                  </div>

                  <p className="text-xs font-medium text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 line-clamp-2">
                    {item.detail.question_text}
                  </p>

                  <div className="text-xs text-slate-600 bg-purple-50/30 p-2.5 rounded-lg border border-purple-100 line-clamp-2 font-mono text-[11px]">
                    <span className="font-bold text-purple-900 font-sans block mb-0.5">Jawaban Siswa:</span>
                    {typeof item.detail.student_answer === 'string' && item.detail.student_answer.trim()
                      ? item.detail.student_answer
                      : '(Kosong / Tidak Menjawab)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STATISTIK & DISTRIBUSI NILAI */}
      {activeTab === 'distribusi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribusi Nilai (Histogram Bar Chart) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Distribusi Capaian Skor Siswa</span>
            </h3>
            <p className="text-xs text-slate-500">
              Sebaran interval nilai hasil ujian berdasarkan filter data yang sedang aktif.
            </p>

            <div className="space-y-4 pt-2">
              {/* Sangat Baik */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-800">Sangat Baik (85 - 100)</span>
                  <span className="text-indigo-600">
                    {analytics.distribution.sangatBaik.count} Siswa ({analytics.distribution.sangatBaik.percentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.distribution.sangatBaik.percentage}%` }}
                  />
                </div>
              </div>

              {/* Baik */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-800">Baik (75 - 84)</span>
                  <span className="text-emerald-600">
                    {analytics.distribution.baik.count} Siswa ({analytics.distribution.baik.percentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.distribution.baik.percentage}%` }}
                  />
                </div>
              </div>

              {/* Cukup */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-800">Cukup (60 - 74)</span>
                  <span className="text-amber-600">
                    {analytics.distribution.cukup.count} Siswa ({analytics.distribution.cukup.percentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.distribution.cukup.percentage}%` }}
                  />
                </div>
              </div>

              {/* Kurang */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-800">Perlu Bimbingan (&lt; 60)</span>
                  <span className="text-rose-600">
                    {analytics.distribution.kurang.count} Siswa ({analytics.distribution.kurang.percentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.distribution.kurang.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan Ketuntasan KKM & Rekomendasi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Analisis Ketuntasan Belajar & KKM</span>
            </h3>
            <p className="text-xs text-slate-500">
              Evaluasi standar ketuntasan minimal kejuruan SMKN 1 Songgom (KKM = 75.0).
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Persentase Ketuntasan</span>
                <span className="text-lg font-black text-slate-900">{analytics.passingRate}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${analytics.passingRate}%` }}
                />
                <div
                  className="bg-rose-400 h-full"
                  style={{ width: `${100 - analytics.passingRate}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-emerald-700">{analytics.passedCount} Siswa Tuntas</span>
                <span className="text-rose-700">{analytics.failedCount} Siswa Remedial</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs text-blue-900 space-y-1">
              <span className="font-bold block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Rekomendasi Tindak Lanjut Akademik:
              </span>
              <p className="text-[11.5px] leading-relaxed text-blue-800">
                {analytics.passingRate >= 80
                  ? 'Tingkat ketuntasan klasikal sangat baik (≥ 80%). Materi pengayaan siap dijadwalkan untuk siswa berkategori Sangat Baik.'
                  : 'Tingkat ketuntasan berada di bawah 80%. Disarankan melaksanakan pembelajaran remedial terstruktur sebelum ujian susulan.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL HASIL MODAL (StudentResultDetailModal) */}
      {isDetailModalOpen && selectedAttempt && (
        <StudentResultDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          attempt={selectedAttempt}
          studentName={
            students.find((s) => s.id === selectedAttempt.student_id)?.full_name ||
            (students.find((s) => s.id === selectedAttempt.student_id) as any)?.name ||
            'Siswa'
          }
          studentNisn={
            students.find((s) => s.id === selectedAttempt.student_id)?.nisn
          }
          studentClass={
            classes.find(
              (c) =>
                c.id ===
                students.find((s) => s.id === selectedAttempt.student_id)?.class_id
            )?.name
          }
          examTitle={
            exams.find((e) => e.id === selectedAttempt.exam_id)?.title || 'Ujian'
          }
          canGradeEssay={true}
        />
      )}

      {/* ESSAY GRADING MODAL */}
      {isEssayModalOpen && selectedEssayAttempt && selectedEssayDetail && (
        <EssayGradingModal
          isOpen={isEssayModalOpen}
          onClose={() => {
            setIsEssayModalOpen(false);
            setSelectedEssayAttempt(null);
            setSelectedEssayDetail(null);
          }}
          attempt={selectedEssayAttempt}
          detail={selectedEssayDetail}
          studentName={
            students.find((s) => s.id === selectedEssayAttempt.student_id)?.full_name ||
            (students.find((s) => s.id === selectedEssayAttempt.student_id) as any)?.name ||
            'Siswa'
          }
          studentNisn={
            students.find((s) => s.id === selectedEssayAttempt.student_id)?.nisn
          }
          studentClass={
            classes.find(
              (c) =>
                c.id ===
                students.find((s) => s.id === selectedEssayAttempt.student_id)?.class_id
            )?.name
          }
          examTitle={
            exams.find((e) => e.id === selectedEssayAttempt.exam_id)?.title || 'Ujian'
          }
          onGradedSuccess={() => {
            triggerToast('Nilai esai berhasil disimpan dan nilai rapor siswa telah diperbarui.');
          }}
        />
      )}
    </div>
  );
};
