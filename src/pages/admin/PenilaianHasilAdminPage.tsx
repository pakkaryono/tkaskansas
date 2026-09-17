import React, { useState, useMemo } from 'react';
import {
  Award,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  AlertTriangle,
  History,
  ShieldCheck,
  GraduationCap,
  Users,
} from 'lucide-react';
import { useExam } from '../../contexts/ExamContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { ExamAttempt, Exam, QuestionResultDetail } from '../../types';
import { GradeCategorySettingsModal } from '../../components/grading/GradeCategorySettingsModal';
import { RegradeModal } from '../../components/grading/RegradeModal';
import { StudentResultDetailModal } from '../../components/grading/StudentResultDetailModal';
import { EssayGradingModal } from '../../components/grading/EssayGradingModal';
import { GradingTestSuite } from '../../components/grading/GradingTestSuite';

export const PenilaianHasilAdminPage: React.FC = () => {
  const { exams, examAttempts, examQuestions, getAttemptResultSummary } = useExam();
  const { students, classes, subjects } = useMasterData();

  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<'peserta' | 'antrean_esai' | 'regrade_history' | 'testing'>('peserta');

  // Filter state
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isRegradeModalOpen, setIsRegradeModalOpen] = useState(false);
  const [selectedRegradeExam, setSelectedRegradeExam] = useState<Exam | null>(null);

  // Result Detail Modal State
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Quick Essay Modal State
  const [selectedEssayAttempt, setSelectedEssayAttempt] = useState<ExamAttempt | null>(null);
  const [selectedEssayDetail, setSelectedEssayDetail] = useState<QuestionResultDetail | null>(null);
  const [isEssayModalOpen, setIsEssayModalOpen] = useState(false);

  // Success Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Only include completed attempts for grading
  const completedAttempts = useMemo(() => {
    return examAttempts.filter((a) => a.status === 'submitted' || a.status === 'expired');
  }, [examAttempts]);

  // Filtered attempts
  const filteredAttempts = useMemo(() => {
    return completedAttempts.filter((att) => {
      if (selectedExamId !== 'all' && att.exam_id !== selectedExamId) return false;

      const student = students.find((s) => s.id === att.student_id);
      if (selectedClassId !== 'all' && student?.class_id !== selectedClassId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const studentName = (student?.full_name || (student as any)?.name || '').toLowerCase();
        const nisn = student?.nisn?.toLowerCase() || '';
        const exam = exams.find((e) => e.id === att.exam_id);
        const examTitle = exam?.title?.toLowerCase() || '';
        if (!studentName.includes(q) && !nisn.includes(q) && !examTitle.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [completedAttempts, selectedExamId, selectedClassId, searchQuery, students, exams]);

  // Global Statistics
  const stats = useMemo(() => {
    const total = filteredAttempts.length;
    if (total === 0) {
      return { total: 0, avgScore: 0, passRate: 0, pendingEssays: 0 };
    }

    let totalScoreSum = 0;
    let passedCount = 0;
    let pendingCount = 0;

    filteredAttempts.forEach((att) => {
      const summary = getAttemptResultSummary(att.id);
      const score = summary ? summary.nilai : att.score || 0;
      totalScoreSum += score;
      if (score >= 75) passedCount++;
      if (summary && summary.pending_essay > 0) {
        pendingCount += summary.pending_essay;
      }
    });

    const avgScore = Math.round((totalScoreSum / total) * 10) / 10;
    const passRate = Math.round((passedCount / total) * 100);

    return { total, avgScore, passRate, pendingEssays: pendingCount };
  }, [filteredAttempts, getAttemptResultSummary]);

  // Antrean Esai yang Menunggu Penilaian
  const pendingEssayQueue = useMemo(() => {
    const queue: Array<{
      attempt: ExamAttempt;
      detail: QuestionResultDetail;
      studentName: string;
      studentNisn?: string;
      studentClass?: string;
      examTitle: string;
    }> = [];

    completedAttempts.forEach((att) => {
      const summary = getAttemptResultSummary(att.id);
      if (!summary || summary.pending_essay === 0) return;

      const student = students.find((s) => s.id === att.student_id);
      const exam = exams.find((e) => e.id === att.exam_id);

      summary.question_details.forEach((qd) => {
        if (qd.question_type === 'essay' && qd.status === 'pending_grading') {
          queue.push({
            attempt: att,
            detail: qd,
            studentName: student?.full_name || (student as any)?.name || 'Siswa',
            studentNisn: student?.nisn,
            studentClass: classes.find((c) => c.id === student?.class_id)?.name,
            examTitle: exam?.title || 'Ujian',
          });
        }
      });
    });

    return queue;
  }, [completedAttempts, getAttemptResultSummary, students, exams, classes]);

  // Semua Histori Regrading
  const regradeHistories = useMemo(() => {
    const list: any[] = [];
    examAttempts.forEach((att) => {
      if (att.regrade_history && att.regrade_history.length > 0) {
        att.regrade_history.forEach((h) => {
          const student = students.find((s) => s.id === att.student_id);
          const exam = exams.find((e) => e.id === att.exam_id);
          list.push({
            ...h,
            studentName: student?.full_name || (student as any)?.name || 'Siswa',
            examTitle: exam?.title || 'Ujian',
          });
        });
      }
    });
    return list.sort((a, b) => new Date(b.regraded_at).getTime() - new Date(a.regraded_at).getTime());
  }, [examAttempts, students, exams]);

  const handleOpenDetail = (attempt: ExamAttempt) => {
    setSelectedAttempt(attempt);
    setIsDetailModalOpen(true);
  };

  const handleOpenRegradeForExam = () => {
    if (selectedExamId === 'all') {
      const firstWithCompleted = exams.find((e) => completedAttempts.some((a) => a.exam_id === e.id));
      setSelectedRegradeExam(firstWithCompleted || exams[0] || null);
    } else {
      setSelectedRegradeExam(exams.find((e) => e.id === selectedExamId) || null);
    }
    setIsRegradeModalOpen(true);
  };

  const handleExportLeger = () => {
    const csvRows: string[] = [];
    csvRows.push([
      'No',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Mata Pelajaran',
      'Judul Ujian',
      'Total Soal',
      'Benar',
      'Salah',
      'Kosong',
      'Skor Diperoleh',
      'Skor Maksimal',
      'Nilai (0-100)',
      'Predikat (Grade)',
      'Label Predikat',
      'Status Esai',
      'Waktu Selesai',
    ].join(','));

    filteredAttempts.forEach((att, idx) => {
      const summary = getAttemptResultSummary(att.id);
      const student = students.find((s) => s.id === att.student_id);
      const exam = exams.find((e) => e.id === att.exam_id);
      const subject = subjects.find((s) => s.id === exam?.subject_id);
      const studentClass = classes.find((c) => c.id === student?.class_id);

      csvRows.push([
        idx + 1,
        `"${student?.nisn || '-'}"`,
        `"${student?.full_name || (student as any)?.name || '-'}"`,
        `"${studentClass?.name || '-'}"`,
        `"${subject?.name || '-'}"`,
        `"${exam?.title || '-'}"`,
        summary?.jumlah_soal || 0,
        summary?.benar || 0,
        summary?.salah || 0,
        summary?.kosong || 0,
        summary?.skor || 0,
        summary?.maximum_score || 100,
        summary?.nilai || 0,
        `"${summary?.kategori_nilai?.grade_code || '-'}"`,
        `"${summary?.kategori_nilai?.label || '-'}"`,
        `"${(summary?.pending_essay || 0) > 0 ? 'Pending Esai' : 'Final'}"`,
        `"${att.end_time || '-'}"`,
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Leger_Nilai_CBT_SMKN1Songgom_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Leger nilai ujian berhasil diekspor ke CSV.');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Fase 6: Sistem Penilaian Terpadu
            </span>
            <span className="text-xs text-slate-400 font-medium">•</span>
            <span className="text-xs text-slate-500 font-medium">SMKN 1 Songgom</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Pusat Penilaian & Hasil Ujian (Grading Hub)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen penilaian PG Biasa, PG Kompleks, Menjodohkan, Koreksi Esai Manual, dan Audit Regrading.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="open-grade-settings-btn"
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Kategori Predikat</span>
          </button>

          <button
            id="open-regrade-btn"
            onClick={handleOpenRegradeForExam}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 text-slate-700 hover:text-amber-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <RefreshCw className="w-4 h-4 text-amber-600" />
            <span>Regrading Ujian</span>
          </button>

          <button
            id="export-leger-btn"
            onClick={handleExportLeger}
            disabled={filteredAttempts.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Leger CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Peserta Selesai
            </span>
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Rata-Rata Nilai
            </span>
            <span className="text-2xl font-black text-slate-900">{stats.avgScore}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Kelulusan (KKM 75)
            </span>
            <span className="text-2xl font-black text-indigo-600">{stats.passRate}%</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Antrean Esai Pending
            </span>
            <span className="text-2xl font-black text-purple-600">{stats.pendingEssays}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 pt-4 flex items-center gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('peserta')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'peserta'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Hasil Ujian Peserta ({filteredAttempts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('antrean_esai')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'antrean_esai'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Antrean Koreksi Esai</span>
            {pendingEssayQueue.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700">
                {pendingEssayQueue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('regrade_history')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'regrade_history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit & Histori Regrade ({regradeHistories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('testing')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'testing'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Uji Validasi Formula (Test Suite)</span>
          </button>
        </div>

        {/* TAB 1: Hasil Ujian Peserta */}
        {activeTab === 'peserta' && (
          <div className="p-6 space-y-4">
            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa, NISN, atau judul ujian..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Semua Ujian</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Semua Rombel / Kelas</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Siswa & Rombel</th>
                    <th className="px-4 py-3">Ujian</th>
                    <th className="px-4 py-3 text-center">B / S / K</th>
                    <th className="px-4 py-3 text-center">Skor Poin</th>
                    <th className="px-4 py-3 text-center">Nilai (0-100)</th>
                    <th className="px-4 py-3 text-center">Predikat</th>
                    <th className="px-4 py-3 text-center">Status Koreksi</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                        Tidak ada lembar ujian siswa yang memenuhi filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAttempts.map((att) => {
                      const summary = getAttemptResultSummary(att.id);
                      const student = students.find((s) => s.id === att.student_id);
                      const exam = exams.find((e) => e.id === att.exam_id);
                      const studentClass = classes.find((c) => c.id === student?.class_id);

                      return (
                        <tr key={att.id} className="hover:bg-slate-50/60 transition">
                          {/* Siswa */}
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">
                              {student?.full_name || (student as any)?.name || 'Siswa'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              NISN: {student?.nisn || '-'} • {studentClass?.name || '-'}
                            </p>
                          </td>

                          {/* Ujian */}
                          <td className="px-4 py-3 max-w-xs">
                            <p className="font-semibold text-slate-800 line-clamp-1">
                              {exam?.title || 'Ujian'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Durasi: {summary?.durasi_pengerjaan || '-'}
                            </p>
                          </td>

                          {/* B / S / K */}
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-emerald-600">
                              {summary?.benar ?? '-'}
                            </span>{' '}
                            /{' '}
                            <span className="font-semibold text-rose-600">
                              {summary?.salah ?? '-'}
                            </span>{' '}
                            /{' '}
                            <span className="font-semibold text-amber-600">
                              {summary?.kosong ?? '-'}
                            </span>
                          </td>

                          {/* Skor */}
                          <td className="px-4 py-3 text-center font-semibold text-slate-700">
                            {summary?.skor ?? 0} / {summary?.maximum_score ?? 100}
                          </td>

                          {/* Nilai */}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`text-sm font-black ${
                                (summary?.nilai || 0) >= 75 ? 'text-indigo-600' : 'text-rose-600'
                              }`}
                            >
                              {summary?.nilai ?? 0}
                            </span>
                          </td>

                          {/* Predikat */}
                          <td className="px-4 py-3 text-center">
                            {summary?.kategori_nilai ? (
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  summary.kategori_nilai.color || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {summary.kategori_nilai.grade_code} • {summary.kategori_nilai.label}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* Status Koreksi Esai */}
                          <td className="px-4 py-3 text-center">
                            {(summary?.pending_essay || 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 animate-pulse">
                                <Clock className="w-3 h-3" /> {summary?.pending_essay} Esai Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" /> Nilai Final
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleOpenDetail(att)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Lembar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Antrean Koreksi Esai */}
        {activeTab === 'antrean_esai' && (
          <div className="p-6 space-y-4">
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 flex items-start gap-3">
              <Clock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">Mekanisme Penilaian Manual Esai:</p>
                <p className="text-purple-800 text-[11px] leading-relaxed">
                  Soal esai berstatus <code>pending_grading</code> setelah siswa mengumpulkan ujian. Guru/Admin
                  dapat mengoreksi jawaban esai di bawah ini dengan memasukkan poin, komentar, dan nama penilai. Nilai
                  akhir dan predikat siswa akan otomatis terhitung kembali seketika.
                </p>
              </div>
            </div>

            {pendingEssayQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">Semua Jawaban Esai Telah Selesai Dikoreksi!</p>
                <p className="text-xs text-slate-400">Tidak ada antrean jawaban esai yang pending saat ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingEssayQueue.map((item, idx) => (
                  <div
                    key={`${item.attempt.id}-${item.detail.question_id}`}
                    className="border border-purple-200 rounded-2xl p-5 bg-white hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{item.studentName}</h4>
                        <p className="text-[11px] text-slate-400">
                          {item.studentClass || '-'} • NISN: {item.studentNisn || '-'}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        Bobot: {item.detail.max_points} Poin
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Soal #{item.detail.order_num}:
                      </span>
                      <p className="text-slate-800 text-xs line-clamp-2">{item.detail.question_text}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 font-mono text-[11px] line-clamp-3">
                      {item.detail.student_answer || '(Siswa tidak menjawab)'}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 font-medium line-clamp-1 max-w-[200px]">
                        {item.examTitle}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedEssayAttempt(item.attempt);
                          setSelectedEssayDetail(item.detail);
                          setIsEssayModalOpen(true);
                        }}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Koreksi Sekarang</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Audit & Histori Regrade */}
        {activeTab === 'regrade_history' && (
          <div className="p-6 space-y-4">
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">Audit Trail Rekam Jejak Regrading (Immutable History):</p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Setiap kali admin atau guru menjalankan evaluasi ulang / anulir butir soal, sistem menyimpan
                  selisih nilai sebelum dan sesudah regrading beserta identitas penanggung jawab untuk transparansi
                  akademik.
                </p>
              </div>
            </div>

            {regradeHistories.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-1">
                <History className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">Belum Ada Riwayat Regrading</p>
                <p className="text-xs text-slate-400">
                  Riwayat perubahan nilai akan tercatat otomatis saat regrading dieksekusi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Waktu & Versi</th>
                      <th className="px-4 py-3">Peserta & Ujian</th>
                      <th className="px-4 py-3">Alasan Regrade</th>
                      <th className="px-4 py-3 text-center">Nilai Sebelumnya</th>
                      <th className="px-4 py-3 text-center">Nilai Baru</th>
                      <th className="px-4 py-3">Operator / Penilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regradeHistories.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 block">Versi #{h.version}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(h.regraded_at).toLocaleString('id-ID')}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{h.studentName}</p>
                          <p className="text-[11px] text-slate-400">{h.examTitle}</p>
                        </td>

                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-semibold text-amber-800">{h.reason}</p>
                          {h.notes && (
                            <p className="text-[10.5px] text-slate-500 italic mt-0.5">"{h.notes}"</p>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-slate-500">
                          {h.previous_score}
                        </td>

                        <td className="px-4 py-3 text-center font-black text-emerald-600">
                          {h.new_score}
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-700">
                          {h.regraded_by}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Automated Test Suite */}
        {activeTab === 'testing' && (
          <div className="p-6">
            <GradingTestSuite />
          </div>
        )}
      </div>

      {/* Grade Category Settings Modal */}
      {isCategoryModalOpen && (
        <GradeCategorySettingsModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
        />
      )}

      {/* Regrade Modal */}
      {isRegradeModalOpen && (
        <RegradeModal
          isOpen={isRegradeModalOpen}
          onClose={() => setIsRegradeModalOpen(false)}
          exam={selectedRegradeExam}
          onRegradedSuccess={(count) => {
            showToast(`Regrading sukses diterapkan pada ${count} lembar ujian peserta.`);
          }}
        />
      )}

      {/* Student Result Detail Modal */}
      {isDetailModalOpen && selectedAttempt && (
        <StudentResultDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          attempt={selectedAttempt}
          studentName={
            students.find((s) => s.id === selectedAttempt.student_id)?.full_name || 'Siswa'
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

      {/* Quick Essay Modal from Queue */}
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
            students.find((s) => s.id === selectedEssayAttempt.student_id)?.full_name || 'Siswa'
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
            showToast('Nilai esai berhasil disimpan dan nilai rapor siswa telah diperbarui.');
          }}
        />
      )}
    </div>
  );
};
